/**
 * Effie's headless React reconciler.
 *
 * Effie uses React's reconciler (react-reconciler) as an execution engine for
 * running hooks outside of the DOM. The reconciler operates in **persistence
 * mode** (not mutation mode): instead of mutating existing host instances, it
 * produces a fresh immutable snapshot on every commit. This maps cleanly to
 * Effie's model of publishing a new state POJO to subscribers each time
 * something changes.
 *
 * ## How a commit works
 *
 * 1. A state function's hook fires (e.g. a `useState` setter is called).
 * 2. React schedules a re-render of that "component" inside the hidden tree.
 * 3. The reconciler calls `cloneInstance` for the affected node and all its
 *    ancestors. Each clone calls `createInstanceFromProps`, which:
 *      a. Deep-clones the raw state object returned by the state function
 *         (leaving `ReactElement` placeholders intact).
 *      b. Attaches a `stateFiller` iterator and records how many children to
 *         expect (= number of nested `from()` calls).
 * 4. As child clones finish, `appendInitialChild` is called on the parent.
 *    Each call advances the `stateFiller` iterator one step, replacing the
 *    next `ReactElement` placeholder in the clone with the resolved child state.
 * 5. When all children are slotted in, the internal `[$]` bookkeeping is
 *    deleted, leaving a clean POJO.
 * 6. `replaceContainerChildren` is called with the root child set, which calls
 *    `Container.setState` to publish the new snapshot and notify subscribers.
 */
import reconciler from "react-reconciler";
import { DefaultEventPriority } from "react-reconciler/constants";
import { createContext } from "react";
import { $ } from "./consts";
import { clone, stateFiller } from "./iterator";

type Setter = (val: unknown) => void;

/**
 * Internal bookkeeping attached to each instance while it is being assembled.
 * Deleted once all children have been filled (see `appendInitialChild`).
 *
 * - `filler`: advances the `stateFiller` iterator for this node.
 * - `total`: number of child `from()` elements expected.
 * - `filled`: number received so far.
 */
type SInfo = {
  filler?: Setter;
  total?: number;
  filled?: number;
};

type EffieType = string;
type EffieProps = { children: unknown[]; state: unknown };
type EffieContainer = {
  setState(newState: unknown): void;
  state: unknown;
};
type EffieInstance = { [$]?: SInfo };
type EffieTextInstance = null;
type EffieSuspenseInstance = never;
type EffieHydrableInstance = never;
type EffiePublicInstance = EffieInstance;
type EffieHostContext = Record<string, never>;
type EffieChildSet = { newState?: unknown };
type EffieTransitionStatus = null;

// Placeholder context for the React 19 transition API (unused by Effie).
// Cast needed because ReactContext in react-reconciler exposes internal fields
// (_currentValue, _threadCount, etc.) that React's public Context type omits.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const noopTransitionContext = createContext<EffieTransitionStatus>(null) as any;

/**
 * Create a new instance for a state function node.
 *
 * `props.state` is the raw object returned by the state function. We clone it
 * so each commit gets an independent snapshot, then attach `[$]` metadata so
 * `appendInitialChild` knows how to slot child states into the right positions.
 *
 * `props.children` is the array of resolved child elements. Its length tells
 * us how many `appendInitialChild` calls to expect before the instance is
 * fully assembled.
 */
function createInstanceFromProps(props: EffieProps): EffieInstance {
  const result = clone(props.state) as EffieInstance;

  result[$] = {
    filler: stateFiller(result),
    total: (props.children as unknown[]).length,
    filled: 0,
  };

  return result;
}

const effieReconciler = reconciler<
  EffieType,
  EffieProps,
  EffieContainer,
  EffieInstance,
  EffieTextInstance,
  EffieSuspenseInstance,
  EffieHydrableInstance,
  never /* FormInstance — Effie does not use React forms */,
  EffiePublicInstance,
  EffieHostContext,
  EffieChildSet,
  number /* TimeoutHandle */,
  -1 /* NoTimeout */,
  EffieTransitionStatus
