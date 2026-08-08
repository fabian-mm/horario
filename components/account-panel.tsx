"use client";

import { FormEvent, useEffect, useState } from "react";
import { Database, LogOut, UserRound, X } from "lucide-react";
import type { AppUser } from "@/lib/users";
import { getUserInitials } from "@/lib/users";

type Props = {
  open: boolean;
  user: AppUser;
  onClose: () => void;
  onLogout: () => Promise<void>;
  onUpdate: (values: { name: string; subtitle: string }) => Promise<string | null>;
};

export function AccountPanel({ open, user, onClose, onLogout, onUpdate }: Props) {
  const [name, setName] = useState(user.name);
  const [subtitle, setSubtitle] = useState(user.subtitle);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => { setName(user.name); setSubtitle(user.subtitle); }, [user]);
  if (!open) return null;

  const save = async (event: FormEvent) => {
    event.preventDefault();
    const error = await onUpdate({ name, subtitle });
    setMessage(error ?? "Cuenta actualizada.");
  };

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <section className="account-modal" role="dialog" aria-modal="true" aria-labelledby="account-title" onMouseDown={(event) => event.stopPropagation()}>
        <div className="modal-heading"><div className="modal-icon"><UserRound size={20} /></div><div><span className="eyebrow">CUENTA DEL NAVEGANTE</span><h2 id="account-title">Mi cuenta</h2></div><button className="icon-button" onClick={onClose} aria-label="Cerrar"><X size={20} /></button></div>
        <form className="account-form" onSubmit={save}>
          <div className="account-identity"><span>{getUserInitials(user.name)}</span><div><strong>{user.email}</strong><small><Database size={12} /> Sincronizado con MongoDB</small></div></div>
          <label>Nombre<input required value={name} onChange={(event) => setName(event.target.value)} /></label>
          <label>Descripción<input required value={subtitle} onChange={(event) => setSubtitle(event.target.value)} /></label>
          {message && <p className="account-message">{message}</p>}
          <div className="account-actions"><button type="button" className="logout-button" onClick={onLogout}><LogOut size={16} /> Cerrar sesión</button><button className="primary-button">Guardar cambios</button></div>
        </form>
      </section>
    </div>
  );
}
