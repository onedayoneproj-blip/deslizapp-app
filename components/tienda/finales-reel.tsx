import type { CSSProperties } from "react";
import { textoSobre, TEXTO_OSCURO } from "@/lib/marca";
import type { FotoInicio } from "@/lib/inicio/fotos";
import { PortadaInicio } from "@/components/inicio-publico/portada-inicio";
import { Icono } from "./iconos";

export type SigueViendo = { id: string; nombre: string; foto: string };

/**
 * «Ya estás al día»: el cierre del catálogo como un reel más, con la marca de la tienda.
 * Los colores salen de `temaDeTienda` (llegan como `principal` y `acento`); las fuentes, de `--display` y `--body`.
 */
export function ReelFin({
  clase,
  principal,
  acento,
  usuario,
  perfil,
  nombreTienda,
  vacio,
  titulo,
  subtitulo,
  fotos,
  sigue,
  elegirSigue,
  etiquetaSigue,
  pedido,
  sinPedido,
  volver,
}: {
  clase: string;
  principal: string;
  acento: string;
  usuario: string;
  perfil: () => void;
  nombreTienda: string;
  /** Catálogo publicado sin productos: el texto de «pronto», sin fila ni botones. */
  vacio: boolean;
  titulo: string;
  subtitulo: string;
  /** Fotos del mosaico de fondo (hasta 4). Sin fotos, solo el color principal. */
  fotos: string[];
  sigue: SigueViendo[];
  elegirSigue: (id: string) => void;
  etiquetaSigue: string;
  pedido: {
    cantidad: number;
    total: string;
    etiqueta: string;
    fotos: string[];
    enviando: boolean;
    enviar: () => void;
    ver: () => void;
  } | null;
  sinPedido: string;
  volver: () => void;
}) {
  const claro = textoSobre(principal) === TEXTO_OSCURO;
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(principal.slice(i, i + 2), 16));
  const estilo = {
    "--rf-p": principal,
    "--rf-a": acento,
    "--rf-fg": claro ? TEXTO_OSCURO : "#fff",
    "--rf-velo": `rgba(${r}, ${g}, ${b}, ${claro ? 0.78 : 0.62})`,
    "--rf-sombra": claro ? "255, 255, 255" : "0, 0, 0",
  } as CSSProperties;
  const mosaico = fotos.length ? [0, 1, 2, 3].map((i) => fotos[i % fotos.length]!) : [];
  return (
    <article className={"reel fin rf" + (claro ? " rf-claro" : "") + (pedido ? " rf-con" : "") + clase} id="r-fin" data-id="fin" style={estilo}>
      <div className="media">
        <div className="rf-fondo" aria-hidden="true">
          {mosaico.map((f, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={i} src={f} alt="" loading="lazy" />
          ))}
        </div>
        <div className="rf-velo" aria-hidden="true" />
        <div className="rf-sombra" aria-hidden="true" />
        <div className="rf-medio">
        <div className="rf-centro">
          <span className="rf-anillo" aria-hidden="true">
            <span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12.5l4.2 4.2L19 7" />
              </svg>
            </span>
          </span>
          {vacio ? (
            <h2 data-catalogo-pronto="">{titulo}</h2>
          ) : (
            <h2>{titulo}</h2>
          )}
          <p>{subtitulo}</p>
        </div>
        {!vacio && sigue.length > 0 && (
          <nav className="rf-sigue" aria-label={etiquetaSigue}>
            <span className="rf-etiqueta">{etiquetaSigue}</span>
            <div>
              {sigue.map((s) => (
                <button key={s.id} type="button" onClick={() => elegirSigue(s.id)}>
                  <span className="rf-historia">
                    <span>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={s.foto} alt="" loading="lazy" />
                    </span>
                  </span>
                  <span className="rf-nombre">{s.nombre}</span>
                </button>
              ))}
            </div>
          </nav>
        )}
        </div>
        <div className="cap ov rf-pie">
          {vacio ? null : (
            <>
              <button className="who" data-profile onClick={perfil} aria-label={"Ver el perfil de " + nombreTienda}>
                <span className="av" aria-hidden="true" />
                {usuario}
              </button>
              {pedido ? (
                <>
                  <h3>{pedido.cantidad === 1 ? "Te gustó 1" : "Te gustaron " + pedido.cantidad}</h3>
                  <div className="rf-mini">
                    {pedido.fotos.slice(0, 3).map((f, i) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img key={i} src={f} alt="" />
                    ))}
                    <b>{pedido.total}</b>
                  </div>
                  <button type="button" className="rf-pedir" onClick={pedido.enviar} disabled={pedido.enviando}>
                    <Icono nombre="wa" />
                    {pedido.etiqueta}
                  </button>
                  <div className="rf-enlaces">
                    <button type="button" onClick={pedido.ver}>
                      Ver o cambiar mi pedido
                    </button>
                    <button type="button" onClick={volver}>
                      <FlechaArriba />
                      Volver al primero
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p className="rf-aviso">{sinPedido}</p>
                  <div className="rf-enlaces">
                    <button type="button" onClick={volver}>
                      <FlechaArriba />
                      Volver al primero
                    </button>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </article>
  );
}

const FlechaArriba = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 19V5M5 12l7-7 7 7" />
  </svg>
);

/**
 * El último reel: la página principal de deslizapp.com dentro del catálogo (components/inicio-publico/portada-inicio.tsx), con
 * las fotos y los nombres de los productos del catálogo que se está viendo. Ocupa la pantalla completa; sus columnas y lo vivo
 * solo se mueven con el reel `activo`.
 */
export function ReelDeslizapp({ activo, fotos }: { activo: boolean; fotos: FotoInicio[] }) {
  return (
    <article
      className={"reel rd" + (activo ? " on" : "")}
      id="r-deslizapp"
      data-id="deslizapp"
      aria-label="Deslizapp: catálogos como este para tu tienda"
    >
      <div className="media">
        <PortadaInicio fotos={fotos} modo="reel" activo={activo} />
      </div>
    </article>
  );
}
