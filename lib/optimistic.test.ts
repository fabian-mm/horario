import { describe, expect, it } from "vitest";
import { restoreById, upsertById } from "./optimistic";

describe("optimistic collection helpers", () => {
  it("revierte solo el elemento fallido y conserva cambios ajenos", () => {
    const initial = [{ id: "a", value: 1 }, { id: "b", value: 1 }];
    const optimistic = upsertById(initial, { id: "a", value: 2 });
    const concurrent = upsertById(optimistic, { id: "b", value: 2 });
    expect(restoreById(concurrent, "a", initial[0])).toEqual([
      { id: "b", value: 2 },
      { id: "a", value: 1 },
    ]);
  });
});
