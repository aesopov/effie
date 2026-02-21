import { useSyncExternalStore } from "react";
import { from } from "./from";
import reconciler from "./reconciler";
import { InferStateType, State, Store } from "./types";
import { StoreProvider } from "./StoreProvider";
import { ContextProvider } from "./createContextProvider";

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
 * @param stateFunction A function that returns root state.
 * @returns Effie store.
 */
export function createStore<TState extends State<any>>(
  stateFunction: () => TState,
  contextProvider?: ContextProvider
): Store<TState> {
  const root = new Container();
  const container = reconciler.createContainer(
    root,
    0,
    null,
    false,
    false,
    "",
    () => {},
    null
  );

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
    useSelector<O>(selector: (state: InferStateType<TState>) => O): O {
      let prevStateVersion = 0;
      let prevSelection: O;
      return useSyncExternalStore(root.subscribe, () => {
        if (root.version === prevStateVersion) {
          return prevSelection;
        }
        const selection = selector(root.state as InferStateType<TState>);
        prevStateVersion = root.version;
        prevSelection = selection;
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
