# Bitácora del Navegante

Planificador académico con Next.js, React y MongoDB. Cada persona crea una cuenta por correo y conserva en la nube sus misiones, materias, notas, porcentajes y progreso.

## Inicio rápido

Requisitos: Node.js 20 o superior, npm y una base de datos MongoDB.

```bash
npm install
```

Copia `.env.example` como `.env.local` y completa sus valores. Después ejecuta:

```bash
npm run dev
```

Abre `http://localhost:3000`. La primera pantalla no contiene ningún perfil ni dato de demostración: permite crear una cuenta o iniciar sesión.

Al desplegar en Vercel, no configures `MONGODB_DNS_SERVERS` y crea un despliegue nuevo después de guardar las variables. La lista completa para Atlas y Vercel está en [Datos, seguridad y MongoDB](docs/DATOS-Y-SEGURIDAD.md#lista-de-comprobación-para-vercel).

## Variables de entorno

| Variable | Descripción |
| --- | --- |
| `MONGODB_URI` | Cadena privada de conexión de MongoDB |
| `MONGODB_DB` | Nombre de la base; por defecto `bitacora` |
| `MONGODB_DNS_SERVERS` | Solo desarrollo local. DNS separados por coma si Windows no resuelve SRV; déjala sin configurar en Vercel |
| `SESSION_SECRET` | Secreto aleatorio largo para firmar sesiones |

Genera un secreto con un administrador de contraseñas o con `openssl rand -base64 32`. Nunca publiques `.env.local`.

## Funciones

- Registro e inicio de sesión con correo y contraseña.
- Contraseñas cifradas con bcrypt.
- Sesiones firmadas en cookies `httpOnly`.
- Misiones aisladas por usuario en MongoDB.
- Calendario, agenda diaria y Misiones de Mundo.
- Mapa de campaña cronológico con destinos interactivos y fortalezas para jefes finales.
- Progreso RPG con experiencia, niveles, rangos y recompensas según la importancia.
- Centro de mando con siguiente objetivo, urgencia, recompensa y filtros rápidos de campaña.
- Celebraciones visuales de victoria y efectos especiales al derrotar jefes finales.
- Cinco temas de color intercambiables, incluido Reino Rosa, guardados en el navegador.
- Notas, porcentajes y promedio ponderado.
- Diseño adaptable a escritorio y celular.
- Guardado optimista para una interfaz rápida.

## Documentación

- [Guía de uso](docs/GUIA-DE-USO.md)
- [Arquitectura](docs/ARQUITECTURA.md)
- [Datos, seguridad y MongoDB](docs/DATOS-Y-SEGURIDAD.md)
- [Cómo extender el proyecto](docs/COMO-EXTENDER.md)

## Verificación

```bash
npm run build
npm audit
```
