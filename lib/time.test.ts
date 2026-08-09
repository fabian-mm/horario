import { describe, expect, it } from "vitest";
import { formatTime12Hour, isTimeBlockWithinDay, parseTimeInput, shiftTime } from "./time";

describe("time helpers", () => {
  it("acepta escritura AM/PM desde teclado", () => {
    expect(parseTimeInput("8:30 pm")).toBe("20:30");
    expect(parseTimeInput("12 a")).toBe("00:00");
    expect(formatTime12Hour("13:05")).toBe("1:05 PM");
  });

  it("rechaza desplazamientos que cruzan medianoche en lugar de recortarlos", () => {
    expect(shiftTime("23:00", 120)).toBeNull();
    expect(shiftTime("22:30", 60)).toBe("23:30");
    expect(isTimeBlockWithinDay("23:00", 120)).toBe(false);
    expect(isTimeBlockWithinDay("21:00", 120)).toBe(true);
  });
});
