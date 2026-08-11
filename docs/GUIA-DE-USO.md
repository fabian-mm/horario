# Guía de uso

## Primer inicio

La aplicación comienza sin perfiles y sin misiones. Selecciona **Crear cuenta** e introduce:

1. Tu nombre.
2. Tu correo electrónico.
3. Una contraseña de al menos ocho caracteres, con una letra y un número.

El correo identifica la cuenta. Después del registro se abre una bitácora vacía. Para usar la misma información en otro dispositivo, abre la aplicación allí e inicia sesión con el mismo correo y contraseña.

## Cuenta

Pulsa tu nombre o **Ajustes** en el menú lateral para:

- cambiar el nombre visible;
- cambiar la descripción académica;
- consultar el correo de la cuenta;
- elegir el tema de color de la aventura;
- cerrar sesión.

Cerrar sesión no elimina información: todo permanece en MongoDB.

## Temas de color

Abre **Ajustes** y selecciona una apariencia en **Tema de la aventura**. Hay cinco opciones: Bosque Esmeralda, Reino Rosa, Océano Abisal, Arcano Violeta y Forja Carmesí. El cambio se aplica de inmediato y se conserva en ese navegador, incluso al cerrar sesión o recargar la página.

El tema es una preferencia visual local: no modifica las misiones ni las notas guardadas en MongoDB. Por eso puedes usar un tema distinto en cada dispositivo.

## Misiones

Pulsa **Nueva misión** y registra nombre, materia, fecha, hora, importancia, estado, nota, porcentaje y observaciones. En computador también puedes hacer doble clic sobre un día.

La hora puede escribirse directamente con el teclado. Se aceptan formatos como `08:30`, `0830` y `8 pm`; al terminar, la aplicación los convierte al formato de 24 horas. También puedes usar los botones **−15** y **+15**, o las flechas arriba/abajo del teclado. Mantén `Shift` al usar las flechas para cambiar una hora completa.

En el mapa principal, seleccionar un día actualiza su agenda. En **Misiones de Mundo**, seleccionar una materia abre su diario y permite cambiar estados rápidamente.

## Catálogo de materias

Abre **Mis materias** desde el menú lateral para crear y administrar el catálogo global de tu cuenta. Después de registrar una materia, aparecerá como opción al crear una misión normal o una clase semanal; ya no es necesario volver a escribir el nombre.

Si ya tenías misiones o clases, la aplicación incorpora automáticamente sus materias al catálogo sin borrar información. Al renombrar una materia, el nuevo nombre se aplica en el calendario, Misiones de Mundo, el mapa, el horario y los promedios. Una materia que esté en uso no puede eliminarse hasta cambiar las misiones y clases asociadas.

## Mapa de campaña

Abre **Mapa de campaña** desde el menú lateral para ver las misiones como una ruta cronológica e irregular de destinos. Cada esfera muestra únicamente la fecha. Pasa el cursor por encima —o enfócala con el teclado— para ver la materia, el objetivo, su estado, horario o progreso y la recompensa de XP.

Selecciona cualquier destino para abrir su pergamino de información. Allí puedes consultar recompensa, fecha, hora, impacto, nota y observaciones, cambiar el estado de la misión o abrir su ficha completa. El buscador también filtra los destinos visibles del mapa.

## Horario semanal y actividades recurrentes

Abre **Misiones semanales** desde el menú lateral y crea una rutina, por ejemplo **Horario del semestre**. Elige desde qué fecha empieza a repetirse y, si lo deseas, una fecha final.

Dentro del horario semanal, pulsa el botón **+** de un día para añadir una actividad. Puede ser una clase, una sesión de estudio, un proyecto, ejercicio, una rutina personal o cualquier tipo creado por ti. Las clases solicitan una materia global; las demás actividades no la requieren.

