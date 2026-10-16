import { exigirDemoInterna } from "@/lib/demo/acceso-servidor";
import { ProveedorDemo } from "@/lib/data/provider";
import { PantallaCarga } from "@/components/panel/pantalla-carga";

export default async function Layout({ children }: { children: React.ReactNode }) {
  await exigirDemoInterna();
  return <ProveedorDemo interna cargando={<PantallaCarga />}>{children}</ProveedorDemo>;
}
