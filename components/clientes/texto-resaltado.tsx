import type { Trozo } from "@/lib/texto";

/** Texto con las coincidencias de la búsqueda en negrita. */
export function TextoResaltado({ trozos }: { trozos: Trozo[] }) {
  return (
    <>
      {trozos.map((t, i) =>
        t.negrita ? (
          <b key={i} className="font-extrabold text-texto">
            {t.texto}
          </b>
        ) : (
          <span key={i}>{t.texto}</span>
        ),
      )}
    </>
  );
}
