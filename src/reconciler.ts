import reconciler from "react-reconciler";
import { DefaultEventPriority } from "react-reconciler/constants";
import { $ } from "./consts";
import { clone, stateFiller } from "./iterator";

type Setter = (val: unknown) => void;

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
type EffieUpdatePayload = true;
type EffieChildSet = { newState?: unknown };

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
  EffiePublicInstance,
  EffieHostContext,
  EffieUpdatePayload,
  EffieChildSet,
  number /* TimeoutHandle */,
  -1 /* NoTimeout */
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

  getCurrentEventPriority: () => DefaultEventPriority,
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

  prepareUpdate() {
    return true;
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

  cloneInstance(_instance, _updatePayload, _type, _oldProps, newProps) {
    return createInstanceFromProps(newProps);
  },
  createContainerChildSet() {
    return {};
  },
  appendChildToContainerChildSet(childSet, child) {
    childSet.newState = child;
  },
  finalizeContainerChildren() {},
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
  version: '0.0.7',
  rendererPackageName: 'effie',
});

export default effieReconciler;
