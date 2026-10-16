"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { IconoCamion, IconoClientes, IconoCorazon, IconoPedidos } from "../iconos";

/** Cada cuánto aparece algo: un corazón y una burbuja, alternando. */
const CADA = 3500;
/** Cuánto se queda la burbuja antes de irse. */
const QUEDA_BURBUJA = 2800;

type Mensaje = { icono: ReactNode; texto: ReactNode };

function mensajes(producto: string): Mensaje[] {
  return [
    { icono: <IconoPedidos strokeWidth={2.2} />, texto: <>Nuevo pedido de <b>Ana</b> · RD$1,500</> },
    { icono: <IconoCorazon strokeWidth={2.2} />, texto: <><b>Carlos</b> le dio aaah a {producto}</> },
    { icono: <IconoCamion strokeWidth={2.2} />, texto: <>Despachado</> },
    { icono: <IconoClientes strokeWidth={2.2} />, texto: <>Te escribió una clienta</> },
  ];
}

const REDUCIDO = "(prefers-reduced-motion: reduce)";

/**
 * Lo «vivo» de la página principal: cada 3.5 s, alternando, un corazón mandarina con «aaah» sobre una foto del feed al azar y
 * una burbuja de WhatsApp (la de la landing) que crece desde abajo y se va. Todo con transform y opacity (pagina-principal.css).
 * Se pausa con la pestaña oculta (también las columnas). Con movimiento reducido, nada se mueve: una sola burbuja fija.
 * También pone el theme-color en verde.
 */