>({
  isPrimaryRenderer: false,
  supportsHydration: false,
  supportsMutation: false,
  supportsPersistence: true,
  supportsMicrotasks: true,

  scheduleTimeout: globalThis.setTimeout,
  cancelTimeout: globalThis.clearTimeout,
  scheduleMicrotask: globalThis.queueMicrotask,
  noTimeout: -1,

  // React 19 priority / scheduling API
  getCurrentUpdatePriority: () => DefaultEventPriority,
  setCurrentUpdatePriority() {},
  resolveUpdatePriority: () => DefaultEventPriority,

  // React 19 transition API (Effie does not use transitions)
  NotPendingTransition: null,
  HostTransitionContext: noopTransitionContext,

  // React 19 form API (Effie does not use forms)
  resetFormInstance() {},

  // React 19 commit suspension API (Effie never suspends commits)
  maySuspendCommit: () => false,
  preloadInstance: () => true,
  startSuspendingCommit() {},
  suspendInstance() {},
  waitForCommitToBeReady: () => null,

  // React 19 misc new APIs
  requestPostPaintCallback() {},
  shouldAttemptEagerTransition: () => false,
  trackSchedulerEvent() {},
  resolveEventType: () => null,
  resolveEventTimeStamp: () => 0,

  getInstanceFromNode: () => null,
  beforeActiveInstanceBlur() {},
  afterActiveInstanceBlur() {},
  prepareScopeUpdate() {},
  getInstanceFromScope: () => null,
  detachDeletedInstance() {},

  // -------------------
  //    Core Methods
  // -------------------

  createInstance(_type, props) {
    return createInstanceFromProps(props);
  },

  createTextInstance() {
    return null;
  },

  /**
   * Called once per child after that child's subtree has been fully committed.
   *
   * Each call advances the parent's `stateFiller` by one step, writing the
   * resolved child state object into the slot that held its `ReactElement`
   * placeholder. Once `filled === total` all placeholders have been replaced
   * and the `[$]` metadata can be removed.
   */
  appendInitialChild(parentInstance, child) {
    if (parentInstance[$]) {
      parentInstance[$].filler?.(child);
      parentInstance[$].filled = (parentInstance[$].filled ?? 0) + 1;
      if (parentInstance[$].filled === parentInstance[$].total) {
        delete parentInstance[$];
      }
    }
  },

  finalizeInitialChildren(instance) {
    if (instance[$] && instance[$].filled === instance[$].total) {
      delete instance[$];
    }
    return false;
  },

  shouldSetTextContent: () => false,

  getRootHostContext: () => ({} as EffieHostContext),

  getChildHostContext: (parentHostContext) => parentHostContext,

  getPublicInstance: (instance) => instance!,

  prepareForCommit: () => null,

  resetAfterCommit() {},

  preparePortalMount() {},

  // -------------------
  // Persistence Methods
  // -------------------

  /**
   * Called when a node needs to be updated (e.g. a parent re-rendered because
   * a sibling's hook fired). We always create a fresh instance from the new
   * props — the old instance is discarded. This ensures every commit produces
   * an independent, immutable snapshot.
   */
  cloneInstance(_instance, _type, _oldProps, newProps) {
    return createInstanceFromProps(newProps);
  },

  createContainerChildSet() {
    return {};
  },

  /** Store the root child (the single top-level state object) in the child set. */
  appendChildToContainerChildSet(childSet, child) {
    childSet.newState = child;
  },

  finalizeContainerChildren() {},

  /**
   * Final step of a commit: publish the new state snapshot to all subscribers.
   * `newChildren.newState` is the fully assembled root state POJO.
   */
  replaceContainerChildren(container, newChildren) {
    container.setState(newChildren.newState);
  },

  cloneHiddenInstance(instance) {
    return instance;
  },

  cloneHiddenTextInstance() {
    return null;
  },
});

effieReconciler.injectIntoDevTools({
  bundleType: 0,
  version: '0.0.8',
  rendererPackageName: 'effie',
});

export default effieReconciler;
