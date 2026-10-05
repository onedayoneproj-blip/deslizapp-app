import { fuentePublicaReal } from "@/lib/data/publica";
import { SUPABASE_URL } from "@/lib/supabase/config";
import { codigoPedidoValido, portadasPedido } from "@/lib/tienda/imagen-pedido";
import { descargarFotoPedido } from "@/lib/tienda/foto-pedido-servidor";
import { renderImagenPedido } from "@/lib/tienda/render-imagen-pedido";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(_request: Request, { params }: { params: Promise<{ codigo: string }> }) {
  const { codigo } = await params;
  if (!codigoPedidoValido(codigo)) return new Response("Pedido no válido", { status: 404 });
  let pedido;
  try { pedido = await fuentePublicaReal().verSolicitud(codigo); }
  catch { return new Response("No pudimos leer el pedido", { status: 503, headers: { "Cache-Control": "no-store" } }); }
  if (!pedido) return new Response("Pedido no encontrado", { status: 404, headers: { "Cache-Control": "no-store" } });
  const fotos = await Promise.all(portadasPedido(pedido.items).portadas.map(p => descargarFotoPedido(p.foto, SUPABASE_URL)));
  return renderImagenPedido(pedido, fotos);
}
