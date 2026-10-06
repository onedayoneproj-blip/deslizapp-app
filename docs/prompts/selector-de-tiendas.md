# Selector de tiendas y cuenta en el panel real (rama `feat/selector-tiendas`)

> **Modelo:** en Claude Code, Sonnet 5.5; en Codex, el modelo principal con razonamiento medio. Sin migraciones: solo app. Cuando todo pase, **fusiona (squash) a `main`** según la regla de cierre de `docs/00`; deja el PR abierto solo si algo falla o decides algo que no estaba aquí.

## 0. Antes de empezar

Lee `docs/00-contexto-del-proyecto.md`, `AGENTS.md`, `HANDOFF.md`, `docs/05-arquitectura.md` (capa de datos y cambio de tienda), `docs/06-orden-de-construccion.md` (que cambiar de tienda no mezcle datos), `docs/08-movimiento.md`, `docs/09-sistema-de-diseno.md`, `docs/11-voz-y-frases.md`. Tu puesto es **Coding**.

Diseño aprobado: `referencias/selector-tiendas/` (`MenuPro`, `MenuBasico`, `Encabezado` A; `CrearTienda` es para otro PR). **Abre los `.dc.html` en un navegador.** No copies su HTML: se construye con `components/ui/` y los tokens del panel.

Mira antes: `components/panel/menu-tienda.tsx`, `components/panel/encabezado.tsx`, `components/panel/logo-tienda.tsx`, `components/panel/acceso-admin.tsx`, `lib/data/sesion.ts`, `lib/data/provider`, `lib/data/supabase.ts` (`getTiendas`, `cambiarTiendaActiva`) y `components/marca-tienda/hoja-mi-marca.tsx`.

## 1. Qué hay y qué falta

- La **base ya soporta varias tiendas por cuenta**: tabla `miembros` (quién entra a qué tienda y con qué rol), políticas por membresía, `mis_tiendas()` y `usuarios.tienda_id` como **tienda por defecto**, que la persona puede cambiar a cualquiera de las suyas (política `usuarios_elegir_tienda`). **No hace falta migración.**
- **Falta el selector en la app real.** Hoy solo la demo lista las tiendas; en la real el menú «Tu tienda» solo trae Mi marca, el acceso de admin y cerrar sesión. El panel real abre siempre la tienda por defecto.

## 2. El menú nuevo (la hoja que se abre al tocar el nombre de la tienda)

Título «Tus tiendas» si hay más de una, «Tu tienda» si hay una. De arriba abajo, como `MenuPro` y `MenuBasico`:

1. **La tienda activa**, en una tarjeta con contorno `accion`: logo (`LogoTienda`), nombre, «Plan · N créditos» y el check. **Dentro de la misma tarjeta, al pie, la fila «Mi marca»** (con chevron; abre `hoja-mi-marca`). **Esa fila ya no va suelta.** Su detalle: «Lista para el taller» en `exito-texto` o «Faltan N fotos de referencia» en `atencion-texto` si el PR de `docs/prompts/mi-marca.md` ya está en `main`; si no, un subtítulo corto sin estado («Logo, colores y letra»). No inventes la regla de «marca lista»: usa la función de ese PR cuando exista.
2. **Las otras tiendas**: una fila por tienda, con logo, nombre y «Plan · N créditos». Tocarla **cambia de tienda** (§3).
3. **«Administrar Deslizapp»** (`Acceso­Admin`), solo si es admin, como hoy (oculto en Ver como).
4. **La cuenta**, separada por una `linea`: foto de Google en círculo (44 px), nombre, correo y el botón compacto «Cerrar sesión» a la derecha. Sin foto: iniciales en `marca-rosa`, como `LogoTienda`. La foto, el nombre y el correo **se leen de la sesión** (los datos de Google del usuario autenticado; busca dónde los expone `lib/data/sesion.ts`) y **no se guardan en la base**. Carga la foto sin enviar el `Referer` (`referrerPolicy="no-referrer"`) y ten en cuenta la configuración de imágenes remotas de Next; si la foto falla, caen las iniciales.
5. Al pie, la versión y «Ver novedades», y Privacidad y Términos, como hoy.

