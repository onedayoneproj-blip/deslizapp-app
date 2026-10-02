// Fotografías generadas de personas ficticias; nunca se muestran en modo real.
const RETRATOS_DEMO: Readonly<Record<string, string>> = {
  "a4000000-0000-4000-8000-000000000001": "/seed/clientes/carolina-pena.webp",
  "a4000000-0000-4000-8000-000000000002": "/seed/clientes/luis-marte.webp",
  "a4000000-0000-4000-8000-000000000003": "/seed/clientes/yeimy-rosario.webp",
  "a4000000-0000-4000-8000-000000000004": "/seed/clientes/anyelo-brito.webp",
  "a4000000-0000-4000-8000-000000000005": "/seed/clientes/paola-jimenez.webp",
  "a4000000-0000-4000-8000-000000000006": "/seed/clientes/ana-lucia-ferreira.webp",
  "a4000000-0000-4000-8000-000000000007": "/seed/clientes/marcos-peralta.webp",
  "a4000000-0000-4000-8000-000000000008": "/seed/clientes/wendy-sosa.webp"
};

export function fotoClienteDemo(modo: "demo" | "real", clienteId?: string): string | undefined {
  return modo === "demo" && clienteId ? RETRATOS_DEMO[clienteId] : undefined;
}

// Solo rutas SVG originales del seed: respeta fotos subidas y logos personalizados.
const FOTOS_ANTIGUAS: Readonly<Record<string, string>> = {
  "/seed/productos/oxana-black.svg": "/seed/productos/oxana-black.webp",
  "/seed/productos/majestic-kurt.svg": "/seed/productos/majestic-kurt.webp",
  "/seed/productos/parade.svg": "/seed/productos/parade.webp",
  "/seed/productos/wild-flower-gold.svg": "/seed/productos/wild-flower-gold.webp",
  "/seed/productos/zakat-z6.svg": "/seed/productos/zakat-z6.webp",
  "/seed/productos/she.svg": "/seed/productos/she.webp",
  "/seed/productos/intense-vanille.svg": "/seed/productos/intense-vanille.webp",
  "/seed/productos/urban-toy-bubble-gum.svg": "/seed/productos/urban-toy-bubble-gum.webp",
  "/seed/productos/mayar-natural-intense.svg": "/seed/productos/mayar-natural-intense.webp",
  "/seed/productos/kiara-pink.svg": "/seed/productos/kiara-pink.webp",
  "/seed/productos/tobillera-arena.svg": "/seed/productos/tobillera-arena.webp",
  "/seed/productos/anillo-brisa.svg": "/seed/productos/anillo-brisa.webp",
  "/seed/productos/choker-perla.svg": "/seed/productos/choker-perla.webp",
  "/seed/productos/pulsera-coral.svg": "/seed/productos/pulsera-coral.webp",
  "/seed/productos/collar-marea.svg": "/seed/productos/collar-marea.webp",
  "/seed/productos/aretes-luna-llena.svg": "/seed/productos/aretes-luna-llena.webp",
  "/seed/tiendas/esencias-michel.svg": "/seed/tiendas/esencias-michel.webp",
  "/seed/tiendas/luna-bisuteria.svg": "/seed/tiendas/luna-bisuteria.webp"
};

export function actualizarFotoDemo<T extends string | null>(url: T): T {
  return (url === null ? null : FOTOS_ANTIGUAS[url] ?? url) as T;
}
