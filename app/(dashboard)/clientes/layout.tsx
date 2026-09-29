import { VistaClientes } from "@/components/clientes/vista-clientes";

// Clientes vive en el layout para que la búsqueda siga ahí al abrir y cerrar un cliente:
// /clientes/nuevo y /clientes/[id] solo agregan la hoja encima.
export default function ClientesLayout({ children }: LayoutProps<"/clientes">) {
  return <VistaClientes>{children}</VistaClientes>;
}
