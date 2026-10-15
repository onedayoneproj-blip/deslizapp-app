# Landing · ronda 12: icono de la app según quién habla, e iconos en las burbujas (15 oct 2026)

#130 ya está fusionado. Esto va en una **rama nueva desde `main`** y en un **PR nuevo**, que no se fusiona hasta que Lewis diga «mergea».

## 1. El icono de la app cambia con la persona
El icono de la app está arriba a la izquierda durante la demo y es el mismo que sube en la portada.
- **Comprador** (los capítulos de compras y la portada): **icono rosado**, el isotipo Verde Bosque sobre rosa. Archivo: `referencias/landing/icono-app-rosa.png`.
- **Vendedor** (los capítulos de tienda y el cierre): **icono verde**, el de la app (`public/icons/apple-touch-icon.png`, isotipo Bosque sobre verde pálido).
- Es la regla de marca de `docs/09`: rosa para el comprador y verde para el vendedor.
- Lewis mandó también una versión sobre crema (`icono-app-crema.png`). **No se usa por ahora.** Guárdala solo si te sirve para algo; si no, déjala en referencias.
- Pasa los PNG a `public/landing/` en WebP, al tamaño que haga falta a 3×, con el radio de icono de iOS hecho en CSS, no recortado en la imagen.
- **El cambio se anima con el cambio de persona** (el paso «cambio»): un fundido cruzado de unos 300 ms, o un giro de la tarjeta si queda limpio. Con movimiento reducido, cambia sin animar. Al retroceder vuelve al rosado.

## 2. Iconos de la app en las burbujas
Cuando una burbuja nombra algo que en la app tiene su icono, el icono va **delante de la palabra**, en línea y en el mismo color que la palabra resaltada.
- Tamaño de unos 0.9 em, alineado con la línea de texto, con trazo de 2.2 px como el resto de iconos de la app.
- Usa **los iconos reales** de `components/iconos.tsx`; no los dibujes de nuevo.

| Palabra o idea en la burbuja | Icono |
|---|---|
| cliente, clienta, quien compra, Ana | `IconoClientes` |
| tienda, Tu Tienda | `IconoBolsa` |
| pedido, tu pedido | `IconoPedidos` |
| catálogo | `IconoCatalogo` |
| WhatsApp | `IconoWhatsApp` |
| aaah, lo que te gusta, like | `IconoCorazon` |
| enlace | `IconoEnlace` |
| despachar, despachado | `IconoCamion` |
| total, RD$ | `IconoMoneda` |
| stock | `IconoEtiqueta` |

- Añade a cada burbuja de `PASOS` un campo (por ejemplo `iconos: { "Tu Tienda": "bolsa" }`, o dentro del `resalta` que ya existe) para que se marque **qué palabra lleva icono**, y que Lewis pueda cambiarlo.
- **No más de dos iconos por burbuja.** Si una frase nombra más cosas, pon el icono en las dos más importantes.
- Los iconos son decoración: llevan `aria-hidden`, y la frase se lee igual sin ellos.
- Si en algún sitio de la landing, fuera de las burbujas, se nombra algo con icono en la app (el cierre, «Quiero vender», la línea descriptiva de la portada), propón dónde ponerlo y muéstralo en el PR, pero no lo llenes de iconos.

## Pruebas
- `probar-landing`:
  - el icono de arriba a la izquierda es el rosado en compras y en la portada, y el verde en tienda y en el cierre;
  - al retroceder desde «cambio» vuelve al rosado;
  - cada burbuja con un icono marcado lo muestra, y ninguna lleva más de dos;
  - los iconos tienen `aria-hidden`.
- Captura a 393×852 de un paso de compras y uno de tienda en el PR.
