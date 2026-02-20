import { Attributes, ReactElement, RefAttributes, createElement } from "react";
import { $stateType } from "./consts";
import { collectChildren } from "./iterator";
import { State } from "./types";

let keyCounter = 0;
/* @internal */
export function resetKeyCounter() {
  keyCounter = 0;
}

interface StateFunction<P = {}, S = any> {
  (props: P): State<S>;
};

export function from<TStateFunction extends (props?: any) => State<TState>, TState = any>(
  fn: TStateFunction,
  props?: Parameters<TStateFunction>[0] & {
    key?: any;
    ref?: React.Ref<ReturnType<TStateFunction>[typeof $stateType]>;
  }
): ReturnType<TStateFunction> {
// export function from<P extends {}, S = any>(
//   fn: StateFunction<P>,
//   props?: (RefAttributes<S> & P)
// ): ReturnType<typeof fn> {
  const propsNoRef = { ...props, key: props?.key ?? keyCounter++ };
  delete (propsNoRef as any).ref;
  const el = createElement(() => {
    const result = fn(props);
    const children: ReactElement[] = [];
    collectChildren(result, children);
    return createElement(
      fn.name,
      {
        state: result,
        ref: props?.ref,
      },
      children
    );
  }, propsNoRef);
  el.type.displayName = fn.name;
  return el as any;
}