export function Vivo({ productos, activo = true, enPagina = true }: { productos: string[]; activo?: boolean; enPagina?: boolean }) {
  const raiz = useRef<HTMLSpanElement>(null);
  const [sitio, setSitio] = useState<HTMLElement | null>(null);
  const [burbuja, setBurbuja] = useState<{ i: number; n: number; saliendo: boolean } | null>(null);
  const [corazon, setCorazon] = useState<{ foto: HTMLElement; n: number } | null>(null);
  const [reducido, setReducido] = useState(false);

  // La barra de Safari y el rebote del scroll en verde Bosque; al salir, lo que había.
  useEffect(() => {
    // Solo la página principal pinta la barra y el fondo del documento; dentro de un catálogo no se tocan.
    if (!enPagina) return;
    const tema = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    const antes = tema?.content ?? null;
    const fondos = [document.documentElement.style.background, document.body.style.background];
    const verde = getComputedStyle(document.documentElement).getPropertyValue("--marca-bosque").trim() || "#174b3a";
    if (tema) tema.content = verde;
    document.documentElement.style.background = verde;
    document.body.style.background = verde;
    return () => {
      if (tema && antes !== null) tema.content = antes;
      [document.documentElement.style.background, document.body.style.background] = fondos;
    };
  }, [enPagina]);

  useEffect(() => {
    const ini = raiz.current?.closest<HTMLElement>("[data-ini]");
    if (!ini) return;
    // Dentro de un catálogo, lo vivo solo corre mientras el reel está a la vista.
    if (!activo) return;
    setSitio(ini.querySelector<HTMLElement>("[data-burbuja-sitio]"));
    const media = window.matchMedia(REDUCIDO);
    let tic = 0;
    let fuera = 0;
    let n = 0;
    let siguienteBurbuja = 0;

    const latido = () => {
      // Una foto con el centro a la vista y lejos del texto (debajo de él en el teléfono, a su lado en escritorio).
      const texto = ini.querySelector(".ini-texto")?.getBoundingClientRect();
      const lejosDelTexto = (c: { x: number; y: number }, margen: number) => !texto || c.x > texto.right + margen || c.y < texto.top - margen;
      const conCentro = [...ini.querySelectorAll<HTMLElement>(".ini-foto")].map((f) => {
        const r = f.getBoundingClientRect();
        return { f, c: { x: r.left + r.width / 2, y: r.top + r.height / 2 } };
      });
      const enPantalla = conCentro.filter(({ c }) => c.y > 0 && c.y < innerHeight && c.x > 0 && c.x < innerWidth && lejosDelTexto(c, 20));
      // Mejor una bien a la vista; si en ese momento no hay, cualquiera con el centro en pantalla y fuera del texto.
      const bien = enPantalla.filter(({ c }) => c.y > 110 && c.y < innerHeight - 80 && c.x > 50 && c.x < innerWidth - 50 && lejosDelTexto(c, 70));
      const opciones = bien.length ? bien : enPantalla;
      const foto = opciones[Math.floor(Math.random() * opciones.length)]?.f;
      // Va dentro de la foto: sube con ella.
      if (foto) setCorazon({ foto, n: ++n });
    };
    const nuevaBurbuja = () => {
      const i = siguienteBurbuja;
      siguienteBurbuja = (siguienteBurbuja + 1) % 4;
      setBurbuja({ i, n: ++n, saliendo: false });
      window.clearTimeout(fuera);
      fuera = window.setTimeout(() => setBurbuja((b) => (b ? { ...b, saliendo: true } : b)), QUEDA_BURBUJA);
    };
    let turno = 0;
    const paso = () => {
      if (turno++ % 2 === 0) nuevaBurbuja();
      else latido();
    };
    const parar = () => {
      window.clearInterval(tic);
      window.clearTimeout(fuera);
      tic = 0;
    };
    const arrancar = () => {
      parar();
      setReducido(media.matches);
      if (media.matches) {
        // Quieto: una sola burbuja fija, sin corazones.
        setCorazon(null);
        setBurbuja({ i: 0, n: ++n, saliendo: false });
        return;
      }
      if (document.hidden) return;
      paso();
      tic = window.setInterval(paso, CADA);
    };
    const visibilidad = () => {
      ini.dataset.oculta = document.hidden ? "si" : "no";
      if (document.hidden) parar();
      else if (!tic) arrancar();
    };
    arrancar();
    document.addEventListener("visibilitychange", visibilidad);
    media.addEventListener("change", arrancar);
    return () => {
      parar();
      document.removeEventListener("visibilitychange", visibilidad);
      media.removeEventListener("change", arrancar);
    };
  }, [activo]);

  // Carlos le da aaah a otro producto de la tienda cada vez que sale.
  const producto = productos.length ? productos[(burbuja?.n ?? 0) % productos.length]! : "La Gorrita";
  const m = burbuja ? mensajes(producto)[burbuja.i]! : null;

  return (
    <span ref={raiz} className="ini-vivo">
      {activo &&
        corazon &&
        !reducido &&
        createPortal(
          <span key={corazon.n} className="ini-latido" aria-hidden="true" onAnimationEnd={() => setCorazon(null)}>
            <svg viewBox="0 0 24 24">
              <path d="M12 20.5s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.6a4.3 4.3 0 0 1 7.5 2.7c0 5.6-7.5 10.2-7.5 10.2z" />
            </svg>
            <b>aaah</b>
          </span>,
          corazon.foto,
        )}
      {activo &&
        sitio &&
        m &&
        burbuja &&
        createPortal(
          <div key={burbuja.n} className="ini-burbuja" data-saliendo={burbuja.saliendo ? "si" : "no"} data-burbuja-inicio={burbuja.i}>
            <p>
              <span className="ini-burbuja-icono">{m.icono}</span>
              <span>{m.texto}</span>
            </p>
            <span className="ini-burbuja-hora">
              ahora
              <svg className="ini-checks" viewBox="0 0 18 11">
                <path pathLength={1} d="M1 5.4l3.8 4L11.2 1.4" />
                <path pathLength={1} d="M7 7.6l1.8 1.8L15.2 1.4" />
              </svg>
            </span>
            <svg className="ini-burbuja-cola" viewBox="0 0 34 22">
              <path d="M18 0V9C18 15 20.8 19.6 30 22C22 22.8 16.6 21.6 13.2 19.4C9.4 21.2 4.6 22 0 22V0Z" />
            </svg>
          </div>,
          sitio,
        )}
    </span>
  );
}
