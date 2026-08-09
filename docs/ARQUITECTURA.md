# Arquitectura

## Flujo

```text
app/page.tsx
  -> MissionPlanner
      -> useAuth -> /api/auth/* -> users
      -> useMissions -> /api/missions* -> missions
      -> useWeeklyQuests -> /api/weekly-quests* -> weeklyQuests
      -> AuthScreen | calendario | WorldMissions | AdventureMap | WeeklySchedule
      -> MissionForm
      -> AccountPanel
```

## Capas

- `components/`: interfaz y formularios.
- `hooks/`: estado cliente y comunicación con las rutas API.
- `lib/`: MongoDB, sesiones, validación, tipos y cálculos puros.
- `app/api/`: autenticación, autorización y acceso a datos.

Los componentes nunca reciben `MONGODB_URI` ni acceden directamente a MongoDB.

## Autenticación

`useAuth` consulta `/api/auth/session`. Al registrarse o entrar, el servidor firma una sesión y la coloca en una cookie `httpOnly`. JavaScript del navegador no puede leer esa cookie.

Cada ruta de datos ejecuta `getSessionUserId()`. Las rutas de misiones no aceptan un `userId` del navegador; lo derivan de la sesión.

## Persistencia rápida

`useMissions` y `useWeeklyQuests` aplican cambios de forma optimista y después los guardan. Si MongoDB rechaza la operación, restauran el estado anterior y presentan un aviso.

Una misión semanal contiene sus `dailyMissions`. `getScheduledOccurrences()` en `lib/schedule.ts` proyecta esas clases recurrentes sobre una fecha concreta; no crea copias diarias en MongoDB. Así, editar una clase actualiza todas sus apariciones futuras.

`lib/mongodb.ts` crea la conexión de forma diferida y reutiliza el `MongoClient`. El driver administra un pool de conexiones, evitando abrir una conexión nueva por tarea.

## Rutas

| Ruta | Método | Función |
| --- | --- | --- |
| `/api/auth/register` | POST | Crear usuario y sesión |
| `/api/auth/login` | POST | Verificar credenciales |
| `/api/auth/logout` | POST | Eliminar sesión |
| `/api/auth/session` | GET | Obtener usuario actual |
| `/api/account` | PUT | Actualizar cuenta |
| `/api/missions` | GET/POST | Listar o guardar misión propia |
| `/api/missions/[missionId]` | DELETE | Eliminar misión propia |
| `/api/weekly-quests` | GET/POST | Listar o guardar una misión semanal propia |
| `/api/weekly-quests/[weeklyQuestId]` | DELETE | Eliminar una misión semanal propia |
| `/api/health` | GET | Comprobar conexión con MongoDB |
