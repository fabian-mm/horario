"use client";

import { useCallback, useEffect, useState } from "react";
import type { AppUser } from "@/lib/users";

type AuthPayload = { user: AppUser | null; error?: string };

async function authRequest(url: string, body?: unknown) {
  const response = await fetch(url, {
    method: body ? "POST" : "GET",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await response.json() as AuthPayload;
  if (!response.ok) throw new Error(data.error ?? "No fue posible completar la solicitud.");
  return data;
}

export function useAuth() {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await authRequest("/api/auth/session");
      setUser(data.user);
      setError(null);
    } catch (requestError) {
      setUser(null);
      setError(requestError instanceof Error ? requestError.message : "No se pudo comprobar la sesión.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const register = async (values: { name: string; email: string; password: string }) => {
    try {
      const data = await authRequest("/api/auth/register", values);
      setUser(data.user);
      setError(null);
      return null;
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : "No se pudo crear la cuenta.";
      setError(message);
      return message;
    }
  };

  const login = async (values: { email: string; password: string }) => {
    try {
      const data = await authRequest("/api/auth/login", values);
      setUser(data.user);
      setError(null);
      return null;
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : "No se pudo iniciar sesión.";
      setError(message);
      return message;
    }
  };

  const logout = async () => {
    await authRequest("/api/auth/logout", {});
    setUser(null);
    setError(null);
  };

  const updateAccount = async (values: { name: string; subtitle: string }) => {
    try {
      const response = await fetch("/api/account", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(values) });
      const data = await response.json() as AuthPayload;
      if (!response.ok) throw new Error(data.error ?? "No se pudo guardar la cuenta.");
      setUser(data.user);
      return null;
    } catch (requestError) {
      return requestError instanceof Error ? requestError.message : "No se pudo guardar la cuenta.";
    }
  };

  return { user, loading, error, register, login, logout, updateAccount };
}
