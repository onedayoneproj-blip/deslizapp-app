import Image from "next/image";
import type { CSSProperties } from "react";
import type { FotoInicio } from "@/lib/inicio/fotos";

/** Segundos por vuelta de cada columna del feed (cada una a su velocidad) y dónde empieza cada una. */
const COLUMNAS = [
  { vuelta: 60, desfase: -40 },
  { vuelta: 45, desfase: 70 },
  { vuelta: 75, desfase: -10 },
  { vuelta: 52, desfase: 40 },
  { vuelta: 68, desfase: -60 },
  { vuelta: 48, desfase: 20 },
];
/** Fotos por columna (antes de duplicarla para el bucle): de sobra para llenar el alto, también en escritorio. */
const FOTOS_POR_COLUMNA = 9;

const HOST_SUPABASE = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").hostname;
  } catch {
    return "";
  }
})();
/** ¿Puede pasar por el optimizador de imágenes? Rutas propias y las fotos públicas de Supabase (next.config.ts); el resto, tal cual. */
function optimizable(src: string): boolean {
  if (src.startsWith("/")) return !src.startsWith("//");
  try {
    const u = new URL(src);
    return u.protocol === "https:" && u.hostname === HOST_SUPABASE && u.pathname.startsWith("/storage/v1/object/public/");
  } catch {
    return false;
  }
}

/** Cada columna empieza en otra foto, para que no se vean en fila. */
function columna(fotos: FotoInicio[], k: number): FotoInicio[] {
  return Array.from({ length: FOTOS_POR_COLUMNA }, (_, i) => fotos[(i + k * 2) % fotos.length]!);
}

/**
 * El feed de fondo de la página principal y de /planes: columnas de fotos que suben sin parar y el velo suave de arriba.
 * Los estilos son los de ./pagina-principal.css (`.ini-feed`, `.ini-columnas`…). `reel`: dentro del catálogo (la primera foto no es prioritaria).
 */
export function FeedFondo({ fotos, reel = false }: { fotos: FotoInicio[]; reel?: boolean }) {
  return (
    <>
      <div className="ini-feed" aria-hidden="true">
        {fotos.length > 0 && (
          <div className="ini-columnas">
            {COLUMNAS.map((c, k) => (
              <div key={k} className="ini-columna" style={{ "--vuelta": `${c.vuelta}s`, "--desfase": `${c.desfase}px` } as CSSProperties}>
                {/* La lista dos veces: al subir media tira, vuelve al principio sin que se note. */}
                <div className="ini-tira">
                  {[...columna(fotos, k), ...columna(fotos, k)].map((f, i) => (
                    <div key={i} className="ini-foto" data-foto-inicio={f.src}>
                      <Image
                        src={f.src}
                        alt=""
                        fill
                        sizes="(min-width: 900px) 260px, 230px"
                        quality={70}
                        loading={!reel && i < 3 ? "eager" : "lazy"}
                        unoptimized={!optimizable(f.src)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="ini-velo" aria-hidden="true" />
    </>
  );
}
