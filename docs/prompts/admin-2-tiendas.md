# Admin, parte 2: Hoy, Tiendas, ficha y Ver como (rama `feature/admin-tiendas`)

> **Modelo:** en Codex, el más alto con razonamiento alto. En Claude Code, Opus 5.5.

## 0. Antes de empezar

Lee:
- `docs/00-contexto-del-proyecto.md`, `AGENTS.md` y `HANDOFF.md` (sobre todo las reglas de hojas, teclado y movimiento). Tu puesto es **Coding**.
- `docs/13-admin.md` §1 a §6 y §10.
- `referencias/admin/LEEME.md` y los tableros `Hoy`, `Tiendas`, `Tienda` y `VerComo` (capturas y `.dc.html`). Son el diseño aprobado: **no copies su HTML.**
- `docs/09-sistema-de-diseno.md` (en especial «Menos texto» y §16), `docs/08-movimiento.md` y `docs/11-voz-y-frases.md`.
- Lo que dejó la parte 1 (`docs/prompts/admin-1-base.md` y su PR): las funciones `admin_*`, la capa `lib/data/admin/` y el modo `soloMirar`.

Rama `feature/admin-tiendas` desde `main`, con la parte 1 ya fusionada. Si no lo está, parte de su rama y abre el PR contra ella, diciéndolo en el PR.

## 1. El armazón de `/admin`

- `app/admin/layout.tsx`:
  - Comprueba en el servidor que la sesión es de un admin (`soy_admin()`); si no, `notFound()`.
  - Sin `DataProvider` del panel: usa uno propio para la fuente admin.
  - En modo demo, cualquiera entra.
- Barra inferior de 5 pestañas (Hoy, Tiendas, Trabajo, Cobros, Más), con la misma cápsula y el mismo selector rosa de `components/panel/nav-inferior.tsx`.
  - Reutiliza ese componente si puede recibir otras pestañas.
  - Si no, súbelo a `components/ui/` con las pestañas como propiedad, y que el panel lo use igual que antes.
- Encabezado con «deslizapp», la etiqueta «admin» y el avatar del admin.
- **Trabajo, Cobros y Más:** pantallas con el título y un «Muy pronto» (docs/09 §10, «Función en preparación»). Se llenan en las partes 3 y 4.
- **Componentes:** usa `components/ui/`. Si falta uno, créalo según docs/09 §16.5, expórtalo, agrégalo a `/diseno` y descríbelo en docs/09. Seguramente faltan:
  - `TarjetaAsunto` (ícono por categoría, título, motivo, acción principal y secundaria);
  - `PuntoSalud`;
  - `Dato`, el número chico con su etiqueta de la ficha. Si ya existe algo equivalente (las tarjetas del Resumen), úsalo.

## 2. Hoy

- Datos de `admin_resumen_mes()` y `admin_hoy()`.
- Textos armados en el cliente desde `lib/admin/mensajes.ts`, con la voz de docs/11:
  - un título por regla, con el nombre de la tienda;
  - el motivo con el dato;
  - el texto del WhatsApp de cada acción.
- **Acciones:**
  - Las de WhatsApp abren `wa.me` con el número de la tienda y el texto listo.
  - «Empezar», «Retocar» y «Ver salud» llevan a sus pantallas, que en esta parte son «Muy pronto».
  - «Ya pagó» lleva a la ficha (Registrar pago llega en la parte 4).
  - «Mañana» llama a `admin_posponer` y la tarjeta sale con la animación de salida de lista de docs/08 (o sin animación, si docs/08 no la permite para listas).
- **Estados:**
  - Esqueleto mientras carga.
  - Error con «Reintentar».
  - Vacío con la voz de la marca.
- Relee al volver a la pestaña y al recuperar el foco.

## 3. Tiendas y ficha

- **Lista** desde `admin_tiendas`:
  - Búsqueda con espera de 250 ms.
  - Filtros con conteo; un filtro en 0 no se muestra.
  - Punto de salud con su leyenda abajo.
  - Ruta `/admin/tiendas`; ficha en `/admin/tiendas/[id]`.
