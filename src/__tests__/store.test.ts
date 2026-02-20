import { useState } from "react";
import { describe, it, expect } from "vitest";
import { createStore } from "../store";
import { state } from "../state";
import { from } from "../from";

function wait(ms = 10) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe("createStore", () => {
  it("creates a store with getState returning the correct shape", async () => {
    const store = createStore(() =>
      state({
        count: 0,
        name: "test",
      })
    );
    await wait();
    const s = store.getState();
    expect(s).toEqual({ count: 0, name: "test" });
  });

  it("creates a store with nested state", async () => {
    const store = createStore(() =>
      state({
        user: {
          name: "Alice",
          age: 30,
        },
        items: [1, 2, 3],
      })
    );
    await wait();
    const s = store.getState();
    expect(s).toEqual({
      user: { name: "Alice", age: 30 },
      items: [1, 2, 3],
    });
  });
});

describe("from", () => {
  it("calls the function without props (regression for null bug)", async () => {
    function counter() {
      return state({ count: 0 });
    }

    const store = createStore(() =>
      state({
        counter: from(counter),
      })
    );
    await wait();
    const s = store.getState();
    expect(s.counter).toEqual({ count: 0 });
  });

  it("passes props to the state function", async () => {
    function counter(props: { initial: number }) {
      return state({ count: props.initial });
    }

    const store = createStore(() =>
      state({
        counter: from(counter, { initial: 42 }),
      })
    );
    await wait();
    const s = store.getState();
    expect(s.counter).toEqual({ count: 42 });
  });
});

describe("state updates", () => {
  it("setter triggers state update and subscriber notification", async () => {
    function counter() {
      const [count, setCount] = useState(0);
      return state({
        count,
        increment: () => setCount((c) => c + 1),
      });
    }

    const store = createStore(() =>
      state({
        counter: from(counter),
      })
    );
    await wait();

    expect(store.getState().counter.count).toBe(0);

    // Trigger update
    store.getState().counter.increment();
    await wait();

    expect(store.getState().counter.count).toBe(1);
  });
});

describe("array states", () => {
  it("handles arrays in state", async () => {
    const store = createStore(() =>
      state({
        items: ["a", "b", "c"],
      })
    );
    await wait();
    expect(store.getState().items).toEqual(["a", "b", "c"]);
  });
});
