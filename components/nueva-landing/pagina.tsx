import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { IconoWhatsApp } from "@/components/iconos";
import { Isotipo, Logotipo } from "@/components/marca";
import {
  CIERRE_INVITACION,
  CIERRE_TEXTO,
  CIERRE_TITULAR,
  INCLUYE_TODOS,
  NOTA_ACTIVAS,
  NOTA_FUNDADORAS,
  RUTA_DEMO,
  RUTA_ENTRAR_LANDING,
  SUBTITULAR,
  TITULAR,
  WHATSAPP_LEWIS_ES_PLACEHOLDER,
  enlaceQuieroVender,
} from "@/lib/nueva-landing/datos";
import { DemoTelefono } from "./demo-telefono";
import { Planes } from "./planes";
import "./nueva-landing.css";

const MARCA = "pedidos.";
const corte = TITULAR.indexOf(". ");
const primeraOracion = TITULAR.slice(0, corte);
const segundaOracion = TITULAR.slice(corte + 2);
const segundaSinMarca = segundaOracion.endsWith(MARCA) ? segundaOracion.slice(0, -MARCA.length) : segundaOracion;

const marcaWhatsapp = WHATSAPP_LEWIS_ES_PLACEHOLDER ? "placeholder" : "real";

function EnlaceVender({ children, className }: { children: ReactNode; className: string }) {
  return (
    <a
      className={className}
      href={enlaceQuieroVender()}
      target="_blank"
      rel="noopener noreferrer"
      data-whatsapp-lewis={marcaWhatsapp}
    >
      <IconoWhatsApp tamano={20} />
      {children}
      <span className="nl-sr">Se abre WhatsApp con un mensaje listo.</span>
    </a>
  );
}

export function PaginaNuevaLanding() {
  return (
    <div className="nl" data-pagina="nueva-landing">
      <a className="nl-saltar" href="#contenido">
        Saltar al contenido
      </a>
      <header className="nl-nav">
        <div className="nl-nav-interno">
          <div className="nl-logo">
            <Isotipo tamano={28} />
            <Logotipo className="nl-logo-tipo" />
          </div>
          <nav className="nl-nav-links" aria-label="En esta página">
            <a className="nl-ancla" href="#pedido">
              El pedido
            </a>
            <a className="nl-ancla" href="#planes">
              Planes
            </a>
            <Link className="nl-entrar" href={RUTA_ENTRAR_LANDING}>
              Iniciar sesión
            </Link>
          </nav>
        </div>
      </header>

      <main id="contenido">
        <section className="nl-hero nl-ancho">
          <div className="nl-hero-copia">
            <p className="nl-ceja">Para quien vende por el chat</p>
            <h1 className="nl-h1">
              {primeraOracion}.
              <br />
              {segundaSinMarca}
              <span className="nl-marca">{MARCA}</span>
            </h1>
            <p className="nl-bajada">{SUBTITULAR}</p>
            <div className="nl-ctas">
              <Link className="nl-cta nl-cta-principal" href={RUTA_DEMO}>
                Probar la demo
              </Link>
              <EnlaceVender className="nl-cta nl-cta-secundario">Quiero vender</EnlaceVender>
            </div>
            <p className="nl-acote">La demo es la de siempre: un pedido, de punta a punta.</p>
          </div>
          <div className="nl-bodegon" aria-hidden="true">
            <span className="nl-forma nl-forma-lila" />
            <span className="nl-forma nl-forma-coral" />
            <span className="nl-forma nl-forma-chinola" />
            <div className="nl-foto nl-foto-gorra">
              <Image src="/landing/feed-gorra.webp" alt="" fill sizes="(min-width: 960px) 220px, 40vw" />
            </div>
            <div className="nl-foto nl-foto-termo">
              <Image src="/landing/feed-termo.webp" alt="" fill sizes="(min-width: 960px) 340px, 70vw" priority />
            </div>
            <div className="nl-foto nl-foto-tote">
              <Image src="/landing/feed-tote.webp" alt="" fill sizes="(min-width: 960px) 240px, 46vw" />
            </div>
          </div>
        </section>

        <section className="nl-franja-banda" aria-label="Qué ordena deslizapp">
          <ul className="nl-franja nl-ancho">
            <li>
              <span className="nl-muestra nl-muestra-coral" aria-hidden="true" />
              <span>
                <strong>El pedido queda en un enlace.</strong>
                No se pierde entre los mensajes.
              </span>
            </li>
            <li>
              <span className="nl-muestra nl-muestra-chinola" aria-hidden="true" />
              <span>
                <strong>Clientes, abonos e inventario.</strong>
                Desde el celular, cuando te queda un rato.
              </span>
            </li>
            <li>
              <span className="nl-muestra nl-muestra-lila" aria-hidden="true" />
              <span>
                <strong>Sigues vendiendo por WhatsApp.</strong>
                Deslizapp lleva la cuenta.
              </span>
            </li>
          </ul>
        </section>

        <section className="nl-demo" id="pedido">
          <div className="nl-ancho nl-demo-grid">
            <div className="nl-demo-copia">
              <p className="nl-ceja">La clienta</p>
              <h2>Así arma el pedido.</h2>
              <p>Desliza el catálogo. El segundo toque es el aaah, y el producto entra a la bolsa. Pedir por WhatsApp arma el mensaje con el enlace.</p>
              <p className="nl-acote">Desde esta página no se envía nada. Es para probarlo con la mano.</p>
            </div>
            <DemoTelefono />
          </div>
        </section>

        <section className="nl-planes" id="planes">
          <div className="nl-ancho">
            <p className="nl-ceja">Los planes</p>
            <h2>Tres planes. El año sale en diez meses.</h2>
            <p className="nl-bajada nl-bajada-seccion">Mismo catálogo y el mismo pedido por WhatsApp. Cambia cuántas publicaciones, tiendas y personas entran.</p>
            <Planes />
            <div className="nl-planes-notas">
              <p>{INCLUYE_TODOS}</p>
              <p>{NOTA_ACTIVAS}</p>
              <p>{NOTA_FUNDADORAS}</p>
            </div>
          </div>
        </section>

        <section className="nl-cierre-banda">
          <div className="nl-cierre">
            <span className="nl-cierre-coral" aria-hidden="true" />
            <span className="nl-cierre-chinola" aria-hidden="true" />
            <div className="nl-cierre-copia">
              <h2>{CIERRE_TITULAR}</h2>
              <p>{CIERRE_TEXTO}</p>
              <EnlaceVender className="nl-cta nl-cta-principal">Escríbenos por WhatsApp</EnlaceVender>
              <p className="nl-cierre-nota">{CIERRE_INVITACION}</p>
            </div>
          </div>
        </section>
      </main>

      <footer className="nl-pie">
        <div className="nl-ancho nl-pie-interno">
          <Logotipo className="nl-logo-tipo" />
          <nav aria-label="Legal">
            <Link href="/privacidad">Privacidad</Link>
            <Link href="/terminos">Términos</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
