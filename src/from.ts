import { ReactElement, createElement, Key } from "react";
import { collectChildren } from "./iterator";
import { State } from "./types";

export function from<TStateFunction extends (props?: any) => State<TState>, TState = any>(
  fn: TStateFunction,
  props?: (Parameters<TStateFunction>[0] extends undefined ? object : Parameters<TStateFunction>[0]) & {
    key?: Key;
  }
): ReturnType<TStateFunction> {
  const { ref, ...rest } = (props ?? {}) as Record<string, unknown>;
  const propsNoRef = { ...rest, key: (rest.key as Key) ?? fn.name };
  const el = createElement(() => {
    const result = fn(props);
    const children: ReactElement[] = [];
    collectChildren(result, children);
    return createElement(
      fn.name,
      {
        state: result,
        ref: ref as React.Ref<unknown>,
      },
      children
    );
  }, propsNoRef);
  (el.type as { displayName?: string }).displayName = fn.name;
  return el as ReturnType<TStateFunction>;
}
