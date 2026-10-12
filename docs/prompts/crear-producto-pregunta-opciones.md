# Crear producto: «¿Viene en varias opciones?» en el paso del precio

Encargo de Planning, 12 oct 2026. Tu puesto es **Coding**. **Lánzalo después de fusionar #119** (foto en el recuadro y hoja sin scroll): parte de `main` ya actualizado.

## Problema (Lewis)
En el paso del precio, al escribirlo aparece una pastilla suelta, «Tiene tallas o colores» (`historia-producto.tsx`, `data-chip-presentaciones`, ~línea 573). Pasa desapercibida: quien vende con tallas o colores no la ve y publica un producto con un solo stock.

## Decisión de Lewis
Sin paso nuevo. En el **mismo paso del precio**, debajo del campo y cuando ya hay precio (nada antes de tiempo, como hoy), aparece una **pregunta con sus pastillas**:

> **¿Viene en varias opciones?**
> [ Tallas ] [ Colores ] [ Otra ]

- **Título de la pregunta** en tamaño de subtítulo de sección (no los 26 px del título del paso), con aire suficiente para leerse como pregunta propia. Copy aprobado: «¿Viene en varias opciones?»; si en `docs/11-voz-y-frases.md` encaja mejor otra forma, propónla en el PR sin cambiarla.
- **Pastillas = lo típico del catálogo**: las mismas que hoy salen primero en «¿En qué cambia?» (`OPCIONES_TIPICAS[tipo]` / `listaDeCosas`, máximo 2 típicas) + «Otra». Ropa: «Tallas», «Colores»; perfumes u otros catálogos: lo que ya diga esa lista (p. ej. «Tamaño»). Usa el componente de elección de la historia (`Eleccion`/`Chip`) en su estado sin elegir.
- **Tocar una pastilla** abre las presentaciones como hoy (`abrirVariantes`: siete barras en el mismo toque e `irA("cambia")`), pero con **solo esa cosa ya marcada** en «¿En qué cambia?» (hoy marca las típicas por defecto). «Otra» abre «¿En qué cambia?» sin nada marcado y con el campo de «+ Otra» listo.
- **No tocar nada** y «Seguir» → «¿Cuántos tienes?», igual que hoy. La pregunta no bloquea.
- **Con presentaciones ya elegidas** (al volver con «‹»): en lugar de las pastillas, una fila resumen «Tallas · Colores» con «Cambiar» (lo que hoy hace la pastilla con `hecho`), y el precio sigue mostrando «Varía por presentación · desde RD$…» cuando aplica.
- Se quita la pastilla suelta «Tiene tallas o colores».
- Respeta lo de #119: el paso del precio no debe hacer scroll a 390×844 con la pregunta visible (safe 59/34). Si no cabe, dime cuánto falta y no lo fuerces.
- Editar producto no cambia.

## Pruebas
Tipos, lint, `npm test`, build; `probar-crear-producto` (360/390/430, 360×640, movimiento reducido): la pregunta no aparece sin precio; con precio, aparece con las típicas del catálogo; tocar «Tallas» lleva a «¿En qué cambia?» con solo Tallas marcada y 7 barras; «Otra» sin nada marcado; «Seguir» sin tocar va a «¿Cuántos tienes?»; volver con «‹» muestra el resumen con «Cambiar»; sin scroll a 390×844. `probar-presentaciones`. Capturas 390×844 (ropa y otro catálogo, antes y después de escribir el precio, y con presentaciones elegidas) en `docs/capturas/crear-producto/pregunta-opciones/`. `docs/04-pantallas.md` al día. `lib/novedades.ts`: 1 línea corta.

## Entrega
PR contra `main` sin fusionar; Planning revisa y Lewis prueba en su iPhone. Avisa a Planning (`@parent`) con PR, HEAD, pruebas y lo no probado.
