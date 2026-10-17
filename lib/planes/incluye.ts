// «Todos los planes traen» de /planes (docs/prompts/planes-incluye-y-preguntas.md §1): las cuatro tarjetas del carrusel. Puro:
// tests/planes.test.mjs. La vista previa de cada una se arma en components/planes/vistas-previas.tsx con piezas reales de la app.

export type IdIncluye = "bio" | "whatsapp" | "panel" | "clientes";

export type TarjetaIncluye = { id: IdIncluye; titulo: string; linea: string };

export const INCLUYE: TarjetaIncluye[] = [
  { id: "bio", titulo: "Tu catálogo en el link de tu bio", linea: "Tus clientes lo abren desde tu perfil, sin descargar nada." },
  { id: "whatsapp", titulo: "Pedidos por WhatsApp", linea: "Te llega completo: qué quiere, cuánto y a quién se lo mandas." },
  { id: "panel", titulo: "Panel de pedidos y existencias", linea: "Cada pedido con su estado, y sabes cuánto te queda." },
  { id: "clientes", titulo: "Clientes, abonos y lo pendiente", linea: "Quién te debe y cuánto, sin libreta." },
];
