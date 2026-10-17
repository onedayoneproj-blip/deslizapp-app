import Link from "next/link";
import type { FotoInicio } from "@/lib/inicio/fotos";
import { ENLACE_QUIERO_VENDER, RUTA_CONOCE } from "@/lib/landing/enlaces";
import type { PlanPublico } from "@/lib/planes/planes";
import { INCLUYE } from "@/lib/planes/incluye";
import { faqPageJsonLd, PREGUNTAS_PLANES } from "@/lib/planes/preguntas";
import { IconoClientes, IconoInstagram, IconoPedidos, IconoReels, IconoWhatsApp } from "../iconos";
import { FeedFondo } from "../inicio-publico/feed-fondo";
import "../inicio-publico/pagina-principal.css";
import { CarruselIncluye } from "./carrusel-incluye";
import { ListaPlanes } from "./lista-planes";
import { PreguntasChat } from "./preguntas-chat";
import { VistaPrevia } from "./vistas-previas";
import "./pagina-planes.css";

/** El icono de cada tarjeta de «Todos los planes traen» (los mismos de antes, ahora junto a su vista previa). */
const ICONO_INCLUYE = { bio: IconoInstagram, whatsapp: IconoWhatsApp, panel: IconoPedidos, clientes: IconoClientes } as const;

/**
 * La página pública de planes (docs/prompts/pagina-planes.md, referencias/planes/pagina-planes.dc.html): el estilo de la página
 * principal (fondo Bosque con el feed en columnas). Los precios y los límites vienen de la tabla `planes`, nunca del código.
 */
export function PaginaPlanes({ planes, fotos, ahora }: { planes: PlanPublico[]; fotos: FotoInicio[]; /** Cuándo se armó la página (ms): las fechas de los datos de ejemplo de las vistas previas salen de aquí. */ ahora: number }) {
  const tarjetas = INCLUYE.map((t) => {
    const Icono = ICONO_INCLUYE[t.id];
    return { ...t, icono: <Icono tamano={22} />, vista: <VistaPrevia id={t.id} ahora={ahora} /> };
  });
  return (
    <div className="pl" data-ini>
      <div className="pl-feed">
        <FeedFondo fotos={fotos} />
      </div>
      <header className="pl-arriba">
        <Link href="/" className="pl-logo tocable">
          {/* eslint-disable-next-line @next/next/no-img-element -- icono pequeño de la app, sin optimizador */}
          <img src="/icons/apple-touch-icon.png" alt="" width={36} height={36} />
          <span>deslizapp</span>
        </Link>
        <Link href="/" className="pl-entrar tocable">
          Iniciar sesión
        </Link>
      </header>

      <main className="pl-main">
        <span className="pl-sobre">planes</span>
        <h1 className="pl-titulo">
          Paga por lo que
          <br />
          vendes, <span className="pl-mandarina">no por</span>
          <br />
          <span className="pl-rosa">lo que guardas.</span>
        </h1>
        <p className="pl-sub">Cuentan los productos que tienes visibles en tu catálogo. Los que ocultas no ocupan cupo.</p>

        <ListaPlanes planes={planes} />

        <CarruselIncluye tarjetas={tarjetas} />

        <section className="pl-dudas" aria-labelledby="pl-dudas-t">
          <span className="pl-sobre">¿dudas?</span>
          <h2 id="pl-dudas-t">Pregúntanos</h2>
          <PreguntasChat />
          {/* Las mismas preguntas con sus respuestas, para quien no toca nada: lectores de pantalla y buscadores. */}
          <dl className="sr-only">
            {PREGUNTAS_PLANES.map((p) => (
              <div key={p.id}>
                <dt>{p.pregunta}</dt>
                <dd>{p.respuesta}</dd>
              </div>
            ))}
          </dl>
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqPageJsonLd()).replace(/</g, "\\u003c") }} />
        </section>

        <div className="pl-botones">
          <Link href={RUTA_CONOCE} className="pl-como tocable">
            <IconoReels tamano={20} strokeWidth={2.2} />
            Cómo funciona
          </Link>
          <a href={ENLACE_QUIERO_VENDER} target="_blank" rel="noopener noreferrer" className="pl-vender tocable">
            <IconoInstagram tamano={18} strokeWidth={2.2} />
            Escríbenos
          </a>
        </div>
        <p className="pl-pie">Precios en pesos dominicanos. Puedes cambiar de plan cuando quieras.</p>
      </main>
    </div>
  );
}
