import { useState } from "react";
import { describe, it, expect } from "vitest";
import { createStore } from "../store";
import { state } from "../state";
import { from } from "../from";
import { createContextProvider } from "../createContextProvider";
import { clone, collectChildren, stateFiller } from "../iterator";

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

  it("creates a store with a context provider", async () => {
    function FakeProvider(props: { value: string; children?: React.ReactNode }) {
      return props.children as React.ReactElement;
    }

    const provider = createContextProvider(FakeProvider, { value: "test" });
    const store = createStore(
      () => state({ count: 0 }),
      provider
    );
    await wait();
    expect(store.getState()).toEqual({ count: 0 });
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

  it("uses explicit key when provided", async () => {
    function counter() {
      return state({ count: 0 });
    }

    const store = createStore(() =>
      state({
        a: from(counter, { key: "my-key" }),
        b: from(counter, { key: "other-key" }),
      })
    );
    await wait();
    expect(store.getState().a).toEqual({ count: 0 });
    expect(store.getState().b).toEqual({ count: 0 });
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

  it("supports multiple sequential updates", async () => {
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

    store.getState().counter.increment();
    await wait();
    store.getState().counter.increment();
    await wait();
    store.getState().counter.increment();
    await wait();

    expect(store.getState().counter.count).toBe(3);
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

  it("handles empty arrays", async () => {
    const store = createStore(() =>
      state({
        items: [],
      })
    );
    await wait();
    expect(store.getState().items).toEqual([]);
  });

  it("handles nested arrays", async () => {
    const store = createStore(() =>
      state({
        matrix: [[1, 2], [3, 4]],
      })
    );
    await wait();
    expect(store.getState().matrix).toEqual([[1, 2], [3, 4]]);
  });
});

describe("clone", () => {
  it("returns primitives as-is", () => {
    expect(clone(null)).toBe(null);
    expect(clone(undefined)).toBe(undefined);
    expect(clone(42)).toBe(42);
    expect(clone("hello")).toBe("hello");
    expect(clone(true)).toBe(true);
  });

  it("deep clones objects", () => {
    const original = { a: { b: 1 }, c: [1, 2] };
    const cloned = clone(original);
    expect(cloned).toEqual(original);
    expect(cloned).not.toBe(original);
    expect(cloned.a).not.toBe(original.a);
    expect(cloned.c).not.toBe(original.c);
  });

  it("clones Date objects", () => {
    const date = new Date("2024-01-01");
    const cloned = clone(date);
    expect(cloned).toEqual(date);
    expect(cloned).not.toBe(date);
    expect(cloned).toBeInstanceOf(Date);
  });

  it("clones arrays", () => {
    const original = [1, { a: 2 }, [3]];
    const cloned = clone(original);
    expect(cloned).toEqual(original);
    expect(cloned).not.toBe(original);
    expect(cloned[1]).not.toBe(original[1]);
  });

  it("does not iterate inherited prototype properties", () => {
    const parent = { inherited: true };
    const child = Object.create(parent);
    child.own = "value";
    const cloned = clone(child);
    expect(cloned.own).toBe("value");
    expect(cloned.inherited).toBeUndefined();
  });
});

describe("stateFiller", () => {
  it("returns a function", () => {
    const filler = stateFiller({});
    expect(typeof filler).toBe("function");
  });
});

describe("collectChildren", () => {
  it("handles null/undefined gracefully", () => {
    const children: React.ReactElement[] = [];
    collectChildren(null, children);
    collectChildren(undefined, children);
    expect(children).toEqual([]);
  });

  it("handles empty objects", () => {
    const children: React.ReactElement[] = [];
    collectChildren({}, children);
    expect(children).toEqual([]);
  });
});

describe("store.Provider", () => {
  it("has a Provider property on the store", async () => {
    const store = createStore(() => state({ value: 1 }));
    await wait();
    expect(typeof store.Provider).toBe("function");
  });
});
