import Link from "next/link";
import type { FotoInicio } from "@/lib/inicio/fotos";
import { ENLACE_QUIERO_VENDER, RUTA_CONOCE } from "@/lib/landing/enlaces";
import type { PlanPublico } from "@/lib/planes/planes";
import { IconoInstagram, IconoReels } from "../iconos";
import { FeedFondo } from "../inicio-publico/feed-fondo";
import "../inicio-publico/pagina-principal.css";
import { ListaPlanes } from "./lista-planes";
import "./pagina-planes.css";

const INCLUYE = ["Tu catálogo que se desliza", "Pedidos por WhatsApp", "Panel de pedidos y existencias", "Clientes, abonos y lo pendiente"];

/**
 * La página pública de planes (docs/prompts/pagina-planes.md, referencias/planes/pagina-planes.dc.html): el estilo de la página
 * principal (fondo Bosque con el feed en columnas). Los precios y los límites vienen de la tabla `planes`, nunca del código.
 */
export function PaginaPlanes({ planes, fotos }: { planes: PlanPublico[]; fotos: FotoInicio[] }) {
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
        <p className="pl-sub">Solo cuentan los productos publicados. Agotados, ocultos y borradores no ocupan cupo.</p>

        <ListaPlanes planes={planes} />

        <section className="pl-incluye" aria-labelledby="pl-incluye-t">
          <h2 id="pl-incluye-t">Todos los planes traen</h2>
          <ul>
            {INCLUYE.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </section>

        <aside className="pl-fundadoras" data-fundadoras>
          <span className="pl-fundadoras-sobre">¿eres de las primeras?</span>
          <h2>30 % menos todo el primer año</h2>
          <p>
            Para las tiendas fundadoras, después de los 30 días de prueba. Entras al <b>Círculo Deslizapp</b>: un aro de tres colores en
            tu tienda, el descuento con fecha clara y el aro es tuyo para siempre.
          </p>
          <a href={ENLACE_QUIERO_VENDER} target="_blank" rel="noopener noreferrer" className="pl-fundadoras-boton tocable">
            Quiero vender
          </a>
        </aside>

        <div className="pl-botones">
          <Link href={RUTA_CONOCE} className="pl-como tocable">
            <IconoReels tamano={20} strokeWidth={2.2} />
            Cómo funciona
          </Link>
          <a href={ENLACE_QUIERO_VENDER} target="_blank" rel="noopener noreferrer" className="pl-vender tocable">
            <IconoInstagram tamano={18} strokeWidth={2.2} />
            Quiero vender
          </a>
        </div>
        <p className="pl-pie">Precios en pesos dominicanos. Puedes cambiar de plan cuando quieras.</p>
      </main>
    </div>
  );
}
