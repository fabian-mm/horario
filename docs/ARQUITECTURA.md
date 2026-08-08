# Arquitectura

## Flujo

```text
app/page.tsx
  -> MissionPlanner
      -> useAuth -> /api/auth/* -> users
      -> useMissions -> /api/missions* -> missions
      -> AuthScreen | calendario | WorldMissions
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

`useMissions` aplica cambios de forma optimista y después los guarda. Si MongoDB rechaza la operación, restaura el estado anterior y presenta un aviso.

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
| `/api/health` | GET | Comprobar conexión con MongoDB |
