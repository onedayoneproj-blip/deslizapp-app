import { Encabezado } from "@/components/panel/encabezado";
import { NavInferior } from "@/components/panel/nav-inferior";
import { PantallaCarga } from "@/components/panel/pantalla-carga";
import { ToastProvider } from "@/components/toast";
import { DataProvider } from "@/lib/data/provider";

export default function DashboardLayout({ children }: LayoutProps<"/">) {
  return (
    <DataProvider cargando={<PantallaCarga />}>
      <ToastProvider>
        <div className="mx-auto flex min-h-dvh max-w-[480px] flex-col bg-papel min-[481px]:shadow-[0_0_40px_rgba(23,75,58,0.08)]">
          <Encabezado />
          <main className="flex-1 pb-[calc(5.5rem+env(safe-area-inset-bottom))]">{children}</main>
        </div>
        <NavInferior />
      </ToastProvider>
    </DataProvider>
  );
}
