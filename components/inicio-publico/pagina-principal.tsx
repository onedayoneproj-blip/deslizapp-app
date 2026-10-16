import type { FotoInicio } from "@/lib/inicio/fotos";
import { PortadaInicio } from "./portada-inicio";

/**
 * La página principal de deslizapp.com sin sesión (docs/prompts/pagina-principal-y-conoce.md, referencias/inicio/inicio.dc.html).
 * Todo su contenido vive en ./portada-inicio.tsx, que también usa el último reel de cada catálogo.
 */
export function PaginaPrincipal({ fotos }: { fotos: FotoInicio[] }) {
  return <PortadaInicio fotos={fotos} />;
}
