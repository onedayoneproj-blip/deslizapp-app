# Retoque opcional al subir la foto (rama `feat/retoque-al-subir`)

> **Modelo:** en Claude Code, Sonnet 5.5; en Codex, el modelo principal con razonamiento medio. Sin migración nueva (usa `pedir_retoque`, que ya existe). Cuando todo pase, **fusiona (squash) a `main`**; si cambias cómo se reservan o cobran créditos, deja el PR abierto con preview (regla de `docs/00`).

## 0. Antes de empezar

Lee `docs/00-contexto-del-proyecto.md`, `AGENTS.md`, `HANDOFF.md`, `docs/11-voz-y-frases.md`, `docs/09-sistema-de-diseno.md` y `docs/prompts/retoque-beta-y-tienda-de-ensayo.md` (ya está en main). Tu puesto es **Coding**. Mira `components/catalogo/ficha-medios.tsx`, `taller.ts`, `hoja-producto.tsx` y la RPC `pedir_retoque` antes de tocar nada; no adivines.

## 1. Qué pasa hoy y qué se quiere

Hoy el retoque ya es opcional, pero solo se puede pedir **después**: la foto debe estar guardada en el producto («Guarda el producto para mandarla al taller») y entonces se abre la miniatura y se toca «Retocar». Eso se siente como si el retoque fuera obligatorio y escondido.

Se quiere que la tienda decida **al subir la foto**, en la misma ficha: un interruptor «Retocar esta foto» que viene **apagado**. Si lo deja apagado, la foto sale tal cual. Si lo enciende, al guardar el producto la foto va al taller.

## 2. Qué construir

- En la hoja de cada foto nueva (la miniatura, `ficha-medios.tsx`), un interruptor «Retocar esta foto», con la etiqueta «Beta» y el costo («5 créditos», de `CREDITOS_POR_RETOQUE`, no un número escrito a mano). Apagado por defecto, también en productos nuevos.
- Solo en fotos (no en videos) y solo en fotos sin retocar ni en el taller. Una foto ya guardada conserva su botón «Retocar» actual; no se duplica.
- Encendido es solo una intención en el borrador. **No reserva créditos ni llama a nada hasta guardar.** Al guardar el producto con éxito, por cada foto marcada se llama a `pedir_retoque` con la URL ya guardada (reutiliza `taller.pedir`). Si se cierra la ficha sin guardar, no pasa nada.
- Créditos: el interruptor se deshabilita con el motivo de siempre cuando `taller.libres` no alcanza para las fotos marcadas (cuenta todas las marcadas, no una a una). El texto sigue la voz de `docs/11`, corto, sin tecnicismos.
- Si el producto se guardó pero un pedido de retoque falla (sin conexión, créditos insuficientes por carrera), **el producto queda guardado** y se avisa con un toast y la foto queda con su botón «Retocar» normal. Nunca se pierde el producto por el retoque.
- Después de guardar, la foto aparece «En el taller» como ya lo hace hoy.
- Solo mirar y Ver como: el interruptor sale deshabilitado con «Solo mirar: aquí no se manda nada al taller.».
- Si ya está mergeado Mi marca y la marca no está lista, el interruptor se apaga y deshabilitado con el texto y el enlace a «Mi marca» que defina ese prompt (reutiliza su compuerta, no la repitas). Si Mi marca aún no existe, omite esto y déjalo anotado en el resumen.
- Demo y base real se comportan igual.

## 3. Lo que no se toca

El taller del admin, las RPC, los créditos y su cobro «reserva al pedir, cobra al entregar». El parámetro `retocar` de `guardarProductoConInventario` y su cobro directo de 5 créditos quedan como están: dime en el resumen si algún flujo de la interfaz aún lo manda en `true` (no debería).

## 4. Pruebas y cierre

- Demo y tienda de ensayo: subir producto con el interruptor apagado (sin cambios en créditos); con él encendido en una foto (pasa al taller al guardar, reserva 5); en dos fotos (reserva 10); sin créditos suficientes (interruptor deshabilitado); fallo simulado del pedido (producto guardado y aviso); foto de video (sin interruptor); cerrar sin guardar (nada se pide).
- `tsc`, tests, lint y build sin errores nuevos; scripts de regresión de la ficha. Revisa que se vea bien con teclado y lector (el interruptor con `role="switch"` y nombre claro) y en 390 px.
- Resume en español, corto: qué cambió y qué debe mirar Lewis.
