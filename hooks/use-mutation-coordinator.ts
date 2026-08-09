"use client";

import { useCallback, useRef } from "react";

/**
 * Serializa escrituras remotas y permite saber si una respuesta todavía
 * corresponde a la última modificación optimista de una entidad.
 */
export function useMutationCoordinator() {
  const queue = useRef<Promise<void>>(Promise.resolve());
  const versions = useRef(new Map<string, number>());

  const begin = useCallback((id: string) => {
    const version = (versions.current.get(id) ?? 0) + 1;
    versions.current.set(id, version);
    return version;
  }, []);

  const isLatest = useCallback(
    (id: string, version: number) => versions.current.get(id) === version,
    [],
  );

  const enqueue = useCallback(<T,>(operation: () => Promise<T>) => {
    const result = queue.current.then(operation, operation);
    queue.current = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  }, []);

  return { begin, isLatest, enqueue };
}
