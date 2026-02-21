import { createElement } from "react";

export type ContextProvider = (children: React.ReactNode[]) => React.ReactElement;

export function createContextProvider<
  TContextProviderProps extends Record<string, unknown>
>(
  fn: (props: TContextProviderProps) => React.ReactElement,
  props: TContextProviderProps
): ContextProvider {
  return (children) => createElement(fn, { ...props, children });
}
