# Bitácora · Tu espacio de estudio

Planificador para estudiantes universitarios con Next.js, React y MongoDB. Organiza clases, entregas, proyectos y sesiones de estudio sin separar el cronómetro de la tarea.

Esta copia fue recuperada desde un directorio de trabajo. El historial anterior, el remoto y las credenciales no estaban disponibles: consulta [la nota de recuperación](docs/RECUPERACION.md).

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
- Hoy: entregas del día, próximas tareas, clases y huecos entre clases.
- Semana: los siete días con clases y entregas diferenciadas y navegación entre semanas.
- Proyectos: tareas agrupadas mediante filtros de materia, proyecto y estado.
- Horarios recurrentes: arrastrar clases entre días, copiar con Ctrl al soltar y copiar/pegar entre horarios. En móvil, abrir una clase para cambiar su día o copiarla.
- Catálogo de materias reutilizado por tareas y clases.
- Control horario accesible: escritura flexible, ajustes de 15 minutos y validación visible.
- Cronómetro persistente por usuario en este navegador, pausa/reanudación y reintento si falla el guardado.
- Registro de tiempo separado del estado de entrega, con identificador único para evitar duplicación al reintentar.
- Estética RPG de exploración: pergamino, paisaje vectorial, insignias, nivel y rango. La experiencia existente (25/50/100 XP por prioridad) se calcula con las tareas completadas; reabrirlas recalcula el total, sin acumular recompensas duplicadas.
- Celebración breve al completar desde el tablón; respeta la preferencia de movimiento reducido. La búsqueda no altera el progreso del personaje.
- Cinco temas de color intercambiables, incluido Reino Rosa, guardados en el navegador.
- Notas, porcentajes y promedio ponderado.
- Diseño adaptable a escritorio y celular.
- Guardado optimista para una interfaz rápida.

## Documentación

- [Recuperación y uso de la nueva interfaz](docs/RECUPERACION.md)
- [Guía de la versión recuperada (interfaz anterior)](docs/GUIA-DE-USO.md)
- [Arquitectura](docs/ARQUITECTURA.md)
- [Datos, seguridad y MongoDB](docs/DATOS-Y-SEGURIDAD.md)
- [Cómo extender el proyecto](docs/COMO-EXTENDER.md)

## Verificación

```bash
npm run build
npm run typecheck
npm test
npm run test:e2e
npm audit
```

Las pruebas de navegador usan Edge y datos simulados: no necesitan credenciales ni escriben en MongoDB. Para otro navegador, configura `PLAYWRIGHT_CHANNEL` (por ejemplo `chrome`).
