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

Si el DNS del sistema rechaza los registros SRV de Atlas, `MONGODB_DNS_SERVERS` permite configurar resolvedores para el proceso de Node. Debe dejarse vacío cuando la infraestructura ya resuelve Atlas correctamente.

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
