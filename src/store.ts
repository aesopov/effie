import { useRef, useSyncExternalStore } from "react";
import { from } from "./from";
import reconciler from "./reconciler";
import { InferStateType, State, Store } from "./types";
import { StoreProvider } from "./StoreProvider";
import { ContextProvider } from "./createContextProvider";

/**
 * Holds the latest committed state snapshot and the subscriber set.
 *
 * This is the reconciler's "container" — the root node of Effie's headless
 * React tree. Every time the reconciler finishes a render cycle it calls
 * `setState`, which bumps `version` and notifies all subscribers. The version
 * counter lets `useSelector` skip re-running the selector when the snapshot
 * hasn't changed (see the memoisation in `store.useSelector` below).
 */
class Container {
  version = 0;
  state: unknown;
  private subscribers = new Set<() => void>();

  setState = (newState: unknown) => {
    this.version++;
    this.state = newState;
    this.subscribers.forEach((s) => s());
  };

  subscribe = (onStateChange: () => void) => {
    this.subscribers.add(onStateChange);
    return () => {
      this.subscribers.delete(onStateChange);
    };
  };
}

/**
 * Create an Effie store.
 *
 * Effie runs a headless React reconciler (no DOM). The `stateFunction` is
 * treated as the root "component" of that hidden React tree. React manages all
 * hook state (useState, useEffect, useMemo, …) inside it exactly as it would
 * for a visible component. Whenever a hook triggers a re-render the reconciler
 * rebuilds the state object tree and publishes the new snapshot via
 * `Container.setState`.
 *
 * If your state functions need access to a React context (e.g. a theme or an
 * i18n provider), pass a `contextProvider` created with `createContextProvider`.
 * It wraps the root element so the context is available inside the reconciler
 * tree.
 *
 * @param stateFunction A function that returns root state.
 * @param contextProvider Optional React context wrapper for the reconciler tree.
 * @returns Effie store.
 */
export function createStore<TState extends State<any>>(
  stateFunction: () => TState,
  contextProvider?: ContextProvider
): Store<TState> {
  const root = new Container();

  // Register `root` as the reconciler's host container. After each commit
  // `replaceContainerChildren` (in reconciler.ts) will call `root.setState`
  // with the freshly built state object.
  const container = reconciler.createContainer(
    root,
    0,    // LegacyRoot tag — Effie doesn't need concurrent features
    null, // no hydration callbacks
    false, false, "",
    () => {}, () => {}, () => {}, () => {} // error / indicator callbacks (unused)
  );

  // Kick off the first render. `from(stateFunction)` converts the root state
  // function into a React element that the reconciler can render.
  if (contextProvider) {
    reconciler.updateContainer(
      contextProvider([from(stateFunction)]),
      container
    );
  } else {
    reconciler.updateContainer(from(stateFunction), container);
  }

  const store: Store<TState> = {
    getState(): InferStateType<TState> {
      return root.state as InferStateType<TState>;
    },

    /**
     * Subscribe a React component to a slice of the store state.
     *
     * Uses `useSyncExternalStore` so React can safely read the snapshot during
     * concurrent rendering.
     *
     * The version-based memoisation via `useRef` avoids re-running the selector
     * on every component render when the store hasn't changed. Using plain `let`
     * variables in the method body would reset them to 0 on each render call,
     * making the cache ineffective. `useRef` persists the cached version and
     * selection across renders for the lifetime of the component instance.
     */
    useSelector<O>(selector: (state: InferStateType<TState>) => O): O {
      const cache = useRef<{ version: number; selection: O } | null>(null);
      return useSyncExternalStore(root.subscribe, () => {
        if (cache.current !== null && cache.current.version === root.version) {
          return cache.current.selection;
        }
        const selection = selector(root.state as InferStateType<TState>);
        cache.current = { version: root.version, selection };
        return selection;
      });
    },
    Provider(props) {
      return StoreProvider({
        store,
        children: props.children,
      });
    },
  };

  return store;
}
