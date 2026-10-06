import { FichaTienda } from "@/components/admin/ficha-tienda";
export default async function DemoFichaPage({ params }: PageProps<"/admin-demo/tiendas/[id]">) {
  const { id } = await params;
  return <FichaTienda tiendaId={id} />;
}
