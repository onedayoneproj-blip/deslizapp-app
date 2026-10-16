# Página pública de planes y planes nuevos en la base

Encargo de Planning, 16 oct 2026. **Borrador: faltan respuestas de Lewis sobre el Círculo Deslizapp (al final). No lanzar todavía.** Tu puesto es **Coding**.

**Diseño aprobado:** opción A del lienzo [Planes de Deslizapp · página](https://claude.ai/artifact/HLYkbe8yyF8Z8qfA2Sn75o), con el estilo de la página principal. Se copia a `referencias/planes/` antes de lanzar. **No copies su HTML.**

**Precios y reglas:** `docs/14-precios-y-lanzamiento.md` (cuadro del 16 oct) y `referencias/planes/estrategia-y-validacion-oct-2026.pdf`.

## 1. Planes en la base
Migración nueva, siguiendo las reglas de `AGENTS.md`. Pregunta a Planning antes de aplicarla.
- **Añade límites a `planes`:**
  - `limite_tiendas` y `limite_personas` (null = sin límite);
  - `precio_anual`;
  - un orden;
  - una descripción corta («Ideal para…»).
  - Si ya existen columnas parecidas por `suscripciones-y-varias-tiendas.md`, reutilízalas.
- **Crea los tres planes:**

  | Plan | Al mes | Al año | Productos publicados | Tiendas | Personas |
  |---|---|---|---|---|---|
  | `inicial` | RD$499 | RD$4,990 | 30 | 1 | 1 |
  | `negocio` (destacado) | RD$999 | RD$9,990 | 150 | 3 | 5 |
  | `pro` | RD$1,499 | RD$14,990 | sin límite | sin límite | sin límite |

  Los créditos de retoque quedan como están hasta que Lewis los decida.
- **Planes viejos:** `p20`, `p60` y `p100` pasan a `se_ofrece = false`. No toques a ninguna tienda: hoy todas están en `custom`.
- **Solo cuentan los productos publicados y activos.** Comprueba que el cálculo de cupo ya lo hace así; si no, dilo antes de cambiarlo.

## 2. La página `/planes`
- Página pública con el diseño de la página principal (fondo bosque, fotos en columnas, Fredoka y Figtree). Reutiliza el componente compartido de la portada si sirve.
- **Precios desde la base:** se leen de `planes` (`se_ofrece = true`) en el servidor y se revalidan. Nada de precios escritos en el código.
- **Selector Mensual / «Anual · 2 meses gratis».** En anual, además del precio, «Sale a RD$X al mes».
- **Cada tarjeta:** límites con ✓, «Ideal para…» y el botón «Probar 30 días gratis», que lleva a iniciar sesión con Google y al onboarding.
- **Prueba gratis:** 30 días para todos (decisión de Lewis del 16 oct). Revisa dónde dice 14 días (`prueba_hasta`, textos, `docs/14`) y propón el cambio a Planning; no lo cambies a ciegas.
- **«Todos los planes traen»:** catálogo que se desliza, pedidos por WhatsApp, panel de pedidos y existencias, y clientes con abonos y lo pendiente.
- **Fundadoras:** «30 % menos todo el primer año», con el aro del Círculo Deslizapp (§3) cuando esté definido.
- **Abajo:** los botones «Cómo funciona» y «Quiero vender», como en la página principal, y «Precios en pesos dominicanos».
- **Enlace a `/planes`:** desde la página principal (un enlace pequeño «Planes» en la cabecera) y desde el final de «Cómo funciona».

## 3. Círculo Deslizapp (pendiente de definir con Lewis)
Idea de Lewis: el **plan de fundadoras** se llama **Círculo Deslizapp** y usa el concepto de «Mejores amigos» de Instagram: un aro como el de esa función, pero con los colores de Deslizapp, que marca a las tiendas del círculo. **Beneficio confirmado: 30 % menos durante todo el primer año.** Antes de construirlo, Planning resuelve con Lewis las preguntas de `docs/14` («Círculo Deslizapp: preguntas abiertas»).

## Pruebas
- Tipos, lint, `npm test` y build.
- Un test de que la página muestra lo que hay en la base: cambiar un precio en la base de pruebas se refleja en la página.
- Capturas a 393 y 360 de mensual y anual.

## Entrega
PR contra `main`, sin fusionar (precios y dinero). Avisa a Planning antes de aplicar la migración, al abrir el PR y al terminar.
