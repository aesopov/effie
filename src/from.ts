import { ReactElement, createElement, Key } from "react";
import { collectChildren } from "./iterator";
import { State } from "./types";

/**
 * Convert a state function into a React element that Effie's reconciler can render.
 *
 * This is the bridge between user-land state functions and the headless React
 * tree. It does three things:
 *
 * 1. **Outer wrapper element** — a function component keyed by `fn.name` (or an
 *    explicit `key` from props). React uses this key to reconcile sub-states
 *    across re-renders, preserving hook state when array positions shift.
 *
 * 2. **Call the state function** — inside the wrapper's render, `fn(props)` runs
 *    with full hook support. Its return value is the state object for this node.
 *
 * 3. **Collect children** — `collectChildren` walks the returned state object and
 *    pulls out any nested `from()` elements (i.e. `ReactElement` values). Those
 *    become the children of the inner host element so the reconciler processes
 *    them as a tree. The reconciler then stitches the resolved child states back
 *    into the parent object via `stateFiller` (see reconciler.ts / iterator.ts).
 *
 * The `ref` prop (if provided) is forwarded to the inner host element rather than
 * the outer wrapper, keeping it transparent to the reconciler's key-based diffing.
 *
 * The return type is intentionally typed as `ReturnType<TStateFunction>` — a
 * `State<T>` — so callers can nest `from()` calls inside `state({})` objects
 * while preserving full TypeScript inference all the way to `getState()`.
 */
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

    if (process.env.NODE_ENV !== "production") {
      // Two sibling `from(sameFunction)` calls without an explicit `key` prop
      // both get `fn.name` as their key. React reconciles them as the same
      // component, causing incorrect hook state to be shared or swapped.
      // Force the user to provide explicit keys in this case.
      const seen = new Set<React.Key>();
      for (const child of children) {
        if (child.key != null) {
          if (seen.has(child.key)) {
            console.error(
              `[Effie] Duplicate key "${child.key}" among children of "${fn.name}". ` +
              `Pass a unique \`key\` prop to each \`from()\` call when the same function appears as multiple siblings.`
            );
            break;
          }
          seen.add(child.key);
        }
      }
    }

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
