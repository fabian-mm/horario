"use client";

import { FormEvent, useEffect, useState } from "react";
import { Check, Database, LogOut, Palette, UserRound, X } from "lucide-react";
import { appThemes, ThemeId } from "@/lib/themes";
import type { AppUser } from "@/lib/users";
import { getUserInitials } from "@/lib/users";

type Props = {
  open: boolean;
  user: AppUser;
  onClose: () => void;
  onLogout: () => Promise<string | null>;
  onUpdate: (values: { name: string; subtitle: string }) => Promise<string | null>;
  theme: ThemeId;
  onThemeChange: (theme: ThemeId) => void;
};

export function AccountPanel({ open, user, onClose, onLogout, onUpdate, theme, onThemeChange }: Props) {
  const [name, setName] = useState(user.name);
  const [subtitle, setSubtitle] = useState(user.subtitle);
  const [message, setMessage] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<"save" | "logout" | null>(null);

  useEffect(() => {
    setName(user.name);
    setSubtitle(user.subtitle);
    setMessage(null);
    setPendingAction(null);
  }, [open, user]);
  if (!open) return null;

  const save = async (event: FormEvent) => {
    event.preventDefault();
    setPendingAction("save");
    try {
      const error = await onUpdate({ name, subtitle });
      setMessage(error ?? "Cuenta actualizada.");
    } finally {
      setPendingAction(null);
    }
  };

  const logout = async () => {
    setPendingAction("logout");
    try {
      const error = await onLogout();
      if (error) setMessage(error);
    } finally {
      setPendingAction(null);
    }
  };

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <section className="account-modal" role="dialog" aria-modal="true" aria-labelledby="account-title" onMouseDown={(event) => event.stopPropagation()}>
        <div className="modal-heading"><div className="modal-icon"><UserRound size={20} /></div><div><span className="eyebrow">CUENTA DEL NAVEGANTE</span><h2 id="account-title">Mi cuenta</h2></div><button className="icon-button" onClick={onClose} aria-label="Cerrar"><X size={20} /></button></div>
        <form className="account-form" onSubmit={save}>
          <div className="account-identity"><span>{getUserInitials(user.name)}</span><div><strong>{user.email}</strong><small><Database size={12} /> Sincronizado con MongoDB</small></div></div>
          <section className="theme-settings" aria-labelledby="theme-title">
            <div className="theme-heading"><span><Palette size={16} /></span><div><strong id="theme-title">Tema de la aventura</strong><small>Se guarda en este navegador.</small></div></div>
            <div className="theme-options" role="radiogroup" aria-label="Tema de colores">
              {appThemes.map((item) => (
                <button key={item.id} type="button" role="radio" aria-checked={theme === item.id} className={theme === item.id ? "active" : ""} onClick={() => onThemeChange(item.id)}>
                  <span className="theme-swatches" aria-hidden="true">{item.colors.map((color) => <i key={color} style={{ background: color }} />)}</span>
                  <span><strong>{item.name}</strong><small>{item.description}</small></span>
                  {theme === item.id && <Check size={15} />}
                </button>
              ))}
            </div>
          </section>
          <label>Nombre<input required value={name} onChange={(event) => setName(event.target.value)} /></label>
          <label>Descripción<input required value={subtitle} onChange={(event) => setSubtitle(event.target.value)} /></label>
          {message && <p className="account-message">{message}</p>}
          <div className="account-actions"><button type="button" className="logout-button" onClick={logout} disabled={pendingAction !== null}><LogOut size={16} /> {pendingAction === "logout" ? "Cerrando..." : "Cerrar sesión"}</button><button className="primary-button" disabled={pendingAction !== null}>{pendingAction === "save" ? "Guardando..." : "Guardar cambios"}</button></div>
        </form>
      </section>
    </div>
  );
}
