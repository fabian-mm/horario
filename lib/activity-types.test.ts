import { describe, expect, it } from "vitest";
import { defaultActivityTypes, resolveActivityType } from "./activity-types";

describe("activity type resolution", () => {
  it("no sustituye un tipo eliminado por el primero del catálogo", () => {
    const resolved = resolveActivityType(defaultActivityTypes, "deleted-type", "Laboratorio");
    expect(resolved.id).toBe("deleted-type");
    expect(resolved.name).toBe("Laboratorio");
    expect(resolved.points).toBe(0);
    expect(resolved.id).not.toBe(defaultActivityTypes[0].id);
  });
});
