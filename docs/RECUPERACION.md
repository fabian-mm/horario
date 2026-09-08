# Recuperación del repositorio y nueva interfaz

## Qué se recuperó

Se utilizó como base `horario.worktrees/organizar-misiones-semanales-por-hora`. La carpeta original `horario` y su historial de Git no estaban disponibles; el archivo `.git` del directorio de trabajo apuntaba a esa carpeta desaparecida.

Se copió el código a `horario`, se creó un repositorio independiente en la rama `codex/recuperacion-academica` y se guardó la base en el commit `010c95e`. La copia de origen no se modificó. El nuevo repositorio no depende del puntero roto.

No se recuperaron el historial anterior, el remoto ni `.env.local`. No se ha publicado ni desplegado esta recuperación. El punto de partida es una versión anterior y no incluye todas las mejoras de otras versiones que ya no estaban en disco.

## Organización académica

- **Hoy:** entregas pendientes del día y próximas, atrasadas en un apartado plegable, clases y huecos libres entre las 08:00 y las 20:00. Los huecos son orientativos: solo consideran clases, no compromisos personales.
- **Semana:** siete días con clases y fechas de entrega, navegación a semanas anteriores/siguientes y creación de una tarea para un día concreto. Las entregas no se interpretan como bloques de tiempo ocupado.
- **Proyectos:** una tarea puede tener materia, proyecto y tiempo estimado. Los filtros permiten seguir su avance y las nuevas tareas heredan el proyecto seleccionado.
- **Horario recurrente:** disponible desde Semana. Arrastrar mueve una clase de día; Ctrl/Cmd al soltar la duplica. Ctrl/Cmd+C sobre una tarjeta y Ctrl/Cmd+V sobre un día copia y pega. Al tocar una clase se puede editar su día o copiarla y después pegarla en otro día u horario. Cambiar una clase recurrente modifica todas sus apariciones dentro del intervalo del horario.
- **Estudio:** iniciar desde la tarea abre una barra persistente al navegar por la aplicación. Guardar una sesión añade tiempo estudiado; no completa automáticamente la entrega.

Las acciones secundarias aparecen al pasar el cursor o enfocar con teclado. En pantallas táctiles las acciones necesarias se mantienen accesibles. Las materias, notas, porcentajes y temas de cuenta se mantienen; los componentes antiguos de mapas/RPG se conservan en el código recuperado pero no se muestran en la nueva navegación principal.

## Guardado del cronómetro

La sesión en curso se conserva en `localStorage`, separada por usuario. Un fallo al guardar mantiene el tiempo congelado y un identificador de sesión estable para reintentar, incluso tras recargar. El endpoint `POST /api/missions/[missionId]/study` valida la sesión y añade sus minutos de forma atómica en el documento de la tarea, condicionado a que su identificador no exista ya. No permite escribir en tareas de otra cuenta.

No borres los datos del navegador mientras haya una sesión pendiente. Si el navegador bloquea el almacenamiento, se muestra un aviso. Una tarea eliminada o una sesión de autenticación caducada requieren recuperar la tarea o iniciar sesión para poder guardar. Las pruebas utilizan datos simulados; no verifican el historial del usuario que reportó el problema en producción.

## Arranque y verificación

1. Instalar dependencias: `npm ci`.
2. Crear `.env.local` a partir de `.env.example` y configurar MongoDB y `SESSION_SECRET`. Nunca subir credenciales a Git.
3. Ejecutar `npm run dev`.
4. Verificar con `npm run typecheck`, `npm test`, `npm run test:e2e` y `npm run build`.

Las pruebas unitarias cubren fechas, huecos entre clases, validación, propiedad de tareas y reintentos del endpoint con autenticación/base simuladas. Las pruebas de navegador interceptan todas las llamadas de datos y cubren navegación, proyecto seleccionado, sesión de 90 minutos con fallo/recarga/reintento, arrastre/copia de clases y diseño móvil. Por defecto necesitan Microsoft Edge instalado; puede elegirse otro canal con `PLAYWRIGHT_CHANNEL`.

Para volver a conectar el repositorio hace falta la URL del remoto correcto; no se ha inventado una ni se ha realizado ningún push.

## Resultado de verificación de esta recuperación

- Compilación de producción completada, incluida la comprobación de TypeScript.
- 7 pruebas unitarias y de la ruta de estudio aprobadas.
- 4 pruebas de navegador aprobadas; capturas revisadas en escritorio (1440 px) y móvil (390 px).
- `git fsck --no-reflogs` sin errores y `git diff --check` sin errores de espacios.
- La instalación de dependencias informó 0 vulnerabilidades en su auditoría.

La conexión con MongoDB y la cuenta afectada en producción no se probaron porque no se recuperaron las credenciales.
