import { ReactElement } from "react";
import { isElement } from "react-is";

/**
 * Deep-clone a state object, leaving `ReactElement` values in place.
 *
 * ReactElements are the `from()` placeholders embedded in a state object. They
 * must not be cloned — they are keyed React elements that the reconciler uses
 * for diffing. Everything else (plain objects, arrays, Dates, primitives) is
 * cloned so that mutations to the new instance don't affect the previous
 * snapshot.
 */
export function clone<T>(obj: T): T {
  if (obj === null || typeof obj !== "object") return obj;

  let temp: Record<string, unknown> | unknown[];
  if (obj instanceof Date) {
    return new Date(obj as unknown as Date) as unknown as T;
  } else {
    temp = Array.isArray(obj) ? [] : {};
  }

  for (const key of Object.keys(obj)) {
    const val = (obj as Record<string, unknown>)[key];
    if (isElement(val)) {
      (temp as Record<string, unknown>)[key] = val;
    } else {
      (temp as Record<string, unknown>)[key] = clone(val);
    }
  }
  return temp as T;
}

function isObject(obj: unknown): obj is Record<string, unknown> {
  return typeof obj === "object" && obj != null;
}

type Setter = (val: unknown) => void;

/**
 * Walk the state object depth-first and yield a setter for every slot that
 * holds a `ReactElement` (i.e. a `from()` placeholder).
 *
 * The traversal order — objects by insertion order, arrays by index — must
 * match the order in which the reconciler calls `appendInitialChild`. React
 * commits children in the same depth-first, left-to-right order, so the
 * iterator and the reconciler always agree on which setter corresponds to which
 * resolved child state.
 */
function* fillerIterator(state: unknown, setter: Setter): Generator<Setter> {
  if (isElement(state)) {
    yield setter;
    return;
  }
  if (Array.isArray(state)) {
    for (let i = 0; i < state.length; i++) {
      yield* fillerIterator(state[i], (val) => {
        state[i] = val;
      });
    }
  } else if (isObject(state)) {
    for (const k of Object.keys(state)) {
      yield* fillerIterator(state[k], (val) => {
        state[k] = val;
      });
    }
  }
}

/**
 * Return a function that, when called once per child in depth-first order,
 * replaces each `ReactElement` placeholder in `state` with the resolved child
 * state object.
 *
 * The reconciler calls this once per `appendInitialChild` / `cloneInstance`
 * cycle. After all children have been filled the `[$]` bookkeeping is deleted,
 * leaving a clean POJO as the committed state.
 */
export function stateFiller(state: unknown): Setter {
  const iter = fillerIterator(state, () => {});
  return (value: unknown) => {
    const x = iter.next();
    if (!x.done) {
      x.value(value);
    }
  };
}

/**
 * Walk the state object and push every top-level `ReactElement` into `children`.
 *
 * This is called inside `from()` to collect the nested `from()` elements that
 * were embedded in the state object, so they can be passed as children to the
 * inner host element. The reconciler then renders those children and hands the
 * results back to the parent via `appendInitialChild`, which calls the
 * `stateFiller` to slot them into the right positions.
 */
export function collectChildren(state: unknown, children: ReactElement[]) {
  if (isElement(state)) {
    children.push(state as ReactElement);
    return;
  }

  if (!state) {
    return;
  }

  if (isObject(state))
    for (const v of Object.values(state)) {
      collectChildren(v, children);
    }
}
