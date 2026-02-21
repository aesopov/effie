import { useContext } from "react";
import { StoreContext } from "./context";

export interface UseSelector<StateType = unknown> {
  <TState extends StateType = StateType, Selected = unknown>(
    selector: (state: TState) => Selected
  ): Selected;

  withTypes: <
    OverrideStateType extends StateType
  >() => UseSelector<OverrideStateType>;
}

const useSelector = (<T, O = unknown>(selector: (state: T) => O) => {
  const store = useContext(StoreContext);
  if (!store) {
    throw new Error("Store is not provided.");
  }
  return store.useSelector(selector);
}) as UseSelector;

Object.assign(useSelector, {
  withTypes: <TState>() =>
    useSelector as <O>(selector: (state: TState) => O) => O,
});

export { useSelector };

export interface TypedUseSelectorHook<TState> {
  <TSelected>(selector: (state: TState) => TSelected): TSelected;
}
