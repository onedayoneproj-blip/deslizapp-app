import { AvisoRed } from "@/components/panel/aviso-red";
import { Encabezado } from "@/components/panel/encabezado";
import { NavInferior } from "@/components/panel/nav-inferior";
import { PantallaCarga } from "@/components/panel/pantalla-carga";
import { PantallaEntrada } from "@/components/panel/pantalla-entrada";
import { PanelUIProvider } from "@/components/panel/ui";
import { ToastProvider } from "@/components/toast";
import { DataProvider } from "@/lib/data/provider";

export default function DashboardLayout({ children }: LayoutProps<"/">) {
  return (
    <DataProvider cargando={<PantallaCarga />} entrada={<PantallaEntrada />}>
      <ToastProvider>
        <PanelUIProvider>
          <div className="mx-auto flex min-h-dvh max-w-[480px] flex-col bg-fondo min-[481px]:shadow-[0_0_40px_rgba(23,75,58,0.08)]">
            <Encabezado />
            <main className="flex-1 pb-[calc(var(--nav-abajo)+32px)]">{children}</main>
          </div>
          <NavInferior />
          <AvisoRed />
        </PanelUIProvider>
      </ToastProvider>
    </DataProvider>
  );
}
