import { PantallaPersonalizar } from "@/components/admin/pantalla-personalizar";

export default async function PersonalizarPage({ params }: PageProps<"/admin/tiendas/[id]/catalogo">) {
  const { id } = await params;
  return <PantallaPersonalizar tiendaId={id} />;
}