- **El encabezado no cambia** (opción A: logo de la tienda, su nombre y el plan, y el botón de créditos). Ajusta su etiqueta accesible a «Menú de tus tiendas» si hay más de una.
- **No pongas «Crear otra tienda» en este PR.** Llega con el PR de grupos de tiendas; deja el menú listo para sumarle esa fila debajo de las tiendas.
- **Demo:** misma hoja con las tiendas de la demo y la cuenta como «Cuenta de demo» (iniciales) con «Salir de la demo»; la sección «Modo demo» y su laboratorio siguen abajo como hoy.
- **Ver como (`soloMirar`):** no se cambia de tienda; la tarjeta de la tienda se ve y el botón dice «Cerrar sesión y salir», como hoy. Las demás filas, apagadas con `data-solo-mirar-permitido` donde ya se use.

## 3. Cambiar de tienda en la app real

- La lista sale de **las tiendas de las que la cuenta es miembro** (no eliminadas), ordenadas con la activa primero y después por nombre. Si `getTiendas` hoy devuelve otra cosa, ajústalo sin abrir lectura de tiendas ajenas (las políticas por membresía ya filtran; comprueba que un admin fuera de Ver como no recibe todas las tiendas).
- **Elegir otra tienda** actualiza `usuarios.tienda_id` de la propia cuenta (la política ya lo permite; solo a una tienda propia) y recarga **todo** lo que depende de la tienda. **Lo primero es que nunca se vea un dato de la tienda anterior**: vacía la caché de consultas y los estados globales (hojas abiertas, filas de espera, borradores) de la tienda saliente; si lo más seguro es recargar la página completa, hazlo, sin esperar a ninguna animación. Muestra el aviso «Ahora estás en X.» y cierra el menú.
- Con un error (sin conexión, la política lo rechaza), la tienda sigue como estaba y el aviso lo dice sin disculpas largas.
- Una cuenta con **una sola tienda**: no hay lista; se ve su tarjeta con Mi marca y la cuenta debajo.
- Quien no tiene tienda (cuenta de Google sin fila en `usuarios`) sigue con la pantalla que ya existe; no cambies ese caso.

## 4. Reglas

- Voz y texto mínimo según `docs/09` y `docs/11`; los textos del diseño son la base.
- Movimiento solo el de las hojas (`docs/08`); nada que bloquee un toque; sin animar lo de la lista.
- Áreas de toque de 44 px, contraste AA, el estado «activa» no depende solo del color (check). Etiquetas accesibles completas («Mora Shoes, Pro, tienda activa»).
- No escribas el correo de nadie en ningún archivo del repo (los de prueba, inventados).

## 5. Pruebas y cierre

- Pruebas unitarias de la ordenación de las tiendas, del texto de cada estado de Mi marca y de que **cambiar de tienda no deja datos de la anterior** (con el laboratorio y la demo; la cuenta real de Lewis tiene dos tiendas: Esencias Michel y la «Tienda de ensayo», pero tú no tienes su sesión: **no pruebes con ella ni cambies su tienda por defecto**; dile que lo pruebe él).
- Demo con 3 tiendas: lista, cambio, aviso, Mi marca dentro de la tarjeta. Con 1 tienda. Ver como (sin cambio posible). Cuenta sin foto.
- `tsc`, tests, lint y build sin errores nuevos; regresiones del panel y del menú; `npm run revisar:migraciones` en cero (no debe haber cambios).
- Novedad en el panel con el siguiente número de versión (`lib/novedades.ts`), una frase en la voz de la marca.
- Actualiza `docs/04-pantallas.md` (el menú de la tienda) y la sección que cuente que el selector era solo de la demo.
- Resume en español, corto: qué cambió, qué debe probar Lewis con su cuenta (cambiar entre Michel y la ensayo) y cualquier decisión que tomaste.
