import { ReactElement } from "react";
import { isElement } from "react-is";

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

export function stateFiller(state: unknown): Setter {
  const iter = fillerIterator(state, () => {});
  return (value: unknown) => {
    const x = iter.next();
    if (!x.done) {
      x.value(value);
    }
  };
}

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
