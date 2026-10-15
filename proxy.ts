import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";
import { CABECERA_RUTA } from "@/lib/inicio/ruta";

export async function proxy(request: NextRequest) {
  // La ruta, para el layout del panel: solo en `/` lee las fotos de la página principal (app/(dashboard)/layout.tsx).
  request.headers.set(CABECERA_RUTA, request.nextUrl.pathname);
  return await updateSession(request);
}

export const config = {
  matcher: [
    // Todo menos archivos estáticos, imágenes, el service worker, el manifiesto, demo aislada y catálogos públicos (/catalogos/: páginas
    // estáticas sin sesión; el proxy no tiene nada que hacer ahí).
    "/((?!_next/static|_next/image|admin-demo(?:/|$)|catalogos/|favicon.ico|icon.png|sw.js|manifest.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|js|json|woff2?)$).*)",
  ],
};
