# Ruta al lanzamiento (Planning, 7 oct 2026)

> Prioridad de Lewis: **todo lo que usa la tienda y el comprador**; el admin ya alcanza por ahora. Meta: mandar el **enlace de invitación** a contactos de confianza para que prueben, y lanzar lo antes posible (fase 1 de `docs/14` §4: 5 a 10 tiendas fundadoras).

## Ya está (en producción)

Panel completo (pedidos, clientes, promos, inventario, resumen), catálogo conectado en React, presentaciones (panel y catálogo del cliente, #62 y #63), Mi marca y retoque Beta, selector de tiendas, equipo con niveles de permiso e invitaciones por enlace (#61), bloqueo de Ver como en la base (#59), admin (Hoy, Tiendas, Trabajo, Personalizar, Invitaciones).

## Ola 1 · «Listo para probadores» (primero, en este orden)

1. **Probar el enlace de invitación de punta a punta** con una segunda cuenta de Google (Lewis). Corregir lo que salga.
2. **Publicar mi catálogo, automático** (`docs/prompts/publicar-catalogo.md`, escrito; decidido por Lewis: el catálogo de una tienda en prueba es público en cuanto lo publica, sin indexar). Hoy `tienda_publica` exige `estado = 'activa'` y `catalogo_estado = 'publicado'`: una tienda nueva no tiene catálogo público hasta que Lewis la active y publique desde el admin. Hace falta que la tienda lo publique sola cuando tenga lo mínimo (decisión: el catálogo de una tienda en prueba es público al publicarlo, con enlace sin indexar). Prompt por escribir.
3. **Onboarding mínimo** después de crear la tienda: historias de introducción y de datos (lienzo `Onboarding de Deslizapp`, opción B), checklist de 7 pasos. Prompts por escribir; copiar el lienzo a `referencias/onboarding/`.
4. **Tipo de producto** (`docs/prompts/tipo-de-producto.md`, escrito): lo que vende la tienda y el tipo de cada producto. **Obligatorio para lanzar**: Lewis va a probar con tiendas que venden más de un rubro.
4b. **Bloquear la carga de videos** (`docs/prompts/bloquear-video.md`, escrito): por ahora no se suben videos (decisión de Lewis, 7 oct); se conserva el código para reabrirlo más adelante.
5. **Pasada de pulido en iPhone real** (Lewis) con una lista de recorridos: crear tienda con enlace, subir productos con fotos, presentaciones, catálogo del cliente, pedido por WhatsApp, Mi marca, equipo. Prompt de arreglos con lo que salga.
6. **Cosas chicas de lanzamiento:** actualizar Términos y Privacidad (lista de prohibidos aprobada, datos de Google, fotos); un «Enviar comentarios» en el menú que abre el Instagram de Deslizapp; texto de «sin tienda» (ya está en #61).

## Ola 2 · «Primeros pedidos reales»

- **Rendimiento del catálogo en 4G** (PR #45, separado y sin fusionar: evaluarlo y decidir qué entra). El catálogo público tiene que cargar rápido con datos móviles.
- **Aviso de pedidos nuevos** (hoy solo el contador): notificaciones, empezando por lo más simple.
- **Carga cómoda del inventario** (docs/14 §5): hoy cada producto se sube a mano; ver con los probadores si estorba antes de construir «importar productos».
- **Ficha técnica en imagen + descripción** (reemplaza Detalles en tiendas nuevas; con créditos y trabajo manual del equipo). Falta lienzo.
- **Aligerar el video** (hoy ~10 MB en 30 s) y cuidar el almacenamiento.
- **Mi marca «mágica»** (cuestionario de historias, `docs/15`), cuando haya probadores usando Mi marca.

## Ola 3 · «Cobrar»

- Suscripciones del titular (`docs/prompts/suscripciones-y-varias-tiendas.md`, Opus) y suscripción de la tienda (`docs/prompts/suscripcion-tienda.md`: elegir plan, pagar con captura, avisos), planes y cobros del admin (`admin-4-cobros`, en pausa).
- **Dominio propio** y revisar el plan de Supabase (copias de seguridad, almacenamiento y salida de datos) **antes de tener clientes pagando**.
- Instagram conectado (cuenta de desarrollador de Meta) y crear producto desde foto o captura.

## Ola 4 · IA y revisión

Servicio de IA de Deslizapp, revisión de productos nuevos (diferida hasta abrir el registro), etiquetas de búsqueda automáticas, ficha técnica generada. Diseñado para que se enchufe sobre los estados y colas que se construyan antes.
