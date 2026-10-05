import { cache } from "react";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { codigoPedidoValido, TAMANO_IMAGEN_PEDIDO, urlImagenPedido } from "@/lib/tienda/imagen-pedido";
import { fuentePublicaReal } from "@/lib/data/publica";
import { PedidoComprador } from "@/components/tienda/pedido-comprador";
import { dinero } from "@/lib/tienda/carrito";
import "../../tienda/catalogo.css";
export const dynamic = "force-dynamic";
const leer = cache(async (codigo: string) => {
  if (!codigoPedidoValido(codigo)) return { solicitud: null, error: false };
  try {
    return { solicitud: await fuentePublicaReal().verSolicitud(codigo), error: false };
  } catch {
    return { solicitud: null, error: true };
  }
});
type Props = {
  params: Promise<{ codigo: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};
export async function generateMetadata({
  params,
  searchParams,
}: Props): Promise<Metadata> {
  const { codigo } = await params;
  const s = "demo" in (await searchParams) ? null : (await leer(codigo)).solicitud;
  if (!s)
    return {
      title: "Tu pedido · Deslizapp",
      robots: { index: false, follow: false },
    };
  const title = "Tu pedido con " + s.tienda.nombre;
  const h = await headers();
  const host = h.get("host") ?? "";
  const origen = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}`
    : /^localhost(?::\d+)?$/.test(host) ? `http://${host}` : "https://deslizapp-app.vercel.app";
  const imagen = urlImagenPedido(codigo, origen)!;
  return {
    title,
    robots: { index: false, follow: false },
    openGraph: {
      title,
      description: `${s.items.length} ${s.items.length === 1 ? "producto" : "productos"} · ${dinero(s.total)}`,
      images: [{ url: imagen, ...TAMANO_IMAGEN_PEDIDO, type: "image/png", alt: `Productos de tu pedido con ${s.tienda.nombre}` }],
    },
  };
}
export default async function Pagina({ params, searchParams }: Props) {
  const { codigo } = await params;
  const demo = "demo" in (await searchParams);
  const resultado = demo ? null : await leer(codigo);
  const s = resultado?.solicitud ?? null;
  const catalogo = s ? await fuentePublicaReal().catalogoPublico(s.tienda.slug).catch(()=>null) : null;
  return (
    <PedidoComprador
      codigo={codigo}
      demo={demo}
      inicial={s}
      errorInicial={resultado?.error ?? false}
      inicialCatalogo={catalogo}
    />
  );
}
