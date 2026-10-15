import { cookies } from "next/headers";
import { COOKIE_DEMO_INTERNA, puedeUsarDemoInterna } from "@/lib/demo/acceso-servidor";

function mismoOrigen(request: Request) {
  return request.headers.get("origin") === new URL(request.url).origin;
}
/** Recupera la entrada si caduca Google: solo elimina una selección que ya no está autorizada. */
export async function GET(request: Request) {
  if (!await puedeUsarDemoInterna()) (await cookies()).delete(COOKIE_DEMO_INTERNA);
  return new Response(null, { status: 303, headers: { Location: new URL("/entrar", request.url).href, "Cache-Control": "no-store" } });
}
export async function POST(request: Request) {
  if (!mismoOrigen(request) || !await puedeUsarDemoInterna()) return new Response(null, { status: 403 });
  (await cookies()).set(COOKIE_DEMO_INTERNA, "1", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/", maxAge: 3600 });
  return new Response(null, { status: 204 });
}
/** Salir no requiere Auth: solo retira la selección local y conserva la sesión Google. */
export async function DELETE(request: Request) {
  if (!mismoOrigen(request)) return new Response(null, { status: 403 });
  (await cookies()).delete(COOKIE_DEMO_INTERNA);
  return new Response(null, { status: 204 });
}
