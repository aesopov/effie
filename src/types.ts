import type { $stateType } from "./consts";

export type State<TState> = React.ReactNode & { [K in typeof $stateType]: TState };

export type InferStateType<T> = T extends State<infer S>
  ? InferStateType<S>
  : T extends Function
  ? T
  : {
      [P in keyof T]: InferStateType<T[P]>;
    };

export type Store<T> = {
  getState(): InferStateType<T>;
  useSelector<O>(selector: (state: InferStateType<T>) => O): O;
  Provider(props: React.PropsWithChildren): React.ReactElement;
};
