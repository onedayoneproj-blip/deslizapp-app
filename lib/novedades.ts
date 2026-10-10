import { FUNCIONES } from "./funciones";

// Novedades de cada versión del panel, de la más nueva a la más vieja.
//
// REGLA (ver HANDOFF.md): cada cambio visible para el dueño de la tienda suma una línea aquí.
// Si el cambio va en una versión nueva, se agrega una entrada NUEVA ARRIBA con número mayor:
// al abrir la app después del despliegue, cada persona verá esa entrada una sola vez.
// Líneas cortas, en tono de marca (docs/01-marca.md), hablándole de "tú".

export type Novedad = {
  /** Versión "mayor.menor.parche" (ej. "0.2.0"). */
  version: string;
  /** Fecha de publicación, "AAAA-MM-DD". */
  fecha: string;
  /** Titular corto, con remate. */
  titulo: string;
  /** De 2 a 4 líneas cortas. */
  cambios: string[];
  /** Habla de una función que puede estar apagada (lib/funciones.ts): solo se muestra con la función encendida. */
  funcion?: keyof typeof FUNCIONES;
};

const TODAS: Novedad[] = [
  {
    version: "0.58.0", fecha: "2026-10-10", titulo: "Tus catálogos, más claros.",
    cambios: ["«De todo» conserva ese catálogo con otro nombre.", "«General» reúne tus productos y abre primero si aún no has elegido un catálogo.", "El selector se cierra cuando desplazas la pantalla."],
  },
  {
    version: "0.57.0", fecha: "2026-10-10", titulo: "Tu tienda, paso a paso.",
    cambios: ["Una guía en Inicio te ayuda a dejar tu tienda lista, sin bloquearte.", "Toca las rayas para consultar cada capítulo y sus pasos.", "Minimiza la guía y vuelve a ella cuando quieras, en este navegador.", "Cuando terminas, la guía se despide. Lo que sigue lo escriben tus clientes."],
  },
  {
    version: "0.56.0", fecha: "2026-10-09", titulo: "Clientes con carita.",
    cambios: [
      "Dale a cada cliente un avatar con emoji: el color del círculo sale del emoji solito (o lo eliges tú).",
      "La nota ahora es una burbuja sobre el avatar, como las notas de Instagram: tócala y escribe ahí mismo.",
      "Más de 350 emojis por categorías, con tonos de piel y los que usaste hace poco.",
      "«Cliente nuevo» más chiquita y directa: nombre, WhatsApp y listo.",
    ],
  },
  {
    version: "0.55.0", fecha: "2026-10-09", titulo: "Campos con ícono.",
    cambios: [
      "Nombre, WhatsApp, fechas, enlaces y más campos ahora llevan un icono a la izquierda.",
      "Se ven igual en toda la app: más fácil saber qué va en cada uno.",
    ],
  },
  {
    version: "0.54.0", fecha: "2026-10-09", titulo: "Reabrir sin vueltas.",
    cambios: [
      "«Editar pedido» en uno despachado ahora tiene «Reabrir pedido»: confirmas y quedas editando.",
      "El stock se devuelve solito y lo despachas otra vez cuando termines. Tu factura se arma de nuevo.",
    ],
  },
  {
    version: "0.52.0", fecha: "2026-10-09", titulo: "Pedido más clarito.",
    cambios: [
      "«Cambiar a crédito» ya no pide botones extra: eliges la fecha y queda guardado.",
      "«Registrar abono» ya no se confunde con «Editar pedido»: es un botón de texto dentro de Pago.",
      "Menos repetido: sin «Agotado» en lo ya vendido, sin dos «A crédito» y, sin descuento, solo el Total.",
    ],
  },
  {
    version: "0.51.0", fecha: "2026-10-08", titulo: "Stickers con sabor.",
    cambios: [
      "33 stickers ilustrados para tus historias: «Nuevo», «Agotado», «Más vendido», Navidad, Viernes negro y más.",
      "Están en tres pestañas: Básicos, Temporadas y Marca. Son gratis.",
      "Arrastra para moverlos, pellizca para agrandarlos y gira con dos dedos.",
    ],
  },
  {
    version: "0.50.0", fecha: "2026-10-08", titulo: "Tu producto, en una historia.",
    cambios: [
      "En Catálogo, toca «Agregar a historia» arriba a la derecha de cada producto.",
      "Elige si va el precio, las presentaciones y la foto de tu tienda: la imagen sale lista, hecha en tu teléfono.",
      "Con «Ajustar foto» (o tocando la vista previa) pellizca para acercar, arrastra para mover, o ponle fondo difuminado si no es vertical.",
      "Ponle stickers: «¡Nuevo!», «Últimas unidades» y el aaah de deslizapp. Arrástralos para dejarlos donde quieras.",
      "Compártela en el Estado de WhatsApp o en una historia de Instagram, con el enlace directo a ese producto.",
    ],
  },
  {
    version: "0.49.0", fecha: "2026-10-08", titulo: "Tu producto, de un vistazo.",
    cambios: [
      "La foto va grande arriba, y Nombre y Precio a la vista.",
      "Lo opcional queda plegado: tócalo y se abre.",
      "Mira la «Vista previa» antes de publicar: es el catálogo de tu cliente, tal cual.",
      "Colores y tallas van en dos pasos: qué cambia y cuántas tienes.",
    ],
  },
  {
    version: "0.48.0", fecha: "2026-10-08", titulo: "Tu producto, bien explicado.",
    cambios: [
      "Escribe la descripción en un solo campo: también la usa la búsqueda de tu catálogo.",
      "Sube la foto de la ficha técnica y tus clientas la abren desde el catálogo, con zoom.",
      "En el catálogo, la descripción termina en «…»: tócala y se abre completa.",
    ],
  },
  {
    version: "0.47.0", fecha: "2026-10-08", titulo: "Tus clientes ya encuentran por precio.",
    cambios: [
      "Buscan por color, tamaño o descripción, no solo por nombre.",
      "Escriben «menos de 500» o «entre 500 y 1,500» y el catálogo lo entiende.",
      "Si nada cuesta eso, les muestra lo más cercano.",
    ],
  },
  {
    version: "0.46.0", fecha: "2026-10-08", titulo: "Publica tu catálogo tú sola.",
    cambios: [
      "Con 3 productos con foto, tocas «Publicar mi catálogo» y tus clientes ya lo ven en su enlace.",
      "Ya en línea, la tarjeta te deja compartir tu enlace con un toque.",
    ],
  },
  {
    version: "0.45.2", fecha: "2026-10-08", titulo: "Una sola lista, todo ahí mismo.",
    cambios: [
      "Cada cosa que cambia es una tarjeta: la tocas y se abre con sus valores.",
      "La cierras y queda un resumen, y «Quitar» la saca al instante.",
    ],
  },
  {
    version: "0.45.1", fecha: "2026-10-08", titulo: "Cambiar de catálogo, más a tu estilo.",
    cambios: [
      "El nombre del catálogo abre un menú propio, no el de iPhone.",
      "El botón + Producto siempre está abajo a la derecha, también en un catálogo vacío.",
    ],
  },
  {
    version: "0.45.0", fecha: "2026-10-08", titulo: "Qué cambia, más claro.",
    cambios: [
      "Al crear presentaciones eliges hasta 2 cosas que cambian (color, tamaño…) de una lista, en cualquier tienda.",
      "De cada una marcas cuáles tienes, o escribes la tuya.",
    ],
  },
  {
    version: "0.44.0", fecha: "2026-10-08", titulo: "Tus clientes ven por catálogo.",
    cambios: [
      "Si vendes de más de una cosa, tus clientes ahora pueden ver tu tienda por catálogo («Perfumes», «Accesorios»…) o todo junto.",
      "Lo cambian desde tu perfil o desde «Colecciones». Si vendes de un solo tipo, nada cambia.",
    ],
  },
  {
    version: "0.43.0", fecha: "2026-10-08", titulo: "Un catálogo a la vez.",
    cambios: [
      "Si vendes de más de una cosa, el nombre del catálogo es el título: tócalo y cambias de catálogo.",
      "Al crear un producto, el catálogo sale a la vista, fijo arriba.",
    ],
  },
  {
    version: "0.42.0", fecha: "2026-10-08", titulo: "Cada producto, de lo suyo.",
    cambios: [
      "Si vendes de más de una cosa, en Mi marca marcas «Lo que vendes» y cada producto lleva su tipo.",
      "En el catálogo filtras por tipo, y tus clientes también los buscan por tipo («ropa», «perfumes»).",
      "Si vendes de un solo tipo, nada cambia.",
    ],
  },
  {
    version: "0.41.0", fecha: "2026-10-08", titulo: "Un producto, todas sus presentaciones.",
    cambios: [
      "Tallas, colores o tamaños en un solo producto: eliges qué cambia y salen todas, cada una con su stock.",
      "Una presentación puede costar distinto, y cada color lleva la foto que tú elijas.",
      "En el catálogo ves «Desde RD$…» y cuántas se agotaron.",
    ],
  },
  {
    version: "0.40.0", fecha: "2026-10-07", titulo: "Tu equipo, cada uno en lo suyo.",
    cambios: [
      "En el menú, «Tu equipo»: invita por enlace o por correo y aprueba a quien entra.",
      "Eliges qué hace cada persona: Ayudante, Editor o Administrador. Lo puedes cambiar cuando quieras.",
      "Lo que alguien no puede hacer se ve apagado, con el porqué.",
    ],
  },
  {
    version: "0.39.0", fecha: "2026-10-06", titulo: "Tu marca, la guía del taller.",
    cambios: [
      "En «Mi marca» cuéntanos tu marca en 3 palabras y súbenos de 3 a 6 fotos que te gusten.",
      "Con tu marca lista, retocar sale a tu estilo. Sin ella, el botón te lleva a completarla.",
      "La primera vez que mandas una foto, te mostramos cómo funciona.",
    ],
  },
  {
    version: "0.38.0", fecha: "2026-10-06", titulo: "Tus tiendas, a un toque.",
    cambios: [
      "Si tienes más de una tienda, cámbiate de una a otra desde el menú del nombre.",
      "Ahí también ves tu cuenta de Google y sales de la sesión.",
      "En el admin, tu foto te lleva de vuelta a tu tienda.",
    ],
  },
  {
    version: "0.37.0", fecha: "2026-10-06", titulo: "Súbela y pídele retoque.",
    cambios: [
      "Al subir una foto nueva, enciende «Retocar esta foto» y se manda al taller cuando guardes el producto.",
      "Se reservan 5 créditos por foto marcada; se cobran al entregarla. Sigue en Beta.",
      "Si el taller no la recibe, el producto queda guardado y te avisamos.",
    ],
  },
  {
    version: "0.36.1", fecha: "2026-10-06", titulo: "El retoque llega en Beta.",
    cambios: [
      "No es un botón automático: la foto se retoca con tu marca como guía y expertos de Deslizapp en el camino. Por eso tarda.",
      "Lo verás marcado como Beta.",
    ],
  },
  {
    version: "0.36.0", fecha: "2026-10-06", titulo: "Tus fotos, al taller de verdad.",
    cambios: [
      "Toca una foto y «Retocar»: nuestro equipo le pone luz y fondo de estudio.",
      "Reservamos los créditos y se cobran al entregarla. Si no se puede, te decimos por qué y no pagas.",
      "La foto nueva aparece sola en tu producto.",
    ],
  },
  {
    version: "0.35.3", fecha: "2026-10-05", titulo: "Se va del catálogo. Su historia se queda.",
    cambios: ["Elimina un producto desde Editar sin borrar sus pedidos ni sus ajustes.", "Si quedan pedidos o personas esperando, puedes ocultarlo mientras los resuelves."],
  },
  {
    version: "0.35.2", fecha: "2026-10-05", titulo: "Tú eliges qué ocultar.",
    cambios: [
      "Selecciona los productos agotados que ya no quieres mostrar.",
      "El historial de ajustes y los likes del catálogo se ven más claros.",
    ],
  },
  {
    version: "0.35.1", fecha: "2026-10-05", titulo: "Likes, sin vueltas.",
    cambios: [
      "Los likes de tu catálogo se ven sin pastilla, debajo del corazón.",
      "La cifra sigue dentro de la foto, clara sobre fondos claros y oscuros.",
    ],
  },
  {
    version: "0.35.0", fecha: "2026-10-05", titulo: "Tu gente está esperando.",
    cambios: [
      "Avísame se ve en Inicio, en tu catálogo y en la vista previa del producto.",
      "En espera reúne lo que tu gente quiere ver volver, incluso si ya llegó.",
      "El corazón y los likes vuelven a su rincón dentro de la foto.",
    ],
  },
  {
    version: "0.34.0",
    fecha: "2026-10-05",
    titulo: "Tu vitrina, más clara.",
    cambios: [
      "Oculta o muestra un producto desde su vista previa.",
      "Likes y existencias se leen mejor en cada tarjeta.",
      "En el catálogo, el número va debajo del corazón y encima de su frase.",
      "El enlace de un pedido muestra hasta cuatro portadas juntas.",
    ],
  },
  {
    version: "0.33.1",
    fecha: "2026-10-05",
    titulo: "Cada pendiente cuenta.",
    cambios: [
      "El corazón te dice cuántas personas lo quieren.",
      "Nuevos y Pedidos cuentan también lo que falta registrar del catálogo.",
      "Al entrar con Google desde un pedido, vuelves directo a ese pedido.",
    ],
  },
  {
    version: "0.33.0",
    fecha: "2026-10-05",
    titulo: "Del catálogo a tus pedidos.",
    cambios: [
      "Registra lo que te pidieron con quien te escribió, sin perder el borrador.",
      "Los pedidos del catálogo por registrar también aparecen en Nuevos.",
      "Los me gusta se leen debajo del corazón, separados de la bolsita del pedido.",
      "Cuando repones una opción, puedes avisar a quienes la esperan.",
    ],
  },
  {
    version: "0.32.0",
    fecha: "2026-10-04",
    titulo: "Tu catálogo, conectado.",
    cambios: [
      "El catálogo nuevo refleja tus productos, opciones, precios y disponibilidad.",
      "Tus clientes pueden pedir por WhatsApp, recibir su enlace y avisarte qué esperan.",
      "El enlace público actual se conserva hasta revisar el catálogo nuevo.",
    ],
  },
  {
    version: "0.31.8",
    fecha: "2026-10-02",
    titulo: "Tus ventas, con las cuentas claras.",
    cambios: [
      "El gráfico distingue lo pagado y lo que falta por cobrar, incluidos los abonos parciales.",
      "Conserva los mismos pedidos y períodos para revisar tus importes.",
    ],
  },
  {
    version: "0.31.7",
    fecha: "2026-10-02",
    titulo: "Todo en su sitio.",
    cambios: [
      "Guardar y Descartar tienen el mismo espacio en Inventario.",
      "El historial se abre desde una fila clara, con flecha para seguir.",
    ],
  },
  {
    version: "0.31.6",
    fecha: "2026-10-02",
    titulo: "El inventario, más a mano.",
    cambios: [
      "Guarda o descarta la cantidad desde el mismo bloque de inventario.",
      "Abre su historial y vuelve sin perder lo que estabas editando.",
    ],
  },
  {
    version: "0.31.5",
    fecha: "2026-10-02",
    titulo: "Cuenta primero. Guarda después.",
    cambios: [
      "Una vista previa más compacta, con el inventario a mano.",
      "Ajusta cantidades desde la vista previa o al editar. Se guardan cuando tú confirmas.",
      "Mira el historial de ajustes, separado de tus ventas y pedidos.",
    ],
  },
  {
    version: "0.31.4",
    fecha: "2026-10-02",
    titulo: "El inventario, con su historia.",
    cambios: [
      "Ajusta unidades por reposición, daño, pérdida o corrección desde la vista previa.",
      "Cada cambio queda registrado y separado de tus pedidos y ventas.",
      "Las ventas siguen descontando existencias al despachar el pedido.",
    ],
  },
  {
    version: "0.31.3",
    fecha: "2026-10-02",
    titulo: "Mira el producto antes de editarlo.",
    cambios: [
      "Toca una tarjeta del Catálogo para revisar su foto, precio, estado y stock.",
      "Desde ahí puedes abrir el formulario de edición o empezar un pedido con ese producto elegido.",
    ],
  },
  {
    version: "0.31.2",
    fecha: "2026-10-02",
    titulo: "Tu pedido también se puede compartir.",
    cambios: [
      "Elige PDF o imagen al descargar el recibo de una venta.",
      "Compártelo desde la hoja de tu teléfono con un mensaje listo para enviar.",
    ],
  },
  {
    version: "0.31.1",
    fecha: "2026-10-02",
    titulo: "Tu pedido, listo para llevar.",
    cambios: [
      "Descarga en PDF o imagen un comprobante desde cada pedido despachado.",
      "El estado final ahora aparece al inicio de su hoja.",
    ],
  },
  {
    version: "0.30.0",
    fecha: "2026-10-02",
    titulo: "El historial, como tú decidas.",
    cambios: [
      "El gráfico del Resumen suma los pedidos por despachar y los distingue de lo ya entregado.",
      "Al borrar un contacto, eliges si conservar sus pedidos o borrar también su historial.",
    ],
  },
  {
    version: "0.29.1",
    funcion: "proximaJugada",
    fecha: "2026-10-02",
    titulo: "La jugada fluye.",
    cambios: [
      "La luz de Tus clientes se mueve con suavidad, sin bordes que se asomen.",
      "El brillo responde al elegir jugadas, abrir mensajes y ver más clientes.",
      "Con movimiento reducido, todo aparece directamente y la luz queda quieta.",
    ],
  },
  {
    version: "0.29.0",
    funcion: "proximaJugada",
    fecha: "2026-10-01",
    titulo: "Una jugada más a tu manera.",
    cambios: [
      "Tu próxima jugada aparece primero en Tus clientes, con cartas más claras y fáciles de abrir.",
      "Elige entre tres mensajes y edítalos antes de abrir WhatsApp.",
      "El brillo acompaña el recorrido sin tapar tus datos ni tus controles.",
    ],
  },
  {
    version: "0.28.0",
    funcion: "proximaJugada",
    fecha: "2026-10-01",
    titulo: "Tu próxima jugada.",
    cambios: [
      "En Tus clientes, descubre a quién podrías volver a saludar o conocer mejor.",
      "Cada jugada muestra su dato y un mensaje listo para editar en WhatsApp.",
      "Tú eliges a quién escribirle. La app nunca envía el mensaje sola.",
      "Las cartas se leen mejor y el brillo acompaña cada detalle desde que lo abres.",
    ],
  },
  {
    version: "0.27.0",
    fecha: "2026-10-01",
    titulo: "Cada foto en su lugar.",
    cambios: [
      "La foto de tu tienda ahora es redonda en la cabecera.",
      "Las miniaturas de productos en Pedidos se ven cuadradas, con las esquinas suaves.",
    ],
  },
  {
    version: "0.26.0",
    fecha: "2026-10-01",
    titulo: "Tu gente, de un vistazo.",
    cambios: [
      "En Catálogo, una dona te dice cuántos espacios libres te quedan en tu plan.",
      "En Clientes, otra te muestra quién repite, quién compró una vez y quién todavía no.",
      "Toca la dona para ver más; encuentra a los nuevos o dormidos y escríbeles por WhatsApp cuando quieras.",
    ],
  },
  {
    version: "0.25.0",
    fecha: "2026-10-01",
    titulo: "Tus promos, de un vistazo.",
    cambios: [
      "Toca una promo para ver su cupón, estado, fechas y usos antes de editarla o compartirla.",
      "Si pruebas otro tipo al editar, te explicamos cómo crear una copia en una hoja, sin perder tu borrador.",
    ],
  },
  {
    version: "0.24.0",
    fecha: "2026-10-01",
    titulo: "Otro tipo, una nueva promo.",
    cambios: [
      "El tipo de una promo queda fijo. Si quieres otro, puedes crear una copia con sus detalles listos.",
      "La anterior conserva su historial. Al guardar la nueva, tú decides si dejas ambas o terminas la anterior.",
    ],
  },
  {
    version: "0.23.0",
    fecha: "2026-09-30",
    titulo: "Menos sustos al cerrar.",
    cambios: [
      "En «Deben», tocar la tarjeta de un cliente ya la abre, la toques donde la toques.",
      "Si cierras una hoja con algo escrito, te preguntamos antes de tirarlo. Y «atrás» solo cierra la de arriba.",
      "Lo que eliges en los formularios de crédito se ve en rosa, con su check; los botones, en verde.",
    ],
  },
  {
    version: "0.22.0",
    fecha: "2026-09-30",
    titulo: "Fiar ya no es enredo.",
    cambios: [
      "Al crear un pedido, elige «A crédito»: cuánto te dio, cuándo quedó en pagar y cuánto te debe.",
      "Registra abonos, mira la barra llenarse y celebra cuando alguien termina de pagar.",
      "En Clientes, «Deben» te dice quién falta por pagar; un toque y le recuerdas por WhatsApp.",
    ],
  },
  {
    version: "0.21.0",
    fecha: "2026-09-30",
    titulo: "Vender es despachar.",
    cambios: [
      "Las ventas del Resumen ahora cuentan solo los pedidos que ya despachaste.",
      "Bajo tus ventas, «Por despachar» te dice cuánto te falta por entregar.",
      "El ticket promedio y lo más vendido también salen solo de lo despachado.",
    ],
  },
  {
    version: "0.20.0",
    fecha: "2026-09-30",
    titulo: "Tu catálogo, paso a paso.",
    cambios: [
      "En Catálogo, una tarjeta te cuenta en qué va el tuyo: pedido, armándose, listo para revisar o en línea.",
      "Pídelo con un toque, revísalo, pide cambios o publícalo cuando te encante.",
      "Cuando esté listo te avisamos, y en Inicio verás un aviso para revisarlo.",
    ],
  },
  {
    version: "0.19.0",
    fecha: "2026-09-30",
    titulo: "Tu catálogo en línea, a un toque.",
    cambios: [
      "En Catálogo, «Ver mi catálogo en línea»: ábrelo, copia el enlace o compártelo por WhatsApp.",
      "¿Aún no lo conectas? «Conectar mi catálogo» te lleva a Mi marca.",
    ],
  },
  {
    version: "0.18.0",
    fecha: "2026-09-30",
    titulo: "Tus cupones, como cupones.",
    cambios: [
      "Al elegir un cupón en un pedido ves los tickets en pequeño, con su porcentaje y cuántas veces se usó.",
      "El botón ahora dice «+ Agregar cupón», y al elegir uno el ticket se acomoda en el pedido.",
    ],
  },
  {
    version: "0.17.0",
    fecha: "2026-09-30",
    titulo: "Descuentos sin escribir.",
    cambios: [
      "En un pedido eliges el descuento de una lista: ves cuáles sirven y cuáles están pausados, vencidos o agotados.",
      "En Promos, un código puede tener límite de usos y se puede pausar.",
    ],
  },
  {
    version: "0.16.0",
    fecha: "2026-09-30",
    titulo: "Pedidos que se dejan corregir.",
    cambios: [
      "«Editar pedido»: cambia cliente, productos, código o fecha sin perder el número. Si ya se despachó, cambias cliente y fecha.",
      "Nueva pastilla «Cancelados», y ahí puedes reabrir o eliminar un pedido.",
    ],
  },
  {
    version: "0.15.0",
    fecha: "2026-09-30",
    titulo: "Códigos y pasos, a tu ritmo.",
    cambios: [
      "En el detalle de un pedido abierto puedes poner, cambiar o quitar el código de descuento: el total se acomoda solo.",
      "Toca un paso anterior de la línea de avance para volver a él. Si ya estaba despachado, el stock regresa.",
    ],
  },
  {
    version: "0.14.0",
    fecha: "2026-09-30",
    titulo: "Lo que ya vendiste también cuenta.",
    cambios: [
      "En «+ Pedido», el interruptor «Es una venta que ya hice» te deja poner la fecha real.",
      "Entra como despachada y tu Resumen la cuenta en su día. El stock solo baja si tú lo pides.",
    ],
  },
  {
    version: "0.13.0",
    fecha: "2026-09-30",
    titulo: "Ahora sí puedes echar para atrás.",
    cambios: [
      "En un pedido: «Volver a Recibido», «Deshacer despacho» (el stock regresa) y «Reabrir pedido».",
      "Las cifras y contadores se acomodan solos.",
    ],
  },
  {
    version: "0.12.2",
    fecha: "2026-09-30",
    titulo: "Fotos guardadas donde deben.",
    cambios: [
      "En tu tienda real, las fotos y el logo se guardan aparte y ligeros: tu catálogo carga más rápido.",
      "Si una foto pesa mucho o no es JPG, PNG o WebP, te lo decimos claro.",
    ],
  },
  {
    version: "0.12.1",
    fecha: "2026-09-30",
    titulo: "Las reglas, claras y a la vista.",
    cambios: ["Ya puedes leer nuestra Política de privacidad y los Términos de servicio, desde la entrada y desde el menú de tu tienda."],
  },
  {
    version: "0.12.0",
    fecha: "2026-09-30",
    titulo: "Tu tienda de verdad, con tu cuenta de Google.",
    cambios: [
      "Al abrir la app eliges: «Entrar con Google» para tu tienda real, o «Ver demo» para jugar con datos de prueba.",
      "En el menú de tu tienda está «Cerrar sesión» (o «Salir de la demo»).",
      "Si se cae el internet te avisamos arriba, con «Reintentar».",
    ],
  },
  {
    version: "0.11.2",
    fecha: "2026-09-29",
    titulo: "Listas largas, sin cansancio.",
    cambios: [
      "Tus pedidos y clientes se cargan de 30 en 30, con «Ver más antiguos» al final.",
      "El retoque de fotos ahora dice que es una demo. Y las notas a mano se leen mejor.",
    ],
  },
  {
    version: "0.11.1",
    fecha: "2026-09-29",
    titulo: "Más fácil de tocar, más fácil de leer.",
    cambios: ["Botones más cómodos para el pulgar y textos con mejor contraste. Inicio carga sin dar saltos."],
  },
  {
    version: "0.11.0",
    fecha: "2026-09-29",
    titulo: "Mira para atrás (y para adelante).",
    cambios: ["Ahora puedes ver tus ventas de meses anteriores y del año completo, y tocar una barra para ver solo ese día o mes."],
  },
  {
    version: "0.10.0",
    fecha: "2026-09-29",
    titulo: "Tu tienda, en números que se entienden.",
    cambios: [
      "Nuevo Inicio: ventas de hoy, 7 días o el mes, con gráfico y cuánto subiste.",
      "Tus pedidos, tu ticket promedio, tus aaahs, lo que más se vende y lo que se está agotando.",
    ],
  },
  {
    version: "0.9.0",
    fecha: "2026-09-29",
    titulo: "Un toque y a enviar.",
    cambios: ["Compartir una promo ahora es un solo botón, con tu marca. Y la puedes exportar como imagen o PDF."],
  },
  {
    version: "0.8.0",
    fecha: "2026-09-29",
    titulo: "Con tu sello.",
    cambios: ["Nuevo: Mi marca. Tus cupones ya llevan tu logo y tus colores."],
  },
  {
    version: "0.7.0",
    fecha: "2026-09-29",
    titulo: "Que tus promos salgan a pasear.",
    cambios: ["Ahora puedes compartir tus promos: texto, enlace o imagen."],
  },
  {
    version: "0.6.1",
    fecha: "2026-09-29",
    titulo: "Con su talón y todo.",
    cambios: ["Las promos ahora se ven como cupones."],
  },
  {
    version: "0.6.0",
    fecha: "2026-09-29",
    titulo: "Ponle un descuento y míralo deslizarse.",
    cambios: [
      "Ya puedes crear promos por producto, por colección o con un código, y el precio se actualiza solo en tu catálogo.",
      "Al pedir puedes aplicar un código de promo, y ves cuántos pedidos ha usado cada uno.",
    ],
  },
  {
    version: "0.5.3",
    fecha: "2026-09-29",
    titulo: "Todo en su sitio.",
    cambios: ["Al elegir productos, el buscador queda fijo y suave arriba, y el total te acompaña abajo con su botón «Listo»."],
  },
  {
    version: "0.5.2",
    fecha: "2026-09-29",
    titulo: "Armar pedidos, sin tanto scroll.",
    cambios: ["Buscar productos al armar un pedido y crear clientes ahora es más fácil."],
  },
  {
    version: "0.5.1",
    fecha: "2026-09-29",
    titulo: "Al cliente lo encuentras al vuelo.",
    cambios: ["Ahora buscas al cliente por nombre, teléfono o nota al crear un pedido, y puedes guardarle notas."],
  },
  {
    version: "0.5.0",
    fecha: "2026-09-29",
    titulo: "Tu gente, toda en un lugar.",
    cambios: [
      "Ya ves a tus clientes, cuánto han comprado y quién repite. Se arma solo con tus pedidos.",
      "¿Alguien nuevo? Agrégalo con «+ Cliente»: nombre y WhatsApp, y listo.",
    ],
  },
  {
    version: "0.4.1",
    fecha: "2026-09-29",
    titulo: "Con más cariño.",
    cambios: ["Estrenamos ilustraciones nuevas cuando una sección está vacía."],
  },
  {
    version: "0.4.0",
    fecha: "2026-09-29",
    titulo: "Del suspiro al despacho.",
    cambios: [
      "Ya puedes ver tus pedidos, confirmarlos y despacharlos. El stock se actualiza solito.",
      "¿Una venta que no llegó por el catálogo? Anótala con «+ Pedido».",
    ],
  },
  {
    version: "0.3.3",
    fecha: "2026-09-29",
    titulo: "Sin peso, sin pausas.",
    cambios: ["La app se siente más fluida: cambiar de pestaña ya es instantáneo."],
  },
  {
    version: "0.3.2",
    fecha: "2026-09-29",
    titulo: "Más espacio, más calma.",
    cambios: [
      "Las ventanas que suben desde abajo ahora van pegadas al borde y llegan casi hasta arriba: ves más de una vez.",
      "Al bajar por un formulario, el título se queda arriba con un desenfoque suave. Siempre sabes dónde estás.",
    ],
  },
  {
    version: "0.3.1",
    fecha: "2026-09-29",
    titulo: "Escribe tranquilo.",
    cambios: [
      "Arreglamos el teclado: ya puedes escribir sin que se cierre.",
    ],
  },
  {
    version: "0.3.0",
    fecha: "2026-09-29",
    titulo: "Ahora todo se desliza.",
    cambios: [
      "Cambiar de sección, filtrar tu catálogo o recibir un pedido ya no pega saltos: todo fluye.",
      "Los botones responden al toque y los números avisan cuando cambian. Tu pulgar lo va a notar.",
    ],
  },
  {
    version: "0.2.5",
    fecha: "2026-09-29",
    titulo: "Ahora flotan.",
    cambios: [
      "Las hojas cortas flotan sobre la pantalla con sus cuatro esquinas redondeadas. Súbelas y se pegan a los bordes, como en tu iPhone.",
    ],
  },
  {
    version: "0.2.4",
    fecha: "2026-09-29",
    titulo: "Con imán.",
    cambios: [
      "La barra de abajo ahora es una cápsula y el rosado se estira hacia tu dedo. Pásalo de largo y salta solito.",
      "Arreglamos las hojas que a veces quedaban despegadas del borde sin querer.",
    ],
  },
  {
    version: "0.2.3",
    fecha: "2026-09-29",
    titulo: "Todo se desliza mejor.",
    cambios: [
      "La barra de abajo ahora muestra el nombre de cada sección. Y la puedes deslizar con el dedo.",
      "Las hojas se cierran deslizando hacia abajo, y el título se queda quieto mientras bajas.",
    ],
  },
  {
    version: "0.2.2",
    fecha: "2026-09-29",
    titulo: "Todo más a la mano.",
    cambios: ["La barra de abajo ahora flota más cerca del borde. Tu pulgar te lo agradece."],
  },
  {
    version: "0.2.1",
    fecha: "2026-09-29",
    titulo: "Ya tienes tu cara.",
    cambios: [
      "Nuevo ícono al instalar la app: verde sobre crema, como tu tienda merece.",
    ],
  },
  {
    version: "0.2.0",
    fecha: "2026-09-29",
    titulo: "Tu vitrina ya tiene luz.",
    cambios: [
      "Tu catálogo completo: busca, filtra y edita sin salir de la vitrina.",
      "Retoca fotos con un toque: luz, fondo y color por 5 créditos.",
      "Instálala en tu celular. Parece app porque ya es app.",
      "Cuando haya algo nuevo, te avisamos. Tú solo tocas Actualizar.",
    ],
  },
  {
    version: "0.1.0",
    fecha: "2026-09-28",
    titulo: "Llegó tu panel.",
    cambios: [
      "Tu tienda, tus pedidos y tus créditos en un solo lugar.",
      "Tu plan y tus créditos a la vista. Si se te queda chiquito, nos escribes.",
    ],
  },
];

/** Las que se muestran: sin las de funciones apagadas. */
export const NOVEDADES: Novedad[] = TODAS.filter((n) => !n.funcion || FUNCIONES[n.funcion]);

/** La versión sale de todas las entradas, aunque la más nueva hable de una función apagada. */
export const VERSION_ACTUAL = TODAS[0]!.version;

/** Compara "0.10.0" con "0.9.2" como números, no como texto. */
export function compararVersiones(a: string, b: string): number {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (d !== 0) return d;
  }
  return 0;
}

/** Las versiones posteriores a `vista` (la última que la persona ya vio), de la más nueva a la más vieja. */
export function novedadesDesde(vista: string): Novedad[] {
  return NOVEDADES.filter((n) => compararVersiones(n.version, vista) > 0);
}
