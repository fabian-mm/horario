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

En el mapa principal, seleccionar un día actualiza su agenda. En **Misiones de Mundo**, seleccionar una materia abre su diario y permite cambiar estados rápidamente.

## Mapa de campaña

Abre **Mapa de campaña** desde el menú lateral para ver las misiones como una ruta cronológica de destinos. Cada nodo muestra la fecha, la materia y la importancia; los jefes finales aparecen como fortalezas especiales.

Selecciona cualquier destino para abrir su pergamino de información. Allí puedes consultar recompensa, fecha, hora, impacto, nota y observaciones, cambiar el estado de la misión o abrir su ficha completa. El buscador también filtra los destinos visibles del mapa.

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
