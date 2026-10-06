import { cookies } from "next/headers";
import { RecuperarVerComo } from "@/components/admin/recuperar-ver-como";
import { COOKIE_RECUPERAR_VER_COMO, COOKIE_TIENDA_VER_COMO } from "@/lib/admin/ver-como";
export default async function RecuperarVerComoPage() {
  const jar = await cookies();
  return <RecuperarVerComo sesionId={jar.get(COOKIE_RECUPERAR_VER_COMO)?.value} tiendaId={jar.get(COOKIE_TIENDA_VER_COMO)?.value} />;
}