- **Ficha** desde `admin_tienda`, con las tarjetas del tablero `Tienda`.
  - Tarjeta Cuenta: Registrar pago y Cambiar plan muestran «Muy pronto» hasta la parte 4.
  - Lista de acciones delicadas, con confirmación (`Alerta`) y su registro:
    - Ajustar créditos: hoja con cantidad (+/−) y motivo obligatorio.
    - Pasar la tienda a otro dueño: hoja con el correo.
    - Pausar o Reactivar.
- **Accesos rápidos:**
  - Ver como (§4).
  - Escribirle (WhatsApp de la tienda).
  - Su catálogo (`/tienda/{slug}` en una pestaña nueva).

## 4. Ver como

- «Ver como ella» llama a `admin_ver_como_iniciar` y abre el panel normal (`/`) con la fuente en modo `soloMirar` para esa tienda.
- **Elige cómo pasa el modo** (cookie de sesión de corta duración, o parámetro más estado) y explícalo en el PR. La base es la que autoriza (`admin_viendo`); el cliente solo evita llamadas inútiles.
- La franja verde de arriba siempre está («Viendo {tienda} · Solo mirar · queda anotado», «Salir»). Respeta el área segura del iPhone.
- **Botones de acción** (Despachar, + Pedido, Guardar, Reponer, etc.): se ven apagados. Un toque muestra el aviso del tablero «Aquí solo se mira. Para cambiar algo, escríbele a {vendedora}.».
  - Hazlo en un solo lugar (un contexto `soloMirar` que lean `Boton` y las hojas de edición), no botón por botón.
- **Al salir o al vencer la sesión** (30 minutos): `admin_ver_como_terminar` y vuelta a la ficha.
- **No se debe poder:**
  - entrar al modo demo desde ahí;
  - cambiar de tienda en el menú;
  - ver novedades;
  - instalar la app.

## 5. Actividad

El panel de las tiendas llama a `marcar_actividad(tiendaId)` al abrir y al volver a primer plano, como mucho cada 10 minutos. Sin bloquear nada; si falla, no se avisa.

## 6. Comprobación

- `npm run lint`, `npm run build`, `npm test` y todos los `probar:*`.
- **Script nuevo `scripts/probar-admin-tiendas.mjs`** (demo, a 360, 390 y 430):
  1. Un no-admin real recibe 404 en `/admin`. Se prueba con la función de servidor simulada o con Supabase; dilo.
  2. Hoy muestra cada tipo de asunto. «Mañana» lo esconde y al día siguiente (reloj simulado) vuelve.
  3. Los WhatsApp de cada acción llevan el número y el texto correctos.
  4. Tiendas: búsqueda, filtros, orden y punto de salud según las reglas.
  5. Ficha: cada tarjeta con datos. Ajustar créditos pide motivo y suma al saldo.
  6. Ver como: se ve el panel de la tienda con la franja. Un toque en Despachar muestra el aviso y no cambia nada. Al salir vuelve a la ficha. Al vencer la sesión también.
- **Real (Supabase):** con el SQL del primer admin aplicado, entra al admin del preview, abre «Ver como» con Esencias Michel, confirma que no se puede escribir y que el registro anotó la entrada.
  - No cambies datos reales de Michel.
  - Si no puedes entrar con Google en el preview, dilo y deja los pasos para Lewis.
- **Capturas** en `docs/capturas/admin-tiendas/`, comparadas con `referencias/admin/capturas/`.

## 7. Cierre

PR con:
- lo que cambió;
- cómo pasa el modo `soloMirar`;
- los resultados;
- las capturas;
- los pasos para que Lewis lo pruebe en su teléfono:
  1. Entrar a `/admin`.
  2. Revisar Hoy.
  3. Abrir la ficha de Michel.
  4. Ver como, intentar despachar y salir.

**Déjalo abierto, sin merge.** Actualiza «Dónde va el trabajo» en `docs/00-contexto-del-proyecto.md`.
