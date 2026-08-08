# Datos, perfiles y futura sincronización

## Estrategia actual: local primero

La aplicación identifica a cada persona mediante un UUID almacenado en el navegador. No es una identidad global ni una cuenta: representa un perfil dentro de ese dispositivo y navegador.

Claves de `localStorage`:

| Clave | Contenido |
| --- | --- |
| `bitacora-perfiles-v1` | Lista de perfiles locales |
| `bitacora-perfil-activo-v1` | ID del perfil seleccionado |
| `bitacora-misiones-v2:{profileId}` | Misiones de un perfil |
| `bitacora-misiones-v1` | Formato anterior, usado únicamente para migración |

La migración es automática: las misiones del formato anterior se cargan en el perfil original y después se guardan con la nueva clave.

## Ventajas

- Funciona sin conexión.
- No requiere servidor, correo ni contraseña.
- Es rápido y sencillo para una sola instalación.
- Varias personas pueden usar el mismo dispositivo manteniendo datos separados.

## Limitaciones

- Un perfil creado en un móvil no existe automáticamente en otro.
- Cambiar de navegador crea un almacenamiento diferente.
- Borrar los datos del sitio elimina los perfiles locales.
- No hay recuperación de contraseña ni copia en la nube.

## Evolución recomendada

Cuando sea necesaria la sincronización, la opción más directa es añadir autenticación y una base de datos administrada, por ejemplo Supabase.

Tablas sugeridas:

```text
profiles
  id, owner_id, name, subtitle, created_at

missions
  id, profile_id, title, subject, date, time,
  priority, status, notes, grade, weight, created_at, updated_at
```

Reglas esenciales:

1. Cada usuario autenticado solo puede consultar sus perfiles.
2. Cada misión debe pertenecer a un perfil autorizado.
3. Los cambios locales deben incluir `updated_at` para resolver sincronización.
4. La interfaz no debería llamar directamente al proveedor: conviene crear un repositorio de datos con operaciones `list`, `save` y `remove`.

## Alternativa intermedia

Antes de construir cuentas, se puede añadir exportación e importación de un archivo JSON. Esto permite copias de seguridad y traslado manual entre dispositivos manteniendo la aplicación completamente local.

