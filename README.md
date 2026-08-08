# Bitácora del Navegante

Planificador académico local con temática de mapa del tesoro. Convierte parciales, trabajos y tareas en misiones, permite agruparlas por materia, calcular promedios ponderados y mantener perfiles separados en un mismo dispositivo.

## Inicio rápido

Requisitos: Node.js 20 o superior y npm.

```bash
npm install
npm run dev
```

Abre `http://localhost:3000`.

Para comprobar la versión de producción:

```bash
npm run build
npm start
```

## Funciones actuales

- Calendario mensual y agenda diaria compacta.
- Misiones normales, importantes y jefes finales.
- Estados: pendiente, entregada y cumplida.
- Misiones de Mundo agrupadas por materia.
- Nota, porcentaje de impacto y promedio ponderado.
- Perfiles locales separados dentro del mismo navegador.
- Diseño adaptable a escritorio, tableta y celular.
- Persistencia automática sin servidor mediante `localStorage`.

## ¿Dónde se guardan los datos?

Los datos se guardan en el navegador del dispositivo. No salen a Internet y no necesitan una cuenta. Cada perfil posee una clave de misiones independiente.

Esto significa que los datos:

- permanecen al cerrar la aplicación;
- no se sincronizan automáticamente con otro móvil o computador;
- dependen del navegador utilizado;
- pueden perderse si se borran los datos del sitio.

Consulta [Datos y perfiles](docs/DATOS-Y-PERFILES.md) para conocer las claves utilizadas y el camino recomendado para añadir sincronización.

## Documentación

- [Guía de uso](docs/GUIA-DE-USO.md)
- [Arquitectura y funcionamiento](docs/ARQUITECTURA.md)
- [Datos, perfiles y futura sincronización](docs/DATOS-Y-PERFILES.md)
- [Cómo extender la aplicación](docs/COMO-EXTENDER.md)

## Estructura principal

```text
app/                 Rutas, layout y estilos globales
components/          Interfaz reutilizable
hooks/               Estado y persistencia local
lib/                 Tipos, cálculos y utilidades
docs/                Documentación funcional y técnica
```

## Comandos

| Comando | Uso |
| --- | --- |
| `npm run dev` | Desarrollo local |
| `npm run build` | Compilación y validación de TypeScript |
| `npm start` | Ejecutar la compilación de producción |
| `npm audit` | Revisar vulnerabilidades de dependencias |

