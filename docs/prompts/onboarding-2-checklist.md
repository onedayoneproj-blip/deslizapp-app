> **Ajuste vigente de Lewis, 10 oct 2026:** continuar PR #96 desde su HEAD remoto, abierto sin merge. La presentación histórica de siete rayas, carrusel y Hecho se sustituye por capítulos 2–4 y filas compactas según docs/17. La creación es capítulo 1 con cuatro pasos; sus formularios y lógica quedan iguales. «Ocultar guía» explicita el cierre definitivo. Los contratos, permisos y acciones de este prompt se conservan. No usar sesiones antiguas ni mensajes automáticos: devolver el handoff en la sesión actual para que Lewis lo pegue en Planning. Un solo push por ronda, sin Supabase ni datos reales.

# Onboarding, parte 2: el checklist «Deja tu tienda lista» en Inicio

> Encargo inicial conservado como antecedente. PR #96 ya está abierto; no crear otra rama ni repetir esta entrega. Para continuar, usar [el encargo vigente de minimización y capítulos](onboarding-2-minimizar-y-capitulos.md) y docs/17-onboarding.md. Sus reglas sustituyen barras proporcionales, cierre manual definitivo, animaciones antiguas y avisos a sesiones antiguas. Lewis pasa manualmente el encargo; no hay merge autorizado.

El PR #95 (parte 1 y 1b) ya está en `main`. PR nuevo, rama nueva desde `main` actualizado.

Planning te enviará ajustes de Lewis para este PR; trátalo como encargo suyo y ejecútalos.

Lee antes: `docs/00-contexto-del-proyecto.md`, `AGENTS.md` (Next cambia cosas: lee `node_modules/next/dist/docs/`), **`docs/17-onboarding.md`** (especificación; la tabla de los 7 pasos es la fuente), `referencias/onboarding/LEEME.md` y las capturas **23 y 24** (`referencias/onboarding/pantallas/`: Inicio con el checklist y con «Publica tu catálogo» desbloqueado; son las de «Pide tu catálogo», pero el paso ahora es **publicar** y no tiene requisitos, ver docs/17 «Fallos del lienzo corregidos»), `docs/08-movimiento.md`, `docs/09-sistema-de-diseno.md`, `docs/10-marca-ilustracion-y-fondos.md`, `docs/11-voz-y-frases.md`, `HANDOFF.md`, `components/inicio/vista-inicio.tsx`, `lib/onboarding.ts` (parte 1), `components/marca-tienda/hoja-mi-marca.tsx`, la hoja de publicar (`PRODUCTOS_SUGERIDOS_PARA_PUBLICAR = 5`), `lib/config.ts` y la migración `supabase/migrations/20261009232614_onboarding_historias_y_datos.sql` (`tiendas.onboarding`, `marcar_onboarding`).

## Presentación original · antecedente (sustituida por docs/17)
La tarjeta **«Deja tu tienda lista · N de 7»** arriba de Inicio, con barra de 7 segmentos, el saludo («Buenos días, {nombre}.» según la hora) y las tarjetas de los pasos como en las capturas (las pendientes más grandes arriba; las hechas se pliegan abajo con «Hecho»).

| # | Paso | Hecho cuando | Acción |
|---|---|---|---|
| 1 | Sube tu logo | `logo_url` no es null | abre la subida de logo que ya existe (Mi marca) |
| 2 | Elige tus colores | `onboarding.colores_elegidos_en` | abre «Mi marca» en colores; al guardar colores, `marcar_onboarding('colores_elegidos_en')` |
| 3 | Agrega 5 productos | 5 o más productos visibles; muestra «N de 5» | abre crear producto. Guía, **no bloquea nada** |
| 4 | **Publica tu catálogo** | `catalogo_estado = 'publicado'` | **disponible desde el primer día**; abre la hoja de publicar (la confirmación suave con menos de 5 ya existe). Junto está «Ver cómo queda» |
| 5 | Cuéntales quién eres | `descripcion` no vacía | hoja corta: una línea de descripción (máx. 160, ya hay check) y el Instagram (se valida como en la base, `^[A-Za-z0-9._]{1,30}$`) |
| 6 | Pon Deslizapp en tu pantalla | abierta como app (`display-mode: standalone` / `navigator.standalone`) o `onboarding.pantalla_inicio_en` | «Cómo se hace»: hoja con los pasos de iPhone (Compartir → «Añadir a pantalla de inicio») y Android (menú → «Instalar»), con botón «Ya lo hice» que marca `pantalla_inicio_en` |
| 7 | Invita a tu equipo | hay otro miembro o invitación pendiente, o `onboarding.equipo_omitido_en` | abre «Tu equipo»; con «Lo hago sola» marca `equipo_omitido_en` |

- **Quién lo ve:** solo el dueño (`soy_dueno`), nunca colaboradores ni «Ver como». Solo si `onboarding.checklist_cerrado_en` es null. Las tiendas actuales (Michel…) no lo ven (la migración ya las marcó). Tienda de ensayo y Soft Era sí.
- **Cierre:** al llegar a 7 de 7 sale una celebración corta («Tu tienda está lista. Lo que sigue lo escriben tus clientes.» o similar con la voz de la marca) y `marcar_onboarding('checklist_cerrado_en')`; no vuelve. Opcional: una «X» discreta para ocultarlo (con confirmación corta) que también marca el cierre.
- **Estado:** los pasos 1, 3, 4, 5 y 7 se calculan de datos reales de la tienda (se actualizan al volver a Inicio, como el resto); 2, 6 y 7 usan `onboarding`. Una sola lectura, sin parpadeo; con error muestra el resto de Inicio normal.
- **Demo:** el checklist funciona en modo demo sin tocar nada real.
- **Voz:** los textos de las capturas, en español dominicano, sin tecnicismos. Nada de «catálogo se arma con tu equipo».

## Reglas
- Componentes de `components/ui/`; nada del HTML de la referencia. No quites el difuminado progresivo de cabeceras y barras.
- Movimiento sobrio: entrada escalonada de las tarjetas, la barra que se llena con un rebote corto, el paso que se completa con un pequeño «pop». Respeta movimiento reducido. Nada de patrones detrás de números ni listas (docs/10); la celebración final sí puede llevar un sticker de `public/stickers/marca/`.
- La tarjeta debe verse bien con 0, 3 y 7 pasos hechos y con la tienda sin logo ni productos (tienda recién creada).

## Pruebas y cierre
Unitarias del cálculo de pasos (cada condición, el dueño vs colaborador, `checklist_cerrado_en`), y un `probar:onboarding` ampliado (390 y 360 px, movimiento reducido). Capturas en `docs/capturas/onboarding-2/`. Sin migración: si crees que hace falta una, avisa a Planning antes. Un solo push por ronda. PR abierto, «Revisión» en verde, preview lista; devuelve el handoff aquí para Planning; no uses identificadores de sesiones anteriores ni prometas mensajes automáticos. No mergees.
