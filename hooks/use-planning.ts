"use client";
import { useEffect, useRef, useState } from "react";
import { defaultPlanning, planningSchema, type Planning } from "@/lib/planning";

export function usePlanning(userId?: string) {
  const [data, setData] = useState<Planning>(defaultPlanning);
  const [loadedFor, setLoadedFor] = useState<string>();
  const [saving, setSaving] = useState(false);
  const busy = useRef(false);
  const generation = useRef(0);
  const [error, setError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const token = ++generation.current;
    setLoadedFor(undefined); setData(defaultPlanning); setError(null);
    if (!userId) return;
    const controller = new AbortController();
    fetch("/api/planning", { signal: AbortSignal.any([controller.signal, AbortSignal.timeout(20000)]) }).then(async response => {
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "No se pudo cargar tu planificación.");
      return planningSchema.parse(body);
    }).then(value => { if (generation.current === token) { setData(value); setLoadedFor(userId); } }).catch(err => { if (!controller.signal.aborted && generation.current === token) setError(err instanceof Error ? err.message : "No se pudo cargar tu planificación."); });
    return () => { controller.abort(); generation.current++; };
  }, [userId, revision]);
  const ready = Boolean(userId && loadedFor === userId);
  const save = async (patch: Partial<Planning>) => {
    if (!ready || busy.current) return false;
    busy.current = true; setSaving(true); setError(null);
    const token = generation.current;
    try {
      const response = await fetch("/api/planning", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch), signal: AbortSignal.timeout(20000) });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error ?? "No se pudo guardar. Conservamos lo escrito para reintentar.");
      if (token !== generation.current) return false;
      setData(current => ({ ...current, ...patch })); return true;
    } catch (err) { if (token === generation.current) setError(err instanceof Error ? err.message : "No se pudo guardar."); return false; }
    finally { busy.current = false; setSaving(false); }
  };
  return { data, ready, saving, error, save, retry: () => setRevision(value => value + 1) };
}
