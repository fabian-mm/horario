type ApiErrorPayload = {
  error?: unknown;
};

function getApiError(payload: unknown) {
  if (!payload || typeof payload !== "object") return null;
  const error = (payload as ApiErrorPayload).error;
  return typeof error === "string" && error.trim() ? error : null;
}

/**
 * Lee una respuesta de la API sin ocultar el error original cuando Vercel o
 * Next devuelven una página HTML, un cuerpo vacío o JSON dañado.
 */
export async function readApiResponse<T>(response: Response, fallbackError: string): Promise<T> {
  const rawBody = await response.text();
  let payload: unknown;

  if (rawBody) {
    try {
      payload = JSON.parse(rawBody);
    } catch {
      if (!response.ok) throw new Error(fallbackError);
      throw new Error("El servidor devolvió una respuesta inválida.");
    }
  }

  if (!response.ok) {
    throw new Error(getApiError(payload) ?? fallbackError);
  }

  return payload as T;
}

export function getRequestError(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

export function isAbortError(error: unknown) {
  return error instanceof Error && error.name === "AbortError";
}
