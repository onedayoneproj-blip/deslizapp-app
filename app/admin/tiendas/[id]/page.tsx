import { FichaTienda } from "@/components/admin/ficha-tienda";

export default async function FichaTiendaPage({ params }: PageProps<"/admin/tiendas/[id]">) {
  const { id } = await params;
  return <FichaTienda tiendaId={id} />;
}
