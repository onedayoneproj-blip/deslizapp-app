import { PantallaPersonalizar } from "@/components/admin/pantalla-personalizar";

export default async function DemoPersonalizarPage({ params }: PageProps<"/admin-demo/tiendas/[id]/catalogo">) {
  const { id } = await params;
  return <PantallaPersonalizar tiendaId={id} />;
}
