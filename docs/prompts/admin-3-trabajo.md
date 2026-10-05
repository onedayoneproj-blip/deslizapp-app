# Admin, parte 3: Trabajo (catálogos y fotos) y Personalizar (rama `feature/admin-trabajo`)

> **Modelo:** en Codex, el más alto con razonamiento alto. En Claude Code, Opus 5.5. Toca el admin **y** el panel de las tiendas (retoque real).

## 0. Antes de empezar

Lee:
- `docs/00-contexto-del-proyecto.md`, `AGENTS.md` y `HANDOFF.md`. Tu puesto es **Coding**.
- `docs/13-admin.md` §3.4 a §3.6 y §7.
- `referencias/admin/LEEME.md` y los tableros `Trabajo`, `Fotos` y `Personalizar`. Son diseño aprobado: **no copies su HTML.**
- `docs/09-sistema-de-diseno.md`, `docs/11-voz-y-frases.md` y `docs/12-catalogo-conectado.md`.
- `docs/prompts/catalogo-react.md` §5: el tema, los mensajes y las secciones de `personalizacion`.
- `lib/catalogo-estado.ts` y la tarjeta del catálogo en línea del panel.
- `components/catalogo/ficha-medios.tsx` (dónde está hoy el retoque de demostración) y `lib/imagen.ts` (`reducirFoto`).
- Lo que dejaron las partes 1 y 2.

Rama `feature/admin-trabajo` desde `main`, con las partes 1 y 2 fusionadas. Si no lo están, parte de la última rama y dilo en el PR.

## 1. Trabajo › Catálogos

- Ruta `/admin/trabajo` con el segmento Catálogos · Fotos y su conteo.
- Grupos y botones del tablero `Trabajo`, con `admin_catalogo_avanzar`:
  - **Por empezar:** «Empezar».
  - **Armando:** «Pasar a {paso}», o «Mandar a revisar» en el paso 3.
  - **Pidió cambios:** la nota de la tienda, «Personalizar» y «Mandar a revisar».
  - **Esperando su sí:** «Recordarle», un WhatsApp de `lib/admin/mensajes.ts`.
- Cada tarjeta muestra hace cuánto está en ese estado (`catalogo_paso_en` o `catalogo_solicitado_en`).
- «Ver sus fotos» abre una hoja con las fotos de sus productos y deja descargarlas una por una o todas (zip en el navegador si cabe; si no, una por una).
- El botón de Hoy «Empezar» y «Seguir» llega aquí con la tienda resaltada.
- La tienda ve cada paso en su app sin cambios en el panel. Compruébalo.

## 2. Trabajo › Fotos y el retoque real

- **Admin:**
  - Agrupado por tienda, la más vieja primero.
  - Abrir una foto muestra antes y después.
  - «Bajar original».
  - «Subir la retocada», que pasa por `reducirFoto`, sube y deja el «después».
  - «Entregar», que llama a `admin_retoque_entregar` y pasa a la siguiente foto.
  - «Devolver», con una hoja de motivo corto y `admin_retoque_devolver`.
  - Créditos de la tienda a la vista. Un aviso si el saldo libre ya no alcanza (no debería pasar, porque se reservan).
- **Panel de la tienda** (`ficha-medios`):
  - «Retocar» llama a `pedir_retoque`. La miniatura muestra «En el taller» con su anillo y no deja pedirla otra vez.
  - Sin saldo libre: el botón se apaga con su motivo en una línea («Te faltan créditos para esta.»).
  - **Entregada:** la foto cambia sola al volver a leer el producto. Una tostada «Tu foto salió del taller.» la primera vez que la ve.
  - **Devuelta:** la miniatura muestra el motivo y «Subir otra».
  - `RETOQUE_REAL = true` y desaparece la etiqueta «Demo».
  - En modo demo, el admin demo puede entregar desde `/admin`, para probar el ciclo completo en un mismo navegador.
- La hoja «Tu plan» del panel explica el taller en una línea, con la voz de la marca.

## 3. Personalizar

- Ruta `/admin/tiendas/[id]/catalogo`, que se abre desde la ficha y desde «Pidió cambios».
- Vista previa de la cabecera arriba, con los colores, la letra y la cabecera actuales.
- **Marca:**
  - colores con selector y contraste comprobado (avisa si el texto no llega a AA);
  - letra de títulos de una lista corta (las de `lib/fuentes-marca.ts`);
  - cabecera de texto o SVG (solo el admin; valida que sea un SVG sin scripts).
- **Frases:** cada frase en una hoja con su contador. «Al agregar» es una lista de hasta 5.
- **Secciones:** interruptores (Chat, Búsqueda, Colecciones) y opiniones con 3 valores: encendida, «Pronto» o apagada.
- **Productos:**
  - orden arrastrando (con «Mover arriba» y «Mover abajo» como respaldo accesible);
  - opiniones por producto (usuario, fuente, enlace, texto, estrellas, traducida).
- Guardar con `admin_guardar_personalizacion`, que es un merge: no borra lo que no tocaste. «Ver como lo verá un cliente» abre `/tienda/{slug}`.

## 4. Comprobación

- `npm run lint`, `npm run build`, `npm test` y todos los `probar:*`, incluidos los del catálogo React y los de producto.
- **Script nuevo `scripts/probar-admin-trabajo.mjs`** (demo):
  1. Un catálogo pasa por empezar, los 3 pasos y «Mandar a revisar». La tarjeta de la tienda en su panel muestra cada paso. Un salto inválido no se ofrece.
  2. Ciclo de retoque: la tienda pide (el saldo libre baja), el admin entrega (la foto cambia en el producto y en el catálogo, se cobra) y otra se devuelve (no se cobra, la tienda ve el motivo).
  3. Personalizar: cambiar el botón de comprar, apagar Búsqueda y reordenar dos productos. `/tienda/{slug}?demo` lo refleja. Un color sin contraste avisa.
- **Real (Supabase):** prueba el retoque con una foto de un producto de prueba oculto, creado para eso y borrado al final. **No toques las fotos ni los créditos reales de Michel.** Si algo queda, dilo.
- **Capturas** en `docs/capturas/admin-trabajo/`.

## 5. Cierre

PR con:
- lo que cambió en el admin y en el panel;
- los resultados;
- las capturas;
- los pasos para Lewis:
  1. Pedir un retoque desde una tienda de prueba.
  2. Entregarlo desde el admin.
  3. Ver la foto nueva en el catálogo.

**Déjalo abierto, sin merge.** Actualiza «Dónde va el trabajo» en `docs/00-contexto-del-proyecto.md` y la novedad de la app en `lib/novedades.ts` (el retoque deja de ser demo).
