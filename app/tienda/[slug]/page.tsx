import { cache } from "react";
import type { Metadata } from "next";
import { fuentePublicaReal } from "@/lib/data/publica";
import { Catalogo } from "@/components/tienda/catalogo";
import "../catalogo.css";
export const dynamic = "force-dynamic";
const leer = cache(async (slug: string) => {
  try {
    return await fuentePublicaReal().catalogoPublico(slug);
  } catch {
    return null;
  }
});
type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};
export async function generateMetadata({
  params,
  searchParams,
}: Props): Promise<Metadata> {
  const { slug } = await params;
  const demo = "demo" in (await searchParams);
  const c = demo ? null : await leer(slug);
  if (!c)
    return {
      title: "Catálogo · Deslizapp",
      robots: { index: false, follow: false },
    };
  const imagen =
    c.tienda.logoUrl ??
    c.tienda.fotoPerfilUrl ??
    c.productos[0]?.medios.find((m) => m.tipo === "foto")?.url;
  const descripcion =
    c.tienda.descripcion ??
    "Tu próximo aaah está aquí. Mira, elige y habla con la tienda.";
  return {
    title: c.tienda.nombre,
    description: descripcion,
    // Una tienda en prueba tiene catálogo público, pero sin indexar: los buscadores no la listan. Las vistas previas de
    // WhatsApp e Instagram (Open Graph, abajo) no dependen de esto. Las tiendas activas quedan como siempre (sin etiqueta).
    ...(c.tienda.indexable ? {} : { robots: { index: false, follow: false } }),
    openGraph: {
      title: c.tienda.nombre,
      description: descripcion,
      ...(imagen ? { images: [imagen] } : {}),
    },
  };
}
export default async function Pagina({ params, searchParams }: Props) {
  const { slug } = await params;
  const demo = "demo" in (await searchParams);
  const c = demo ? null : await leer(slug);
  return (
    <Catalogo
      slug={slug}
      demo={demo}
      inicial={c}
      errorInicial={
        !demo && !c ? "Este catálogo se está tomando un descanso." : undefined
      }
    />
  );
}
