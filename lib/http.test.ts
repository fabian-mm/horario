import { describe, expect, it } from "vitest";
import { getRequestError, isAbortError, readApiResponse } from "./http";

describe("respuestas de la API", () => {
  it("conserva el mensaje enviado por la API", async () => {
    const response = new Response(JSON.stringify({ error: "El correo ya está registrado." }), {
      status: 409,
      headers: { "Content-Type": "application/json" },
    });

    await expect(readApiResponse(response, "No se pudo registrar.")).rejects.toThrow(
      "El correo ya está registrado.",
    );
  });

  it("usa un mensaje comprensible cuando el servidor devuelve HTML", async () => {
    const response = new Response("<h1>Internal Server Error</h1>", { status: 500 });

    await expect(readApiResponse(response, "No se pudo guardar.")).rejects.toThrow(
      "No se pudo guardar.",
    );
  });

  it("admite respuestas exitosas sin cuerpo", async () => {
    const response = new Response(null, { status: 204 });

    await expect(readApiResponse(response, "No se pudo eliminar.")).resolves.toBeUndefined();
  });

  it("normaliza errores desconocidos", () => {
    expect(getRequestError(null, "Error de red.")).toBe("Error de red.");
  });

  it("reconoce las cancelaciones de red", () => {
    expect(isAbortError(new DOMException("Cancelada", "AbortError"))).toBe(true);
    expect(isAbortError(new Error("Fallo"))).toBe(false);
  });
});
