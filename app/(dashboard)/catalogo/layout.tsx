import { VistaCatalogo } from "@/components/catalogo/vista-catalogo";

// El Catálogo vive en el layout para que la búsqueda y el filtro sigan ahí al abrir y cerrar
// un producto: /catalogo/nuevo y /catalogo/[id] solo agregan la hoja encima.
export default function CatalogoLayout({ children }: LayoutProps<"/catalogo">) {
  return (
    <>
      <VistaCatalogo />
      {children}
    </>
  );
}
