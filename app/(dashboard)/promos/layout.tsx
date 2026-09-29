import { VistaPromos } from "@/components/promos/vista-promos";

// Promos vive en el layout para que la pestaña elegida siga ahí al abrir y cerrar una promo:
// /promos/nueva y /promos/[id] solo agregan la hoja encima.
export default function PromosLayout({ children }: LayoutProps<"/promos">) {
  return <VistaPromos>{children}</VistaPromos>;
}
