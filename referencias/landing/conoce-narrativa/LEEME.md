# «Cómo funciona»: portada narrativa

Aprobado por Lewis el 16 oct 2026, en el lienzo [Cómo funciona · pantallas nuevas](https://claude.ai/artifact/YVuiHFNWVwrbFYyGFTtQDP). Encargo: [docs/prompts/conoce-portada-narrativa.md](../../../docs/prompts/conoce-portada-narrativa.md).

Pantallas, en orden:
1. `Dolor.dc.html`: te escriben por Instagram.
2. `Desorden.dc.html`: todos los chats.
3. `Post.dc.html`: Tu Tienda publica.
4. `Perfil.dc.html`: el enlace del perfil.
5. `Navegador.dc.html`: el catálogo se abre dentro de Instagram.
6. `Cambio.dc.html`: el cambio de lado, que va antes de `aviso`.

En la app se reutilizan el mockup real del teléfono, las burbujas y los demás componentes de la landing. Estos archivos sirven para leer textos, orden y colores: **no se copia su HTML**.

## Separadores (aprobados por Lewis el 17 oct 2026)
Son pantallas sin teléfono que presentan cada tema, como `cambio-lado`. Están en `separador-*.dc.html`, y el orden completo en `orden-con-separadores.dc.html`.
- **`bienvenida`** (primer paso, fondo bosque): el icono verde de la app entra con un rebote. Debajo, «hola, esto es» a mano en rosa, **«deslizapp»** en Fredoka grande y «En un minuto te enseñamos cómo vender **sin tanta vuelta**.», con «sin tanta vuelta» en mandarina.
- **`antes`** (fondo arena, sin color de marca):
  - Suben una a una burbujas de Instagram (blancas) y de WhatsApp (verdes) con «¿precio?», «¿lo tienes en negro?», «📷 foto», «¿y el envío?» y «¿cuál era? 😅».
  - Abajo, «antes de empezar…» a mano, **«Seguro esto te suena.»** y «Así se vende hoy por Instagram y WhatsApp.».
  - Va antes de `dolor-dm`.
- **`solucion`** (fondo rosa):
  - «¿precio?» y «¿cuál era?» aparecen tachadas y entra el icono rosa.
  - Debajo, «ahora, con Deslizapp…» a mano, **«Así lo resolvemos.»** y «Tu catálogo enseña fotos, precios y lo que queda. A ti te llega el pedido listo.».
  - Va antes de `post`.
- `cambio-lado` se queda como está.

## Cuándo deslizar: barra de historias + «Desliza ↑» (opción B + A, elegida por Lewis el 17 oct 2026)
`avance-barra-y-desliza.dc.html`. Sustituye las rayitas del lateral.
- **Arriba**, una barra fina con un segmento por paso, como las historias de Instagram. Los pasos hechos van llenos, el actual se llena durante su animación (su `duracion`) y los que faltan van vacíos. Debajo, el capítulo y la posición: «Elige · 7 de 19».
- **Cuando el segmento se llena** (terminó la animación del paso), aparece abajo «Desliza» con una flecha hacia arriba que rebota. Se va en cuanto la persona desliza.
- Deslizar antes de tiempo sigue funcionando: no se bloquea.
