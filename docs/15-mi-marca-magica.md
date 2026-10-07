# Mi marca «mágica»: conocer la marca sin que la tienda tenga que escribir un prompt

> **Estado: idea anotada por Planning (7 oct 2026). No se construye todavía.** Primero entra Mi marca (PR #57, versión manual con 3 palabras y fotos de referencia). Esta idea la reemplaza por una experiencia de historias. Antes de construir: lienzo de diseño aprobado por Lewis y revisión con `docs/01-marca.md` y `docs/11-voz-y-frases.md`.

## Por qué

Pedirle a la tienda «3 palabras» se siente como escribirle un prompt a su propia marca. La tienda solo debería dar lo que ya tiene (nombre, logo, Instagram, productos) y contestar un par de preguntas fáciles. Deslizapp se encarga de entender la marca y dejar una guía clara para el taller del retoque.

## Las tres capas

1. **Mínimo (ya existe):** nombre, logo, Instagram y lo que vende. Con esto la tienda ya puede empezar.
2. **Cuestionario de historias, «Deslizapp quiere conocerte»:** 5 o 6 pantallas, una pregunta por pantalla, casi todo de tocar. Encaja con la opción B del onboarding (historias para recopilar los datos). Ver «Formato» abajo.
3. **Síntesis con IA → tarjeta de marca:** con las respuestas, el catálogo, las fotos de referencia y (si la tienda lo conecta) su Instagram, la IA arma la **tarjeta de marca**: «Tu marca en una frase», tono, colores y qué evitar. La tienda la ve, la ajusta si algo no le suena y confirma. **Nada inferido queda oculto**: el taller ve lo que el dueño aprobó.

## Formato del cuestionario: como una historia de Instagram

Cada pregunta es una pantalla de historia (barra de progreso arriba, toque para avanzar), con los widgets que la gente ya conoce de Instagram:
- **Encuesta de dos opciones** (sobria o colorida, lujo o cercana), con fotos.
- **Pregunta de opción múltiple** (como el sticker de «quiz»).
- **Deslizador de emoji** («¿qué tan atrevida es tu marca?»).
- **Stickers** para decorar y dar carácter (sin que sea obligatorio tocarlos).
- **Una caja de texto opcional** («Algo que nunca harías»).
Todo se construye con `components/ui/` y los tokens; nada de copiar el HTML del lienzo.

Preguntas de ejemplo:
- «Si tu marca fuera una persona famosa, ¿quién sería?»
- Pares de fotos para escoger una.
- «¿Cómo habla tu marca con la gente?» (con ejemplos para escoger).
- «Una marca que admiras».
- Opcional: «Algo que nunca harías».

## Rondas para afinar

Después del primer cuestionario, la tienda puede hacer **opcionalmente un segundo y un tercero** para mejorar la precisión (cada ronda profundiza en otra cosa: su cliente ideal, su estilo de fotos, su manera de escribir). Cada ronda mejora la tarjeta de marca y le muestra a la tienda qué cambió. Nunca son obligatorias.

## Nombre de marketing (por decidir)

Como Apple, la lógica de «recopilar y entender la marca» merece un nombre propio. Propuestas, para que Lewis elija:
- **Vibra** («Tu Vibra», «Afina tu Vibra»): corta, muy dominicana, encaja con historias. Las rondas serían Vibra 1, 2 y 3. Mi favorita.
- **Alma de marca**: más emocional.
- **Chispa**: ya se usa para el retoque; evitar mezclar.
- **Esencia**: evitar, choca con Esencias Michel.
Antes de fijarlo, revisar `docs/11-voz-y-frases.md`.

## Instagram: qué se puede y qué no (verificado el 7 oct 2026)

- **Sí:** que la tienda conecte su propia cuenta con «Iniciar sesión con Instagram» y leamos sus publicaciones, textos y fotos. Solo cuentas Business o Creator, y Meta exige revisión de la app (puede tardar semanas): conviene abrir la cuenta de desarrollador de Meta cuanto antes.
- **No:** leer perfiles ajenos solo con el enlace. Las condiciones de Meta prohíben la recolección automática y Meta ha demandado a quienes lo hicieron.
- **Siempre disponible, sin Meta:** el catálogo de la tienda y las fotos de referencia.

## Cómo encaja con lo que ya existe

- **#57 (Mi marca manual) no se cambia ahora.** Sus tablas (`marca_tienda`, `marca_referencias`) y el bucket privado se reutilizan.
- La regla «marca lista» hoy es 3 palabras + 3 fotos. Con esta idea pasa a **tarjeta de marca confirmada + 3 fotos**; las 3 palabras salen del cuestionario ya hechas y son editables.
- Datos nuevos (cuando se construya): migración **aditiva** con una columna de perfil en `marca_tienda` (no se edita la migración aplicada), y una llamada a Claude desde el servidor (con visión para leer las fotos). La IA se incluye en el costo de Deslizapp: es una vez por tienda y cuesta céntimos.
- El taller (admin › Trabajo › Fotos › «Su marca» y «Copiar instrucciones») pasa a leer la tarjeta de marca.

## Orden propuesto

1. Mergear #57.
2. Lienzo de diseño: historias del cuestionario y tarjeta de marca (Lewis aprueba).
3. Cuestionario + tarjeta de marca con IA, sin Instagram.
4. Rondas opcionales 2 y 3.
5. Conectar Instagram (depende de la aprobación de Meta).

## Decisiones de Lewis (7 oct 2026)

- **Dónde vive el cuestionario:** dentro de **Mi marca** (menú de la tienda), como experiencia opcional. **No** va en el onboarding de toda tienda nueva. (El onboarding de historias sigue su propio camino: nombre, logo, rubro y datos básicos.)
- **Quién paga la IA:** **Deslizapp**. Es una sola vez por tienda y cuesta poco; no se cobra ni se descuenta de créditos de la tienda. Las rondas 2 y 3 también las cubre Deslizapp; si el gasto crece, se revisa con límites por tienda.
- **Mergear #57:** aprobado como siguiente paso, cuando Lewis lo pruebe en el iPhone y diga «mergea».

## Preguntas abiertas para Lewis

- Nombre de marketing (¿Vibra?).
- ¿Deslizapp tiene empresa registrada (RNC) y dominio propio? Decide si se puede pedir el acceso avanzado de Instagram.
- ¿Abrir ya la cuenta de desarrollador de Meta? El acceso estándar (inmediato) ya permite probar con la cuenta de Michel.

## Instagram: requisitos (verificado el 7 oct 2026)

- Cuentas de las tiendas: Business o Creator (cambiarla es gratis).
- Cuenta de desarrollador de Meta (gratis), app tipo Business, producto «Instagram API with Instagram Login», dirección HTTPS de retorno.
- **Acceso estándar:** inmediato, solo para cuentas con rol en la app (sirve para probar con Michel).
- **Acceso avanzado** (para cualquier otra tienda): App Review (video de uso, explicación de permisos, privacidad, términos, borrado de datos) y Business Verification (documentos legales de una empresa; probablemente dominio propio).
- Costo: no se encontró ningún cargo de Meta; el costo es tiempo (semanas de revisión) más nuestra IA y almacenamiento.

## Idea relacionada: convertir un post de Instagram en un producto de Deslizapp

Opciones evaluadas:
- **D. Foto o captura + texto del post → la IA con visión arma el producto** (nombre, descripción, precio si aparece, rubro) y el dueño revisa antes de guardar. No depende de Meta y funciona hoy en iPhone y Android. **Recomendada primero.**
- **A. Conectar la cuenta** y elegir un post dentro de Deslizapp: mejor experiencia, mismo login y misma revisión de Meta que la conexión de la marca. Copiar las imágenes a nuestro almacenamiento (los enlaces de Instagram caducan). Después.
- **B. Pegar el enlace (oEmbed):** solo muestra el post incrustado, no copia foto ni texto. Descartada como base.
- **C. «Compartir» desde Instagram al PWA:** funciona en Android; en iPhone Safari no lo soporta (hasta donde se pudo verificar) y Instagram solo comparte el enlace. Descartada.
