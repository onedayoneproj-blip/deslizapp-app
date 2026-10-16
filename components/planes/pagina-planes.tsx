import Link from "next/link";
import type { FotoInicio } from "@/lib/inicio/fotos";
import { ENLACE_QUIERO_VENDER, RUTA_CONOCE } from "@/lib/landing/enlaces";
import type { PlanPublico } from "@/lib/planes/planes";
import { IconoBolsa, IconoChispa, IconoClientes, IconoCorazon, IconoInstagram, IconoPedidos, IconoReels, IconoWhatsApp } from "../iconos";
import { LogoTienda } from "../panel/logo-tienda";
import { TicketPromo } from "../promos/ticket-promo";
import type { DatosCupon } from "@/lib/cupon";
import { FeedFondo } from "../inicio-publico/feed-fondo";
import "../inicio-publico/pagina-principal.css";
import { ListaPlanes } from "./lista-planes";
import "./pagina-planes.css";

const INCLUYE = [
  { Icono: IconoInstagram, texto: "Tu catálogo en el link de tu bio" },
  { Icono: IconoWhatsApp, texto: "Pedidos por WhatsApp" },
  { Icono: IconoPedidos, texto: "Panel de pedidos y existencias" },
  { Icono: IconoClientes, texto: "Clientes, abonos y lo pendiente" },
];

/** Los cuatro beneficios del Círculo Deslizapp (docs/14, referencias/circulo/tarjeta-planes.dc.html). */
const BENEFICIOS_CIRCULO = [
  { Icono: IconoChispa, titulo: "Estrena las funciones", bajada: "Pruébalas antes que nadie." },
  { Icono: IconoBolsa, titulo: "Tu bienvenida viene con extras", bajada: "Créditos y regalos de merch." },
  { Icono: IconoWhatsApp, titulo: "Habla directo con Lewis", bajada: "Una conversación, sin tanta vuelta." },
  { Icono: IconoCorazon, titulo: "Tu aro se queda contigo", bajada: "El sello del Círculo es tuyo para siempre." },
];

/** El avatar de ejemplo con el aro del Círculo (el mismo de LogoTienda, opción 6). */
/**
 * El 30 % de las fundadoras como el cupón de la app. `porcentaje` lleva un espacio fino sin corte al final para que TicketPromo,
 * que le pega el «%», muestre «30 %» sin tocar el componente.
 */
const CUPON_CIRCULO: DatosCupon = {
  porcentaje: "30\u00a0",
  bajoPorcentaje: "DE DESCUENTO",
  tipo: "Círculo Deslizapp",
  titulo: "En tu plan",
  esCodigo: false,
  detalle: "Todo el primer año",
  fechas: "Después de tu prueba",
  aviso: null,
};

const TIENDA_EJEMPLO = { nombre: "Tu tienda", logoUrl: null, circulo: { desde: "2026-10-16", descuentoHasta: null } };

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
            {INCLUYE.map(({ Icono, texto }) => (
              <li key={texto}>
                <Icono tamano={22} />
                {texto}
              </li>
            ))}
          </ul>
        </section>

        <aside className="pl-circulo" data-fundadoras aria-labelledby="pl-circulo-t">
          {/* Aire alrededor: las ondas crecen hasta ~1,45 veces y no se recortan ni empujan el texto. */}
          <div className="pl-circulo-aro">
            <LogoTienda tienda={TIENDA_EJEMPLO} tamano={120} animacion="ondas" />
          </div>
          <span className="pl-circulo-sobre">Para las primeras tiendas</span>
          <h2 id="pl-circulo-t">
            Llegaste primero.
            <br />
            Te toca más.
          </h2>
          <p className="pl-circulo-mano">Como los Close Friends de Instagram, pero con beneficios.</p>

          {/* El cupón de la app (TicketPromo, igual que las promos del panel), sin código: no hay nada que canjear. Sin sombra. */}
          <div className="pl-circulo-cupon" data-cupon-circulo="">
            <TicketPromo d={CUPON_CIRCULO} apagado={false} />
          </div>

          <ul className="pl-circulo-beneficios">
            {BENEFICIOS_CIRCULO.map(({ Icono, titulo, bajada }) => (
              <li key={titulo}>
                <span className="pl-circulo-icono" aria-hidden="true">
                  <Icono tamano={24} />
                </span>
                <span>
                  <b>{titulo}</b>
                  <span>{bajada}</span>
                </span>
              </li>
            ))}
          </ul>

          <a href={ENLACE_QUIERO_VENDER} target="_blank" rel="noopener noreferrer" className="pl-circulo-boton tocable">
            Quiero ser parte
          </a>
          <span className="pl-circulo-nota">Por invitación, mientras haya lugar.</span>
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
