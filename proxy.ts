import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    // Todo menos archivos estáticos, imágenes, el service worker y el manifiesto.
    "/((?!_next/static|_next/image|favicon.ico|icon.png|sw.js|manifest.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|js|json|woff2?)$).*)",
  ],
};
