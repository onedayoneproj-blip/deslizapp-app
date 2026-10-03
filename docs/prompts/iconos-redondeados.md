# Iconos con esquinas redondeadas + bolsa del catálogo para Pedidos

Contexto: crea la rama `fix/iconos-redondeados` desde main actualizado (git checkout main && git pull). Lee AGENTS.md, la guía de Next que aplique y la sección 12 (Iconos) de docs/09-sistema-de-diseno.md: ningún icono lleva esquinas en punta, salvo la chispa. Solo components/ui, components/iconos.tsx y tokens. Referencia visual: tablero "Iconos con esquinas redondeadas" del canvas "Cliente: cobro y recordatorio".

## Cambios en components/iconos.tsx

Reemplaza los trazos de estos iconos por EXACTAMENTE estos (viewBox 24; no cambies el grosor ni el resto del componente Icono):

- **IconoInicio**
  `<path d="M4 10.4c0-.6.3-1.2.7-1.5l6-4.9a2 2 0 0 1 2.6 0l6 4.9c.4.3.7.9.7 1.5V18a2 2 0 0 1-2 2h-3.5v-4.5a1.5 1.5 0 0 0-1.5-1.5h-2a1.5 1.5 0 0 0-1.5 1.5V20H6a2 2 0 0 1-2-2z" />`
- **IconoPedidos** (la bolsa del catálogo; IconoBolsa queda igual a este: deja uno solo, IconoPedidos, y reemplaza los usos de IconoBolsa)
  `<path d="M5 8h14l-1.1 12.1a1 1 0 0 1-1 .9H7.1a1 1 0 0 1-1-.9z" />`
  `<path d="M9 10.5V7a3 3 0 0 1 6 0v3.5" />`
- **IconoPromos**
  `<path d="M3.5 5.5a2 2 0 0 1 2-2h6.2c.5 0 1 .2 1.4.6l7.3 7.3a2 2 0 0 1 0 2.8l-6.2 6.2a2 2 0 0 1-2.8 0l-7.3-7.3c-.4-.4-.6-.9-.6-1.4z" />`
  `<circle cx="8.5" cy="8.5" r="1.5" />`
- **IconoCamion**
  `<rect x="3" y="6" width="11" height="10" rx="2" />`
  `<path d="M14 10h3.2c.5 0 1 .2 1.4.6l1.8 1.8c.4.4.6.9.6 1.4V15a1 1 0 0 1-1 1h-6" />`
  `<circle cx="7" cy="18" r="1.8" />`
  `<circle cx="17" cy="18" r="1.8" />`
- **IconoCamara**
  `<path d="M4 9.5A1.5 1.5 0 0 1 5.5 8H7l1.2-1.6c.3-.4.8-.6 1.2-.6h5.2c.5 0 .9.2 1.2.6L17 8h1.5A1.5 1.5 0 0 1 20 9.5v8a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5z" />`
  `<circle cx="12" cy="13" r="3.5" />`

No toques IconoChispa ni IconoCreditos (conservan sus puntas).

## Revisión del resto

- Busca en todo el repo (components, app, lib, y el camión de la animación de despacho en components/pedidos/hoja-despachado.tsx) cualquier SVG dibujado a mano con esquinas en punta (rect sin rx, polígonos o paths con esquinas vivas) y redondéalo con el mismo criterio (radio 1.5–2 sobre 24) o reemplázalo por el icono de components/iconos.tsx si ya existe. Lista en la PR qué encontraste y qué cambiaste.
- No toques el logo/isotipo (`public/icons/isotipo.svg`) ni las ilustraciones.

## Movimientos del cliente

En credito/cuenta-cliente.tsx, la fila "Compra" usa IconoPedidos (la bolsa nueva) dentro del círculo neutro de 40px (`superficie-hundida`, icono `texto`), como hoy. El abono se queda con IconoMoneda sobre `accion-suave`.

## Verificación

- lint, typecheck, tests y build sin errores; revisar-estilos en 0.
- En la vista previa, revisa a 390px: la barra inferior (Inicio, Pedidos y Promos con el trazo nuevo), el menú de la tienda (usa IconoPedidos), el botón "Despachar pedido" y la animación de despacho (camión), subir foto en Catálogo (cámara) y los movimientos de un cliente.
- Capturas en docs/capturas/iconos/.

## Entrega (incluye el merge)

1. Abre la PR hacia main con la lista de iconos cambiados.
2. Si todo pasa, mézclala tú mismo (squash) y borra la rama.
3. NO mezcles si algo falla o necesita una decisión mía; en ese caso explícame.
4. Respuesta final: si mezclaste, el commit de main y un resumen.
