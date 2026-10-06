# Selector de tiendas y cuenta: referencias de diseño (6 oct 2026)

| Tablero | Qué muestra |
|---|---|
| `MenuPro` | Menú que se abre al tocar el nombre de la tienda, con plan Pro y 3 tiendas: la activa (con **Mi marca adentro de su tarjeta**), las otras, «Crear otra tienda» activa, y al pie la cuenta (foto de Google, nombre, correo, «Cerrar sesión»). |
| `MenuBasico` | Con una sola tienda y un plan que no permite más: «Crear otra tienda» con candado, «Varias tiendas es del plan Pro» y «Ver planes». |
| `CrearTienda` | Hoja para crear otra tienda: nombre y «¿Qué vendes?». |
| `Encabezado` | A es el encabezado de hoy (**elegido**). B (foto de la persona con la tienda en la esquina) se descartó. |

Los datos (Mora Shoes, Marcela Pérez, créditos, planes) son inventados. **No es código para copiar**: se construye con `components/ui/` y los tokens del panel (docs/09). Con una sola tienda el menú se parece al de hoy, más la cuenta y «Mi marca» dentro de la tarjeta. «Administrar Deslizapp» (solo admins) y el enlace de novedades siguen donde estaban.
