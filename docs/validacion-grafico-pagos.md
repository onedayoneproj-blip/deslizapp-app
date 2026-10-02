# Gráfico: Pagado / Por cobrar — 2026-10-02

Base: main df324132942eff8bc54fc8489bb5d6838a941539.
Rama: feature/grafico-pagado-por-cobrar.

## Comportamiento

El gráfico conserva pedidos despachados por fecha de despacho y por despachar por
creación. Nuevos/cancelados permanecen excluidos. El total, comparación, selección,
períodos y métricas no cambian. Rosa muestra Pagado; Mandarina, Por cobrar.
Un pedido parcialmente abonado participa en ambos segmentos.

Los importes vienen de pagado/saldo de getPedidos mediante useData: demo y Supabase
ya los calculan con conPago. Se refleja el estado actual de pago en la barra del
pedido, no los cobros por fecha de abono. Se limita el reparto al total para no
pintar valores negativos/superiores a este. Los históricos sin crédito conservan
el comportamiento de contado. No se cambian datos, RLS, operaciones ni SQL.

## Validación ejecutada

- Lint: pasó.
- Tests: 124/124 pasaron. Casos nuevos: contado, crédito sin abonos, parcial, pago
  completo, pagado fuera de límites, históricos, exclusión de nuevos/cancelados,
  futura/antes sin importe, selección, actualización del reparto y conservación
  del total de ambos estados.
- Build Webpack: pasó, incluyendo TypeScript. Se usa la alternativa validada del
  entorno; no se repitió el fallo de permiso interno de Turbopack documentado antes.
- Chromium en demo local: 360/390/430 px y 390 px con movimiento reducido; cuatro
  períodos, nueva leyenda/nombres accesibles, elegir barra/volver a todo el período,
  ambos colores visibles en Año, sin overflow horizontal ni errores de página.
  Consultar no modificó la persistencia de pedidos/pagos. Capturas inspeccionadas.
- No se ejecutaron scripts generales de hojas/teclado: el gráfico no los modifica.

## Pendiente

No se verificó Safari físico ni una sesión de tienda Supabase real. No se hizo
ninguna escritura de producción ni migración. Preview/despliegue se informan en
el PR/handoff una vez comprobados; el documento no anticipa publicación.

Para probar: en Demo, Inicio → Año muestra crédito parcial en los dos colores.
Cambiar períodos y tocar una barra debe mantener el filtrado existente. En tienda
real, comparar el reparto con pagos y saldo de los pedidos del mismo tramo. Un
abono posterior cambia el color de la barra del pedido; no genera otra venta.
