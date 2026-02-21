import { State } from "./types";

export function state<T>(object: T): State<T> {
  return object as State<T>;
}