Pulsa **Tipos y XP** para administrar las opciones disponibles. La aplicación incluye cinco tipos iniciales que puedes renombrar, cambiar entre **Clase** y **Actividad general**, recolorear y asignarles entre 0 y 500 XP. También puedes crear tipos nuevos. Un tipo en uso no se puede eliminar hasta cambiar las actividades asociadas.

Las horas de comienzo y final usan el mismo control accesible. Si la hora final no es posterior a la inicial, verás el aviso junto al campo y el formulario no se guardará hasta corregirla. En móvil aparecen en filas separadas para que los controles conserven un tamaño cómodo.

Una rutina activa proyecta automáticamente sus actividades sobre todas las fechas correspondientes del calendario principal. Cada aparición se completa por separado desde la agenda del día: así, marcar la actividad de hoy no completa las semanas futuras. Al completarla recibes los puntos definidos por su tipo. Puedes volver a marcarla como pendiente o pausar toda la rutina sin borrarla.

## Alertas y recordatorios

Pulsa **Activar alertas** en la barra superior y acepta el permiso del navegador. La aplicación enviará inmediatamente una alerta de prueba; después el botón cambiará a **Probar alerta** para que puedas comprobar el canal cuando quieras.

Los avisos de las actividades del horario semanal se preparan 20 minutos antes y muestran la hora en formato AM/PM. La programación se actualiza al volver a la aplicación, recuperar el foco y cada 15 minutos mientras continúa ejecutándose.

Requisitos y comprobaciones:

- En producción la aplicación debe abrirse mediante HTTPS, como ocurre normalmente en Vercel.
- Si el permiso aparece bloqueado, actívalo desde la configuración del sitio y revisa que el sistema no tenga habilitado **No molestar**.
- En iPhone o iPad, añade la página a la pantalla de inicio, ábrela desde su icono y concede el permiso desde allí.
- Esta versión puede mostrar alertas desde una pestaña abierta o suspendida por poco tiempo. Si el navegador cierra completamente la aplicación, no puede garantizar el aviso exacto: para eso se necesita Web Push enviado por un proceso permanente del servidor.

## Logros y felicitaciones

Al completar misiones y actividades recurrentes acumulas la misma XP global. Al cruzar los hitos de **100, 250, 500, 1000, 2000 y 5000 XP** aparece una felicitación especial con un nuevo título. La tarjeta de rango del menú lateral muestra cuál es el siguiente logro y cuántos puntos llevas.

## Progreso RPG

Las misiones otorgan experiencia cuando quedan en estado **Cumplida**:

- misión normal: 25 XP;
- misión importante: 50 XP;
- jefe final: 100 XP.

Cada 250 XP se sube un nivel. El HUD superior muestra el nivel de forma compacta y la tarjeta del menú lateral muestra el rango, la experiencia acumulada y cuánto falta para el siguiente nivel. Si una misión vuelve a pendiente o entregada, su experiencia deja de contar hasta que vuelva a cumplirse.

## Centro de mando

Sobre el calendario aparece el siguiente objetivo de la campaña, con su materia, fecha, importancia, recompensa y urgencia. Pulsa **Abrir objetivo** para ir directamente a sus detalles.

Los cuatro indicadores de campaña también son filtros: permiten mostrar misiones activas, victorias, jefes finales o todas las misiones. Al cumplir una tarea se actualizan inmediatamente el progreso, la XP, la racha y las reliquias; además aparece una celebración visual. Los jefes finales tienen un efecto de victoria especial.

## Promedio

Solo participan tareas que tengan nota y porcentaje:

```text
Promedio = suma(nota × porcentaje) / suma(porcentajes con nota)
```

La cobertura indica qué porcentaje de la materia ya fue evaluado.

## Estados de guardado

Los cambios aparecen inmediatamente y se envían a MongoDB en segundo plano. Si la conexión falla, la aplicación muestra **Sin guardar** y revierte el cambio para no presentar datos falsamente sincronizados.
