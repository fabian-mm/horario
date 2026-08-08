"use client";

import { FormEvent, useEffect, useState } from "react";
import { Check, Plus, Smartphone, UserRound, X } from "lucide-react";
import { getInitials, LocalProfile } from "@/lib/profiles";

type Props = {
  open: boolean;
  profiles: LocalProfile[];
  activeProfileId: string;
  onClose: () => void;
  onSelect: (id: string) => void;
  onCreate: () => string;
  onUpdate: (id: string, changes: Pick<LocalProfile, "name" | "subtitle">) => void;
};

export function ProfileManager({ open, profiles, activeProfileId, onClose, onSelect, onCreate, onUpdate }: Props) {
  const activeProfile = profiles.find((profile) => profile.id === activeProfileId) ?? profiles[0];
  const [name, setName] = useState(activeProfile?.name ?? "");
  const [subtitle, setSubtitle] = useState(activeProfile?.subtitle ?? "");

  useEffect(() => {
    setName(activeProfile?.name ?? "");
    setSubtitle(activeProfile?.subtitle ?? "");
  }, [activeProfile?.id, activeProfile?.name, activeProfile?.subtitle]);

  if (!open || !activeProfile) return null;

  const save = (event: FormEvent) => {
    event.preventDefault();
    onUpdate(activeProfile.id, { name: name.trim() || "Navegante", subtitle: subtitle.trim() || "Explorador del semestre" });
  };

  const create = () => {
    const id = onCreate();
    onSelect(id);
  };

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <section className="profile-modal" role="dialog" aria-modal="true" aria-labelledby="profiles-title" onMouseDown={(event) => event.stopPropagation()}>
        <div className="modal-heading">
          <div className="modal-icon"><UserRound size={20} /></div>
          <div><span className="eyebrow">DATOS DEL DISPOSITIVO</span><h2 id="profiles-title">Perfiles locales</h2></div>
          <button className="icon-button" onClick={onClose} aria-label="Cerrar"><X size={20} /></button>
        </div>
        <div className="profile-manager-grid">
          <aside className="profile-list">
            <div className="local-data-note"><Smartphone size={17} /><span>Los datos se guardan solamente en este navegador.</span></div>
            {profiles.map((profile) => (
              <button key={profile.id} className={profile.id === activeProfileId ? "active" : ""} onClick={() => onSelect(profile.id)}>
                <span>{getInitials(profile.name)}</span><div><strong>{profile.name}</strong><small>{profile.subtitle}</small></div>{profile.id === activeProfileId && <Check size={15} />}
              </button>
            ))}
            <button className="create-profile" onClick={create}><Plus size={16} /> Crear otro perfil</button>
          </aside>
          <form className="profile-editor" onSubmit={save}>
            <span className="eyebrow">PERFIL ACTIVO</span>
            <div className="large-avatar">{getInitials(activeProfile.name)}</div>
            <label>Nombre<input required value={name} onChange={(event) => setName(event.target.value)} placeholder="Nombre del navegante" /></label>
            <label>Descripción<input value={subtitle} onChange={(event) => setSubtitle(event.target.value)} placeholder="Ej. Ingeniería electrónica" /></label>
            <p>Las misiones, notas y promedios de este perfil están separados de los demás perfiles del dispositivo.</p>
            <button className="primary-button" type="submit">Guardar perfil</button>
          </form>
        </div>
      </section>
    </div>
  );
}
