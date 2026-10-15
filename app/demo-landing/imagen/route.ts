// La vista previa del enlace del pedido de la demo: la MISMA composición que /pedido/<código>/imagen
// (lib/tienda/render-imagen-pedido.tsx), con los productos de ejemplo. Sin leer nada de Supabase.
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { renderImagenPedido } from "@/lib/tienda/render-imagen-pedido";
import { vistaSolicitudDemo } from "@/lib/landing/db-demo";

export const runtime = "nodejs";
export const dynamic = "force-static";

// Las fotos del feed (referencias/landing/feed-*.png), recortadas al cuadrado centrado.
const FOTOS: Record<string, string> = { termo: "feed-termo.jpg", tote: "feed-tote.jpg" };

export async function GET() {
  const pedido = vistaSolicitudDemo();
  const fotos = await Promise.all(
    pedido.items.map(async (i) => {
      const archivo = Object.entries(FOTOS).find(([id]) => i.foto?.includes(id))?.[1];
      if (!archivo) return null;
      const b = await readFile(join(process.cwd(), "lib/landing/fotos", archivo));
      return `data:image/jpeg;base64,${b.toString("base64")}`;
    }),
  );
  return renderImagenPedido(pedido, fotos);
}
