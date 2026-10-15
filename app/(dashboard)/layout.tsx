import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { AvisoRed } from "@/components/panel/aviso-red";
import { Encabezado } from "@/components/panel/encabezado";
import { NavInferior } from "@/components/panel/nav-inferior";
import { PantallaCarga } from "@/components/panel/pantalla-carga";
import { PantallaEntrada } from "@/components/panel/pantalla-entrada";
import { PanelUIProvider } from "@/components/panel/ui";
import { InicioPublico } from "@/components/landing/inicio-publico";
import { PaginaPrincipal } from "@/components/inicio-publico/pagina-principal";
import { fotosInicio } from "@/lib/inicio/fotos-servidor";
import { RecuperarVerComo } from "@/components/admin/recuperar-ver-como";
import { COOKIE_RECUPERAR_VER_COMO, COOKIE_TIENDA_VER_COMO, COOKIE_VER_COMO } from "@/lib/admin/ver-como";
import type { SesionVerComo } from "@/lib/admin/tipos";
import { DataProvider, ProveedorSoloMirar } from "@/lib/data/provider";
import { createClient } from "@/lib/supabase/server";
import { HAY_SUPABASE } from "@/lib/supabase/config";
import { ToastProvider } from "@/components/toast";
import { ProveedorToast } from "@/components/ui";

export default function DashboardLayout({ children }: LayoutProps<"/">) {
  return <DashboardAutorizado>{children}</DashboardAutorizado>;
}

async function DashboardAutorizado({ children }: { children: ReactNode }) {
  const jar = await cookies();
  const recuperacion = jar.get(COOKIE_RECUPERAR_VER_COMO)?.value;
  const id = jar.get(COOKIE_VER_COMO)?.value;
  const tiendaId = jar.get(COOKIE_TIENDA_VER_COMO)?.value;
  if (recuperacion) return <RecuperarVerComo sesionId={recuperacion} tiendaId={tiendaId} />;
  if (!HAY_SUPABASE) return <SinSesion>{children}</SinSesion>;
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims?.sub) return <SinSesion>{children}</SinSesion>;
  const { data: esAdmin, error: errorAdmin } = await supabase.rpc("soy_admin");
  if (errorAdmin) return <RecuperarVerComo sesionId={id} tiendaId={tiendaId} />;
  if (esAdmin === true) {
    const { data, error } = await supabase.rpc("admin_ver_como_actual");
    if (error) return <RecuperarVerComo sesionId={id} tiendaId={tiendaId} />;
    if (data) {
      const fila = data as { id: string; tienda_id: string; vence_en: string; tienda_nombre: string };
      const sesion: SesionVerComo & { tiendaNombre: string } = { id: fila.id, tiendaId: fila.tienda_id, venceEn: fila.vence_en, tiendaNombre: fila.tienda_nombre };
      return <ProveedorSoloMirar sesion={sesion}><DashboardUI>{children}</DashboardUI></ProveedorSoloMirar>;
    }
  }
  if (id) return <RecuperarVerComo sesionId={id} tiendaId={tiendaId} />;
  return <DataProvider cargando={<PantallaCarga />} entrada={<PantallaEntrada />}><DashboardUI>{children}</DashboardUI></DataProvider>;
}

/**
 * Sin sesión en el servidor: en `/` se ve la página principal (pintada aquí, con las fotos de la tienda Deslizapp) y en el resto
 * la entrada de siempre. Si el navegador tiene la demo o una sesión, el DataProvider abre el panel igual que antes
 * (components/landing/inicio-publico.tsx). La landing con la demo vive en /conoce (app/conoce).
 */
async function SinSesion({ children }: { children: ReactNode }) {
  const { fotos } = await fotosInicio();
  const publico = <InicioPublico principal={<PaginaPrincipal fotos={fotos} />} />;
  return <DataProvider cargando={publico} entrada={publico}><DashboardUI>{children}</DashboardUI></DataProvider>;
}

function DashboardUI({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <ProveedorToast>
        <PanelUIProvider>
          <div className="mx-auto flex min-h-dvh max-w-[480px] flex-col bg-fondo min-[481px]:shadow-[0_0_40px_rgba(23,75,58,0.08)]">
            <Encabezado />
            <main className="flex-1 pb-[calc(var(--nav-abajo)+32px)]">{children}</main>
          </div>
          <NavInferior />
          <AvisoRed />
        </PanelUIProvider>
      </ProveedorToast>
    </ToastProvider>
  );
}
