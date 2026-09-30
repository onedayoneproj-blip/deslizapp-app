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
};

export const NOVEDADES: Novedad[] = [
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

export const VERSION_ACTUAL = NOVEDADES[0]!.version;

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
