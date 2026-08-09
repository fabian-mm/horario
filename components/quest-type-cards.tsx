"use client";

import { Settings2 } from "lucide-react";

export type QuestTypeCard = { id: string; label: string; detail?: string; tone?: string };

type Props = {
  label: string;
  options: QuestTypeCard[];
  selectedId?: string;
  onSelect: (id: string) => void;
  onManage: () => void;
};

export function QuestTypeCards({ label, options, selectedId, onSelect, onManage }: Props) {
  return <fieldset className="quest-type-fieldset">
    <legend>{label}</legend>
    <div className="quest-type-cards" role="radiogroup" aria-label={label}>
      {options.map((option, index) => <button key={option.id} type="button" role="radio" aria-checked={selectedId === option.id} className={`quest-type-card tone-${option.tone ?? index % 5} ${selectedId === option.id ? "selected" : ""}`} onClick={() => onSelect(option.id)}>
        <i>{String(index + 1).padStart(2, "0")}</i><span><strong>{option.label}</strong>{option.detail && <small>{option.detail}</small>}</span>
      </button>)}
      <button type="button" className="quest-type-manage" onClick={onManage}><Settings2 size={15} /><span><strong>Configurar</strong><small>Crear o editar tipos</small></span></button>
    </div>
  </fieldset>;
}
