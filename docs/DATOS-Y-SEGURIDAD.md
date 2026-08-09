# Datos, seguridad y MongoDB

## Colecciones

### `users`

```text
id, name, email, passwordHash, subtitle, createdAt, updatedAt
```

El correo y el ID tienen índices únicos. La contraseña original nunca se almacena; solo se guarda su hash bcrypt.

### `missions`

```text
id, userId, title, subject, date, time, priority, status,
completed, notes, grade, weight, createdAt, updatedAt
```

Existe un índice único compuesto por `userId + id` y otro para ordenar por usuario, fecha y hora.

## Qué guarda el navegador

El navegador solo conserva la cookie de sesión protegida. Usuarios, misiones y notas se almacenan en MongoDB. Ya no se utiliza `localStorage` para datos académicos.

Si el DNS local de Windows rechaza los registros SRV de Atlas, `MONGODB_DNS_SERVERS` permite configurar resolvedores para el proceso de Node. Esta variable es solo para desarrollo local: no debe configurarse en Vercel, donde la aplicación utiliza el DNS de la plataforma.

## Si no permite crear una cuenta

Consulta `GET /api/health`. Un estado `unavailable` incluye una causa general:

- `authentication`: el usuario o la contraseña incluidos en `MONGODB_URI` no coinciden con un **Database User** de Atlas;
- `authorization`: el Database User no tiene permisos sobre la base indicada;
- `configuration`: la variable falta o tiene un formato inválido;
- `dns`: no se puede resolver la dirección SRV; revisa `MONGODB_DNS_SERVERS` y el host;
- `network`: revisa la lista de acceso de red del proyecto de Atlas;
- `tls`: Atlas rechazó la conexión segura;
- `unavailable`: fallo no clasificado de MongoDB.

Para `authentication`, restablece la contraseña del Database User en Atlas, copia nuevamente la cadena de conexión y sustituye solamente `MONGODB_URI` en `.env.local`. Si la contraseña contiene caracteres reservados como `@`, `:`, `/`, `?` o `#`, deben estar codificados para una URL. Reinicia Next.js después de cambiar variables de entorno. No publiques la cadena de conexión ni la contraseña en el repositorio o en un chat.

### Lista de comprobación para Vercel

1. Configura `MONGODB_URI`, `MONGODB_DB` y `SESSION_SECRET` para el entorno correcto, normalmente **Production** y también **Preview** si se prueba una URL de vista previa.
2. Elimina `MONGODB_DNS_SERVERS` de Vercel; solo resuelve un problema local de Windows.
3. En Atlas, el Database User debe tener al menos `readWrite` sobre la base indicada por `MONGODB_DB`.
4. En **Network Access**, permite la salida de Vercel. Los planes con IP estática pueden autorizar esas direcciones; en proyectos con salida dinámica se puede usar temporalmente `0.0.0.0/0`, manteniendo credenciales fuertes, o elegir una opción de red privada/estática.
5. Crea un despliegue nuevo después de cambiar variables. Vercel no modifica despliegues ya existentes.
6. Consulta `/api/health` en el dominio desplegado. La propiedad `issue` indica el siguiente punto a corregir sin revelar secretos.

## Controles implementados

- Validación de entradas con Zod en el servidor.
- Hash bcrypt con coste 12.
- Cookie `httpOnly`, `sameSite=lax` y `secure` en producción.
- JWT firmado con `SESSION_SECRET` y expiración de 30 días.
- Autorización por sesión en cada lectura, escritura y eliminación.
- Índice único para impedir correos duplicados.
- Proyección MongoDB para no devolver `passwordHash`.

## Pendientes antes de una publicación pública

- Verificación de correo.
- Recuperación y cambio de contraseña.
- Limitación de intentos de inicio de sesión.
- Protección CSRF adicional si se añaden integraciones entre dominios.
- Registro de auditoría y monitoreo.
- Política de privacidad y eliminación de cuenta.

Para una aplicación con usuarios reales en Internet, conviene evaluar una biblioteca de autenticación administrada antes de ampliar el sistema casero.
