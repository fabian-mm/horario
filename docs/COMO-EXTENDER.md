# Cómo extender la aplicación

## Añadir un campo a las misiones

1. Añade el campo opcional al tipo `Mission` en `lib/missions.ts`.
2. Incluye un valor inicial en `emptyForm` de `components/mission-form.tsx`.
3. Añade el control correspondiente al formulario.
4. Muestra el dato donde sea útil, evitando duplicar el estado.
5. Ejecuta `npm run build`.

Los campos opcionales mantienen compatibles los datos guardados anteriormente.

## Añadir un nuevo estado

1. Amplía `MissionStatus`.
2. Añade su etiqueta en `statusMeta`.
3. Incorpora el control en `MissionForm` y `WorldMissions`.
4. Añade el color en `app/globals.css`.

## Añadir una vista al menú

1. Amplía el tipo `View` de `MissionPlanner`.
2. Añade el botón de navegación.
3. Crea un componente independiente en `components/`.
4. Pasa únicamente los datos y callbacks necesarios.

## Sustituir almacenamiento local

La interfaz consume datos a través de `useMissions` y `useProfiles`. Para conectar una API:

1. Crea un módulo `lib/repositories/mission-repository.ts`.
2. Define operaciones para listar, guardar, actualizar estado y eliminar.
3. Haz que `useMissions` utilice ese repositorio.
4. Conserva las firmas actuales (`upsert`, `toggle`, `setStatus`, `remove`) para evitar cambios en los componentes.
5. Añade estados de carga, error y sincronización.

## Reglas de mantenimiento

- Mantener cálculos y formatos en `lib/`.
- Mantener persistencia y efectos en `hooks/`.
- Mantener componentes pequeños y enfocados en presentación.
- Evitar que un componente escriba directamente en `localStorage`.
- Comprobar escritorio y un ancho móvil de aproximadamente 390 px.
- Ejecutar `npm run build` y `npm audit` antes de publicar.

