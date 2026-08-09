# Cómo extender el proyecto

## Añadir un campo a una misión

1. Amplía `Mission` en `lib/missions.ts`.
2. Amplía `missionSchema` en `lib/validation.ts`.
3. Añade el campo a `components/mission-form.tsx`.
4. Muestra el dato en el componente adecuado.
5. Ejecuta `npm run build`.

Los campos nuevos deben ser opcionales si deben admitir documentos antiguos.

## Cambiar la progresión RPG

La experiencia por prioridad, los 250 XP por nivel y los nombres de rango están centralizados en `lib/missions.ts`. Cambia esos valores allí para que el calendario, el diario por materias y el HUD sigan usando una única regla. Mantén `calculatePlayerProgress()` como función pura: facilita probar nuevas curvas de nivel sin tocar componentes visuales ni la base de datos.

## Añadir una operación de datos

1. Crea o amplía una ruta en `app/api/`.
2. Obtén siempre el usuario con `getSessionUserId()`.
3. Incluye `userId` en el filtro MongoDB.
4. Valida el cuerpo en servidor.
5. Devuelve solamente campos seguros.
6. Expón la operación desde el hook correspondiente.

## Ampliar el horario semanal

Para pedir una hora en un formulario, reutiliza `TimeField` de `components/time-field.tsx`. Entrega y recibe valores `HH:MM`; usa la propiedad `after` cuando un campo deba ser posterior a otro. Las conversiones y comparaciones comunes están disponibles en `lib/time.ts`.

Los tipos seleccionables se definen en `lib/activity-types.ts` y se persisten mediante `/api/activity-types`. Añadir otra propiedad global —por ejemplo un icono— requiere incorporarla a `ActivityType`, `activityTypeSchema`, el editor y la propagación del Route Handler. Mantén `activityTypeId` como identidad estable aunque el usuario cambie el nombre.

Las apariciones completadas viven en `DailyClassQuest.completedDates`; no crees un documento por cada semana. Para cambiar la puntuación global, modifica los tipos del usuario. Para añadir nuevos mensajes de progreso, amplía `xpMilestones` en `lib/missions.ts`.

Los tipos `WeeklyQuest`, `DailyClassQuest` y la proyección por fechas viven en `lib/schedule.ts`. La validación del servidor está en `weeklyQuestSchema`, la persistencia en `/api/weekly-quests` y el estado optimista en `useWeeklyQuests`. Mantén la recurrencia como cálculo: no generes un documento de MongoDB por cada día del semestre.

## Usar materias globales

Los formularios deben obtener sus opciones desde `useSubjects`; no vuelvas a introducir campos libres para nombres de materias. Guarda siempre `subjectId` junto con el nombre compatible y usa `resolveSubjectName()` para presentar datos antiguos. Si añades otra entidad que dependa de materias, incluye su migración y propagación de renombres en `/api/subjects`.

## Regla de autorización

Nunca aceptes `userId` desde parámetros, JSON o cabeceras del navegador para decidir el propietario. El ID válido proviene exclusivamente de la sesión verificada.

## Añadir sincronización avanzada

Si se necesita modo sin conexión, incorpora una cola local de operaciones con IDs idempotentes. La cola debe marcar datos como pendientes y reconciliarlos usando `updatedAt`; no debe afirmar que un cambio está guardado antes de recibir confirmación.

## Comprobaciones

- Registro con cuenta nueva.
- Inicio y cierre de sesión.
- Aislamiento entre dos cuentas.
- Creación, edición y eliminación de misiones.
- Creación, edición, pausa y eliminación de horarios y clases recurrentes.
- Escritorio y móvil de aproximadamente 390 px.
- `npm run build` y `npm audit`.
