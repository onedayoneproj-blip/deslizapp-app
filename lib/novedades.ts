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
