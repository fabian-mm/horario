"use client";

import { FormEvent, useState } from "react";
import { Anchor, ArrowRight, Compass, Eye, EyeOff, LockKeyhole, Mail, ShieldCheck } from "lucide-react";

type Props = {
  connectionError?: string | null;
  onRegister: (values: { name: string; email: string; password: string }) => Promise<string | null>;
  onLogin: (values: { email: string; password: string }) => Promise<string | null>;
};

export function AuthScreen({ connectionError, onRegister, onLogin }: Props) {
  const [mode, setMode] = useState<"register" | "login">("register");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setPending(true);
    setError(null);
    const message = mode === "register"
      ? await onRegister({ name, email, password })
      : await onLogin({ email, password });
    setError(message);
    setPending(false);
  };

  return (
    <main className="auth-page">
      <section className="auth-story">
        <div className="auth-brand"><span><Compass size={27} /></span><div><strong>BITÁCORA</strong><small>DEL NAVEGANTE</small></div></div>
        <div className="auth-copy">
          <span className="eyebrow">TU AVENTURA EMPIEZA AQUÍ</span>
          <h1>Organiza el semestre.<br /><i>Conquista el mapa.</i></h1>
          <p>Tus misiones, notas y promedios estarán disponibles al iniciar sesión desde cualquier dispositivo.</p>
          <div className="auth-benefits"><span><ShieldCheck size={16} /> Datos privados</span><span><Anchor size={16} /> Guardado en MongoDB</span></div>
        </div>
        <div className="auth-map-mark">✣</div>
      </section>
      <section className="auth-panel">
        <div className="auth-card">
          <span className="eyebrow">{mode === "register" ? "NUEVO NAVEGANTE" : "BIENVENIDO DE VUELTA"}</span>
          <h2>{mode === "register" ? "Crea tu cuenta" : "Continúa tu aventura"}</h2>
          <p>{mode === "register" ? "No necesitas un perfil previo. Tu correo será tu acceso." : "Ingresa con el correo que registraste."}</p>
          <div className="auth-tabs">
            <button className={mode === "register" ? "active" : ""} onClick={() => { setMode("register"); setError(null); }}>Crear cuenta</button>
            <button className={mode === "login" ? "active" : ""} onClick={() => { setMode("login"); setError(null); }}>Iniciar sesión</button>
          </div>
          <form onSubmit={submit}>
            {mode === "register" && <label>Nombre completo<input required minLength={2} value={name} onChange={(event) => setName(event.target.value)} placeholder="Tu nombre" autoComplete="name" /></label>}
            <label>Correo electrónico<div className="auth-input"><Mail size={16} /><input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="tu@correo.com" autoComplete="email" /></div></label>
            <label>Contraseña<div className="auth-input"><LockKeyhole size={16} /><input required minLength={8} type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Mínimo 8 caracteres" autoComplete={mode === "register" ? "new-password" : "current-password"} /><button type="button" onClick={() => setShowPassword((current) => !current)} aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}>{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button></div></label>
            {(error || connectionError) && <div className="auth-error" role="alert">{error ?? connectionError}</div>}
            <button className="primary-button auth-submit" disabled={pending}>{pending ? "Guardando..." : mode === "register" ? "Crear mi cuenta" : "Entrar"}<ArrowRight size={17} /></button>
          </form>
          <small className="auth-privacy">La contraseña se cifra antes de guardarse y nunca se devuelve al navegador.</small>
        </div>
      </section>
    </main>
  );
}
