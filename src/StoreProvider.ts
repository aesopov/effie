import { createElement, useState } from "react";
import { StoreContext } from "./context";
import { Store } from "./types";

export { useSelector, type UseSelector, type TypedUseSelectorHook } from "./useSelector";

export function StoreProvider<TStore extends Store<any>>({
  store,
  children,
}: React.PropsWithChildren<{ store: TStore }>) {
  const [storeValue] = useState(store);
  return createElement(StoreContext.Provider, { value: storeValue, children });
}
