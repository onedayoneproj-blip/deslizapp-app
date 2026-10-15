// Lee en el servidor las fotos de la página principal (lib/inicio/fotos.ts), guardadas una hora.
import { unstable_cache } from "next/cache";
import { fuentePublicaReal } from "../data/publica";
import { completarFotos, SLUG_TIENDA_INICIO, type FotoInicio } from "./fotos";

const leerFotosTienda = unstable_cache(
  async (): Promise<FotoInicio[]> => {
    const c = await fuentePublicaReal().catalogoPublico(SLUG_TIENDA_INICIO);
    if (!c) return [];
    return c.productos.flatMap((p) => {
      const foto = p.medios.find((m) => m.tipo === "foto")?.url;
      return foto ? [{ src: foto, nombre: p.nombre }] : [];
    });
  },
  ["inicio-fotos", SLUG_TIENDA_INICIO],
  { revalidate: 3600 },
);

export async function fotosInicio(): Promise<{ fotos: FotoInicio[]; deLaTienda: number }> {
  let deLaTienda: FotoInicio[] = [];
  try {
    deLaTienda = await leerFotosTienda();
  } catch {
    // Sin Supabase (desarrollo local) o sin conexión: las de respaldo.
  }
  return { fotos: completarFotos(deLaTienda), deLaTienda: deLaTienda.length };
}
