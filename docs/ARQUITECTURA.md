# Arquitectura y funcionamiento

## Tecnologías

- Next.js 16 con App Router.
- React 19 y TypeScript estricto.
- CSS global con puntos de quiebre adaptables.
- Lucide React para iconos.
- `localStorage` para persistencia local.

La página se prerenderiza, pero el planificador es un componente cliente porque necesita interacción y acceso al almacenamiento del navegador.

## Flujo general

```text
app/page.tsx
  -> MissionPlanner
      -> useProfiles
      -> useMissions(perfilActivo)
      -> calendario y agenda
      -> WorldMissions
      -> MissionForm
      -> ProfileManager
```

## Responsabilidades

### `components/mission-planner.tsx`

Orquesta la navegación, el mes visible, el día seleccionado, los filtros y los modales. No contiene la lógica de persistencia.

### `components/world-missions.tsx`

Agrupa misiones por materia, ordena tareas, muestra estados y consume el cálculo ponderado.

### `components/mission-form.tsx`

Formulario compartido para crear y editar una misión. Mantener un único formulario evita diferencias entre calendario y Misiones de Mundo.

### `components/profile-manager.tsx`

Administra los perfiles existentes en el dispositivo. No implementa autenticación remota.

### `hooks/use-profiles.ts`

Carga, crea, actualiza y selecciona perfiles locales.

### `hooks/use-missions.ts`

Expone las operaciones de misiones y persiste los cambios usando el identificador del perfil activo. Esta separación es el punto natural para sustituir `localStorage` por una API.

### `lib/missions.ts`

Contiene tipos, metadatos, fechas y `calculateSubjectAverage`. Los cálculos puros viven fuera de React para facilitar pruebas y reutilización.

### `lib/profiles.ts`

Define el modelo del perfil local, el perfil inicial y la generación de iniciales.

## Modelo de misión

```ts
type Mission = {
  id: string;
  title: string;
  subject: string;
  date: string;
  time: string;
  priority: "normal" | "important" | "boss";
  status?: "pending" | "submitted" | "completed";
  completed: boolean;
  notes?: string;
  grade?: string;
  weight?: number;
};
```

`completed` se conserva por compatibilidad con los primeros datos. `status` es la fuente más expresiva para la interfaz.

## Diseño adaptable

- Más de 1120 px: calendario y agenda en dos columnas.
- Entre 661 y 1120 px: agenda debajo del calendario.
- Hasta 660 px: calendario reducido, controles táctiles y formularios en una columna.
- Hasta 920 px: navegación lateral convertida en panel móvil.

