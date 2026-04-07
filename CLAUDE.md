# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm build        # Build with Rollup (outputs dist/index.js ESM + dist/index.cjs CJS)
pnpm watch        # Build in watch mode
pnpm test         # Run tests with Vitest
pnpm typecheck    # Type-check without emitting
pnpm release      # Build + publish via changesets
```

Run a single test file:
```bash
pnpm vitest run src/__tests__/store.test.ts
```

Run tests matching a pattern:
```bash
pnpm vitest run -t "creates a store"
```

## Architecture

Effie targets **React 19** and peers on `react@^19`, `react-is@^19`, and `react-reconciler@^0.33`.

Effie is a React state management library that works by running a **custom React reconciler** (`react-reconciler`) outside of the DOM — think of it as a headless React renderer whose output is a plain JavaScript object tree instead of DOM nodes.

### How it works

1. **`createStore(stateFunction)`** (`src/store.ts`) — Creates a `Container` (holds state + subscriber set), then calls `reconciler.createContainer` with it. The `stateFunction` is wrapped in `from()` and passed to `reconciler.updateContainer`, which kicks off React rendering inside the custom renderer.

2. **`from(fn, props?)`** (`src/from.ts`) — The bridge between user-defined state functions and the reconciler. It wraps `fn` in a `createElement` call so React can render it. Inside that render, `fn` is called, its return value is inspected for nested `ReactElement`s (sub-states created via `from()`), and those are passed as `children` to the reconciler host element named after `fn.name`.

3. **`state(object)`** (`src/state.ts`) — A no-op cast that types the return value as `State<T>`, which is `React.ReactNode & { [$stateType]: T }`. This dual typing is what lets state functions compose: their return is both a React element tree (for the reconciler) and a typed state shape (for `getState()`/`useSelector`).

4. **`reconciler.ts`** — A persistence-mode reconciler (not mutation mode). On every update it calls `createInstanceFromProps` which deep-clones the state object (`clone()`) and attaches a `stateFiller` iterator. As child instances are appended, the filler replaces the `ReactElement` placeholders in the clone with the actual resolved child states. Once all children are filled, the internal `[$]` metadata is deleted and the result is a clean POJO. `replaceContainerChildren` commits the final state by calling `container.setState`.

   React 19 reconciler (v0.33) added many new required `HostConfig` fields versus v0.29: `getCurrentUpdatePriority`/`setCurrentUpdatePriority`/`resolveUpdatePriority` (replacing `getCurrentEventPriority`), the transition API (`NotPendingTransition`, `HostTransitionContext`), the form API (`resetFormInstance`), commit-suspension hooks (`maySuspendCommit`, `preloadInstance`, `startSuspendingCommit`, `suspendInstance`, `waitForCommitToBeReady`), and scheduler hooks (`requestPostPaintCallback`, `shouldAttemptEagerTransition`, `trackSchedulerEvent`, `resolveEventType`, `resolveEventTimeStamp`). Effie stubs all of them as no-ops since it doesn't use transitions, forms, or commit suspension. `prepareUpdate` was also removed entirely from v0.33. The reconciler type params changed from 13 to 14 — `FormInstance` (position 8) and `TransitionStatus` (position 14) were added, and `UpdatePayload` was removed as a generic param.

5. **`iterator.ts`** — Provides `clone` (deep clone, skipping ReactElements), `stateFiller` (generator-based slot filler that walks the object tree in the same order children are appended), and `collectChildren` (extracts nested `ReactElement`s for passing as reconciler children).

6. **`StoreProvider` / `useSelector`** (`src/StoreProvider.ts`, `src/useSelector.ts`) — Standard React context + `useSyncExternalStore` for subscribing components to store updates.

7. **`createContextProvider`** (`src/createContextProvider.ts`) — Allows wrapping the store's reconciler tree in a React context provider (e.g., to supply a theme or i18n context to state functions that call `useContext`).

### Key invariant

The order that `from()` calls appear in the object returned by `state()` must match the order that children are committed by the reconciler. `stateFiller` uses a generator that walks the object depth-first, left-to-right — the same order React commits children — so the slot-filling always lines up correctly.

### Publishing

Uses [Changesets](https://github.com/changesets/changesets). Add a changeset with `pnpm changeset`, then `pnpm release` to publish.
