import { ReactElement } from "react";
import { isElement } from "react-is";

export function clone(obj: any): any {
  if (obj === null || typeof obj !== "object") return obj;

  let temp: any;
  if (obj instanceof Date) {
    temp = new Date(obj);
  } else {
    temp = Array.isArray(obj) ? [] : {};
  }

  for (var key in obj) {
    const val = obj[key];
    if (isElement(val)) {
      temp[key] = val;
    } else {
      temp[key] = clone(val);
    }
  }
  return temp;
}

function isObject(obj: unknown): obj is Record<string, unknown> {
  return typeof obj === "object" && obj != null;
}

function* fillerIterator(state: unknown, setter: (val: any) => void): Generator {
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
    const entries = Object.entries(state);
    for (const [k] of entries) {
      yield* fillerIterator(state[k], (val) => {
        state[k] = val;
      });
    }
  }
}

export function stateFiller(state: unknown) {
  const iter = fillerIterator(state, () => {});
  return (value: unknown) => {
    const x = iter.next();
    x.value?.(value);
  };
}

export function collectChildren(state: unknown, children: ReactElement[]) {
  if (isElement(state)) {
    children.push(state);
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
