# Admin de Deslizapp: referencias de diseño

Tableros del lienzo «Admin de Deslizapp» (Claude Design, 5 oct 2026). Especificación: `docs/13-admin.md`. Prompts: `docs/prompts/admin-*.md`.

Muestran **qué va y dónde, con qué textos y tamaños**. **No son código para copiar**: el admin se construye con `components/ui/` y los tokens del panel (docs/09). En `capturas/` está cada tablero como imagen (las letras salen con una fuente de reemplazo; las de verdad son Fredoka, Figtree y Caveat). Los `.dc.html` traen las medidas exactas: ábrelos en un navegador.

**Datos de ejemplo:** solo Esencias Michel es real. Mora Shoes, Luna Bijou, Casa Brisa, Dulce Vicio, Tikí Kids, los montos y los conteos son inventados para mostrar los estados. No se copian al código ni a la base.

| Tablero | Qué muestra | Parte |
|---|---|---|
| `Hoy` | La pestaña de inicio: 4 números del mes y «Lo que pide tu mano», una tarjeta por asunto con su motivo y una acción. | 2 |
| `Tiendas` | Lista con búsqueda, filtros por estado y un punto de salud por tienda, ordenada por lo que te necesita. | 2 |
| `Tienda` | Ficha: cuenta y vencimiento, cómo le va en 30 días, catálogo, equipo con última entrada, lo último que hizo y acciones delicadas al final. | 2 |
| `VerComo` | La app de la tienda en modo «solo mirar», con la franja de arriba y el aviso de abajo. | 2 |
| `Trabajo` | Catálogos por armar, por etapa: por empezar, armando (3 pasos), pidió cambios, esperando su sí. | 3 |
| `Fotos` | Fotos por retocar por tienda, con antes y después, Bajar original, Entregar y Devolver. | 3 |
| `Personalizar` | El catálogo de una tienda: colores, letra, cabecera, frases, secciones, orden de productos y opiniones. | 3 |
| `Cobros` | Lo cobrado del mes, atrasadas, vencen esta semana, al día, en prueba. | 4 |
| `RegistrarPago` | Hoja para registrar un pago: qué pagó, monto, cómo, referencia, comprobante, hasta cuándo queda pagada y mandar el recibo. | 4 |
| `Planes` | Planes editables, los que se ofrecen y los retirados, y lo que cuesta lo demás. | 4 |
| `Mas` | La pestaña Más: invitaciones, planes, funciones nuevas, novedades, salud, registro, quién entra al admin. | 4 |
| `Salud` | Uso del plan gratis de Supabase, lo que más pesa y la actividad del día. | 4 |
| `Registro` | Quién hizo qué y cuándo, con filtros. | 4 |
| `Invitaciones`, `NuevaInvitacion` | Del lienzo del onboarding: la lista de invitaciones y «Nueva invitación» (vacía o pre-llenada). | 5 (con el onboarding) |
