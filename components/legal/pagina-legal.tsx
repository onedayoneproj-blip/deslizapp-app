import Link from "next/link";
import type { ReactNode } from "react";
import { Isotipo, Logotipo } from "../marca";

export const CORREO_CONTACTO = "hola.deslizapp@gmail.com";

export type SeccionLegal = { titulo: string; parrafos?: ReactNode[]; lista?: ReactNode[] };

/**
 * Página pública de texto legal (Privacidad, Términos): sin login, sin menú inferior y sin datos.
 * Es un Server Component estático; no depende del modo demo ni de la sesión.
 */
export function PaginaLegal({ titulo, actualizada, secciones }: { titulo: string; actualizada: string; secciones: SeccionLegal[] }) {
  return (
    <div className="min-h-dvh bg-papel text-bosque">
      <header className="mx-auto flex max-w-[680px] items-center justify-between gap-4 px-6 pt-[calc(22px+env(safe-area-inset-top))] pb-2">
        <span className="flex items-center gap-2">
          <Isotipo tamano={26} />
          <Logotipo className="text-[22px]" />
        </span>
        <Link href="/" className="tocable flex items-center text-[15px] font-extrabold underline">
          Volver al inicio
        </Link>
      </header>
      <main className="mx-auto max-w-[680px] px-6 pt-6 pb-12">
        <h1 className="font-display text-[32px] leading-tight">{titulo}</h1>
        <p className="mt-2 text-[15px] text-suave">Última actualización: {actualizada}.</p>
        {secciones.map((s, i) => (
          <section key={s.titulo} className="mt-8">
            <h2 className="font-display text-[21px] leading-snug">
              {i + 1}. {s.titulo}
            </h2>
            {s.parrafos?.map((p, j) => (
              <p key={j} className="mt-2 text-[16.5px] leading-[1.65]">
                {p}
              </p>
            ))}
            {s.lista && (
              <ul className="mt-2 list-disc space-y-2 pl-6 text-[16.5px] leading-[1.65]">
                {s.lista.map((item, j) => (
                  <li key={j}>{item}</li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </main>
      <footer className="mx-auto max-w-[680px] border-t border-linea px-6 pt-5 pb-[calc(28px+env(safe-area-inset-bottom))] text-[15px]">
        Contacto:{" "}
        <a href={`mailto:${CORREO_CONTACTO}`} className="font-extrabold underline">
          {CORREO_CONTACTO}
        </a>
      </footer>
    </div>
  );
}
