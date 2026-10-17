"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { registrarEvento } from "@/lib/medicion/registrar-evento";
import { DEDO_LLEGA, MENSAJE_LISTO, MENSAJE_PASO, MENSAJE_TOQUE, MENSAJE_VIAJE, PASOS, estadoPaso, indicePaso, type IdAncla, type IdTelefono, type MensajeDedo } from "@/lib/landing/pasos";

const REDUCIDO = "(prefers-reduced-motion: reduce)";
/** El ♥ mide esto sin escalar (landing.css .lt-hilo). */
const BASE_HILO = 100;
/**
 * Cuánto se queda el ♥ después del pulso: se va enseguida (el componente real reacciona entonces y en un like su burst es el
 * corazón: no se ven dos a la vez, ajustes-lewis-5.md). En «Despachar» se queda un momento, vuelto check.
 */
const QUEDA = 0;
const QUEDA_CHECK = 1300;
const VIAJE = 700;
/** En el cambio de lado, cuánto se ve «Pidió en segundos.» (rosa) antes de que los iconos se intercambien y todo pase a verde. */
const CAMBIO_LADO_MS = 900;
/** Cuánto tarda en llegar el ♥ al enlace del perfil, ya con el paso a la vista. */
const TOQUE_PERFIL_MS = 700;

type Punto = { x: number; y: number };

/**
 * La demo por pasos (referencias/landing/ajustes-lewis-2.md §3). Cada paso es una sección de la página con scroll-snap: al
 * llegar a una, este controlador la marca como activa (IntersectionObserver), le dice el paso a los dos teléfonos (iframes,
 * app/demo-landing) y mueve las burbujas, el fondo y el ♥. La animación de cada paso tiene su propio tiempo: siempre termina.
 * Al subir, lo mismo hacia atrás.
 */
export function DemoPasos({ children, pasos }: { children: ReactNode; pasos: ReactNode }) {
  const seccion = useRef<HTMLElement>(null);
  const escenario = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const raiz = document.documentElement;
    raiz.setAttribute("data-landing-js", "");
    const s = seccion.current;
    const e = escenario.current;
    if (!s || !e) return;
    const reducido = window.matchMedia(REDUCIDO);
    const marcos: Record<IdTelefono, HTMLIFrameElement | null> = {
      compradora: e.querySelector<HTMLIFrameElement>('iframe[data-telefono="compradora"]'),
      tienda: e.querySelector<HTMLIFrameElement>('iframe[data-telefono="tienda"]'),
    };
    const hilo = e.querySelector<HTMLElement>("[data-hilo]");
    const pulso = e.querySelector<HTMLElement>("[data-hilo-pulso]");
    // (por índice de paso: `cambio-lado` no tiene burbuja)
    const burbujas = PASOS.map((_, i) => e.querySelector<HTMLElement>(`[data-burbuja="${i}"]`));
    const gruesas = [...e.querySelectorAll<HTMLElement>("[data-raya-paso]")];
    const finas = [...e.querySelectorAll<HTMLElement>("[data-raya-fina]")];
    const reglaCaja = e.querySelector<HTMLElement>(".lt-indice");
    const regla = e.querySelector<HTMLElement>(".lt-indice-rayas");
    let activo = -1;
    let llenar = 0;
    let raf = 0;
    let irse = 0;
    let cambio = 0;
    let toquePerfil = 0;
    let posicion: Punto | null = null;

    // La barra de Safari y el rebote del scroll con el color del capítulo (ajustes-lewis-8.md §8): theme-color y el fondo de html y
    // body: arena en el dolor de antes, rosa en compras, verde en la tienda, y el del cierre al llegar a él. Al salir de la landing,
    // se devuelve lo que había.
    const tema = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    const temaAntes = tema?.content ?? null;
    const fondosAntes = [raiz.style.background, document.body.style.background];
    const cierre = document.getElementById("cierre");
    let enCierre = false;
    const pintarFondo = () => {
      const lado = e.dataset.lado;
      const variable = lado === "tienda" || lado === "inicio" ? "--marca-bosque" : lado === "antes" ? "--color-arena" : "--marca-rosa-fija";
      const color = enCierre && cierre ? getComputedStyle(cierre).backgroundColor : getComputedStyle(e).getPropertyValue(variable).trim();
      if (!color || color === "rgba(0, 0, 0, 0)") return;
      if (tema) tema.content = color;
      raiz.style.background = color;
      document.body.style.background = color;
    };
    let finalVisto = false;
    const obsCierre = new IntersectionObserver(([en]) => {
      enCierre = Boolean(en?.isIntersecting);
      // Medición (docs/18-medicion.md): llegó al final, una vez por visita.
      if (enCierre && !finalVisto) {
        finalVisto = true;
        registrarEvento("conoce_final");
      }
      pintarFondo();
    }, { threshold: 0.5 });
    if (cierre) obsCierre.observe(cierre);

    /**
     * El indicador (ajustes-lewis-7.md §1): la gruesa del paso, marcada al llegar; sus finas se llenan una a una con cada toque o
     * viaje del paso (o al acabar su tiempo, si no tiene toques). Los pasos de antes, llenos; los de después, vacíos.
     */
    const finasDe = (i: number) => finas.filter((f) => f.dataset.rayaFina === String(i));
    const marcarIndice = (i: number, animar: boolean) => {
      window.clearTimeout(llenar);
      gruesas.forEach((g) => {
        const j = Number(g.dataset.rayaPaso);
        g.dataset.estado = j === i ? "actual" : j < i ? "visto" : "falta";
        if (j === i) g.setAttribute("aria-current", "step");
        else g.removeAttribute("aria-current");
      });
      // La regla se desplaza para dejar la raya del paso en su centro.
      const actual = gruesas.find((g) => Number(g.dataset.rayaPaso) === i);
      if (actual && reglaCaja && regla) regla.style.setProperty("--regla", `${(reglaCaja.clientHeight / 2 - (actual.offsetTop + actual.offsetHeight / 2)).toFixed(1)}px`);
      finas.forEach((f) => {
        const j = Number(f.dataset.rayaFina);
        f.dataset.llena = j < i || (j === i && !animar) ? "si" : "no";
      });
      // Por si algún toque no llegó (o el paso no tiene toques): al acabar su tiempo, el paso queda completo.
      if (animar) llenar = window.setTimeout(() => finasDe(i).forEach((f) => (f.dataset.llena = "si")), PASOS[i]!.duracion + 300);
    };
    const llenarUna = () => {
      const f = finasDe(activo).find((x) => x.dataset.llena === "no");
      if (f) f.dataset.llena = "si";
    };
    /**
     * Las burbujas como un chat (ajustes-lewis-4.md y -8.md): la del paso arriba de su columna, con el borde bajo el teléfono; las
     * anteriores suben lo que ocupan (--sube) por detrás del teléfono y se van; las siguientes esperan pequeñas abajo a la derecha.
     */
    const apilar = (i: number) => {
      let y = 0;
      for (const b of burbujas.slice(i + 1)) {
        if (!b) continue;
        b.dataset.estado = "futura";
        b.style.removeProperty("--sube");
      }
      // La del paso, arriba de la columna (con el borde bajo el teléfono); las de antes suben por detrás del teléfono y se van.
      for (let j = i; j >= 0; j--) {
        const b = burbujas[j];
        if (!b) continue;
        if (j < i) y += b.offsetHeight + 6;
        b.style.setProperty("--sube", `${-y}px`);
        b.dataset.estado = j === i ? "actual" : "lejos";
      }
    };

    const mandar = (telefono: IdTelefono, paso: number, animar: boolean) => {
      marcos[telefono]?.contentWindow?.postMessage({ tipo: MENSAJE_PASO, paso, animar }, location.origin);
    };

    /** Un punto de un teléfono (px de su página de 393 de ancho) en px del escenario. */
    const enEscenario = (telefono: IdTelefono, x: number, y: number): Punto | null => {
      const marco = marcos[telefono];
      if (!marco) return null;
      const caja = marco.getBoundingClientRect();
      const base = e.getBoundingClientRect();
      const esc = caja.width / 393;
      return { x: caja.left - base.left + x * esc, y: caja.top - base.top + y * esc };
    };
    /** Dónde está un ancla de un viaje, en px del escenario. */
    const ancla = (telefono: IdTelefono, id: IdAncla): Punto | null => {
      let r = null;
      try {
        r = marcos[telefono]?.contentWindow?.__dzAncla?.(id) ?? null;
      } catch {
        r = null;
      }
      return r ? enEscenario(telefono, r.x, r.y) : null;
    };
    const tamano = () => Math.min(58, Math.max(38, Math.min(e.clientWidth, e.clientHeight) * 0.07));
    const poner = (p: Punto, escala = 1) => {
      posicion = p;
      const t = tamano() * escala;
      if (hilo) hilo.style.transform = `translate(${(p.x - BASE_HILO / 2).toFixed(1)}px, ${(p.y - BASE_HILO / 2).toFixed(1)}px) scale(${(t / BASE_HILO).toFixed(3)})`;
    };
    const esconder = () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(irse);
      if (hilo) hilo.dataset.visible = "no";
      posicion = null;
    };

    /** Lleva el ♥ desde donde está (o desde un poco más abajo, si no estaba) hasta `destino`, en `ms`, con un arco suave. */
    const llevar = (destino: () => Punto | null, ms: number, alLlegar: () => void, desde?: Punto | null) => {
      cancelAnimationFrame(raf);
      window.clearTimeout(irse);
      const b0 = destino();
      if (!hilo || !b0) return;
      const t0 = tamano();
      const origen = desde ?? (hilo.dataset.visible === "si" && posicion ? posicion : { x: b0.x + t0 * 0.7, y: b0.y + t0 * 1.6 });
      hilo.dataset.visible = "si";
      const inicio = performance.now();
      const cuadro = (ahora: number) => {
        const b = destino() ?? b0;
        const t = Math.min(1, (ahora - inicio) / ms);
        const k = t * t * (3 - 2 * t);
        const arco = Math.sin(Math.PI * k) * Math.min(90, Math.hypot(b.x - origen.x, b.y - origen.y) * 0.2);
        poner({ x: origen.x + (b.x - origen.x) * k, y: origen.y + (b.y - origen.y) * k - arco }, 1 + 0.25 * Math.sin(Math.PI * k));
        if (t < 1) raf = requestAnimationFrame(cuadro);
        else alLlegar();
      };
      raf = requestAnimationFrame(cuadro);
    };

    /** Un toque: el ♥ llega, hace el pulso (un círculo que se abre) y se va. En «Despachar», se vuelve check. */
    const toque = (p: Punto) => {
      llevar(() => p, DEDO_LLEGA - 40, () => {
        e.dataset.toques = String(Number(e.dataset.toques ?? 0) + 1);
        llenarUna();
        const check = PASOS[activo]?.id === "despachar";
        if (check) e.dataset.check = "si";
        pulso?.animate([{ opacity: 0.9, transform: "scale(.6)" }, { opacity: 0, transform: "scale(2.4)" }], { duration: 560, easing: "cubic-bezier(.2,.8,.2,1)" });
        irse = window.setTimeout(esconder, check ? QUEDA_CHECK : QUEDA);
      });
    };
    /** Un viaje: el ♥ lleva el pedido hasta `destino` y se desvanece al llegar. */
    const viaje = (destino: () => Punto | null, desde?: Punto | null) =>
      llevar(destino, VIAJE, () => {
        e.dataset.viajes = String(Number(e.dataset.viajes ?? 0) + 1);
        // (en un paso de viaje, el viaje es su fase; en uno de toques, sus rayas son los toques)
        if (PASOS[activo]?.dedo === "viaje") llenarUna();
        esconder();
      }, desde);

    // El teléfono de la tienda se carga cuando hace falta (o un momento después de abrir), no al primer pintado.
    const cargarTienda = () => {
      const m = marcos.tienda;
      if (m && !m.getAttribute("src")) m.setAttribute("src", m.dataset.src ?? "");
    };

    const pasosVistos = new Set<string>();
    const activar = (i: number) => {
      if (i === activo) return;
      const desde = activo;
      activo = i;
      // Medición: cada paso se cuenta una vez por visita, aunque se vuelva a él.
      if (PASOS[i] && !pasosVistos.has(PASOS[i].id)) {
        pasosVistos.add(PASOS[i].id);
        registrarEvento("conoce_paso", { paso: PASOS[i].id });
      }
      const animar = !reducido.matches && desde >= 0;
      const paso = PASOS[i]!;
      const est = estadoPaso(i);
      Object.assign(e.dataset, {
        paso: paso.id,
        indice: String(i),
        lado: paso.lado,
        telefono: paso.telefono,
        bolsa: String(est.bolsa),
        total: String(est.total),
        codigo: est.codigoVisible ? "si" : "no",
        check: "no",
        capitulo: String(paso.capitulo),
      });
      // El cambio de lado: llega rosa («Pidió en segundos.») y, un momento después, los iconos se intercambian y todo pasa a verde. Sin
      // animación (al abrir, al volver, movimiento reducido), se ve el final.
      window.clearTimeout(cambio);
      window.clearTimeout(toquePerfil);
      delete e.dataset.cambio;
      if (paso.escena === "cambio-lado" && animar) {
        e.dataset.cambio = "antes";
        e.dataset.lado = "compras";
        cambio = window.setTimeout(() => {
          e.dataset.cambio = "despues";
          e.dataset.lado = "tienda";
          pintarFondo();
        }, CAMBIO_LADO_MS);
      }
      marcarIndice(i, animar);
      apilar(i);
      pintarFondo();
      if (i >= indicePaso("aaah-tote")) cargarTienda();
      mandar("compradora", i, animar);
      mandar("tienda", i, animar);
      // El ♥ solo aparece cuando hace algo: con cada toque que avisa un teléfono, o en el viaje de un teléfono al otro.
      esconder();
      // El toque del perfil lo hace la propia landing (no hay página dentro del teléfono): el ♥ va al enlace.
      if (animar && paso.escena === "perfil") {
        toquePerfil = window.setTimeout(() => {
          const objetivo = e.querySelector<HTMLElement>('[data-objetivo-toque="perfil"]');
          if (!objetivo || activo !== i) return;
          const r = objetivo.getBoundingClientRect();
          const base = e.getBoundingClientRect();
          toque({ x: r.left - base.left, y: r.top - base.top });
        }, TOQUE_PERFIL_MS);
      }
      if (animar && paso.dedo === "viaje" && paso.viaje && i === desde + 1) {
        const { desde: [td, ad], hasta: [th, ah] } = paso.viaje;
        const salida = ancla(td, ad);
        irse = window.setTimeout(() => viaje(() => ancla(th, ah), salida), 450);
      }
    };
    const espera = window.setTimeout(cargarTienda, 2500);

    // Cuando un teléfono termina de cargar, se pone en el paso actual sin animación.
    const alMensaje = (ev: MessageEvent) => {
      if (ev.origin !== location.origin || ev.data?.tipo !== MENSAJE_LISTO) return;
      const telefono = (Object.keys(marcos) as IdTelefono[]).find((k) => marcos[k]?.contentWindow === ev.source);
      if (telefono && activo >= 0) mandar(telefono, activo, false);
    };
    // Un teléfono va a tocar algo, o lleva el pedido a un sitio: el ♥ va hasta ahí. Con movimiento reducido, no hay ♥.
    const alDedo = (ev: MessageEvent) => {
      const d = ev.data as MensajeDedo | undefined;
      if (ev.origin !== location.origin || (d?.tipo !== MENSAJE_TOQUE && d?.tipo !== MENSAJE_VIAJE) || reducido.matches) return;
      const telefono = (Object.keys(marcos) as IdTelefono[]).find((k) => marcos[k]?.contentWindow === ev.source);
      if (!telefono || telefono !== PASOS[activo]?.telefono) return;
      const p = enEscenario(telefono, d.x, d.y);
      if (!p) return;
      if (d.tipo === MENSAJE_TOQUE) toque(p);
      else viaje(() => p);
    };
    window.addEventListener("message", alDedo);
    window.addEventListener("message", alMensaje);

    // El paso activo: la sección que ocupa la pantalla. Un deslizamiento fuerte no se salta pasos: scroll-snap-stop lo frena
    // en el navegador y, si alguno lo deja pasar, aquí se vuelve al paso siguiente. Los enlaces («Saltar», «Ver la demo otra
    // vez») sí saltan.
    const secciones = [...s.querySelectorAll<HTMLElement>("[data-paso-seccion]")];
    let saltando = 0;
    const alClic = (ev: MouseEvent) => {
      if ((ev.target as Element | null)?.closest?.('a[href^="#"]')) saltando = Date.now();
    };
    document.addEventListener("click", alClic, true);
    // Medición: los botones del final («Ver la demo otra vez», vender, catálogo de ejemplo y entrar).
    const EVENTO_CIERRE = { "otra-vez": "conoce_cta_otra_vez", vender: "conoce_cta_vender", catalogo: "conoce_cta_catalogo", entrar: "conoce_cta_entrar" } as const;
    const alClicCierre = (ev: MouseEvent) => {
      const cta = (ev.target as Element | null)?.closest?.<HTMLElement>("#cierre [data-cta]")?.dataset.cta;
      if (cta && cta in EVENTO_CIERRE) registrarEvento(EVENTO_CIERRE[cta as keyof typeof EVENTO_CIERRE]);
    };
    document.addEventListener("click", alClicCierre, true);
    const obs = new IntersectionObserver(
      (entradas) => {
        for (const en of entradas) {
          if (!en.isIntersecting) continue;
          const i = Number((en.target as HTMLElement).dataset.pasoSeccion);
          // Solo frena saltos cortos (2 o 3 pasos, lo que deja pasar un deslizamiento fuerte); los largos son a propósito (Inicio, Fin).
          if (activo >= 0 && Math.abs(i - activo) > 1 && Math.abs(i - activo) <= 3 && Date.now() - saltando > 1500) {
            const siguiente = activo + Math.sign(i - activo);
            secciones[siguiente]?.scrollIntoView({ behavior: "instant" });
            activar(siguiente);
          } else activar(i);
        }
      },
      { threshold: 0.55 },
    );
    secciones.forEach((x) => obs.observe(x));
    window.addEventListener("resize", esconder);
    return () => {
      obs.disconnect();
      window.clearTimeout(espera);
      window.clearTimeout(llenar);
      window.clearTimeout(cambio);
      window.clearTimeout(toquePerfil);
      obsCierre.disconnect();
      if (tema && temaAntes !== null) tema.content = temaAntes;
      [raiz.style.background, document.body.style.background] = fondosAntes;
      esconder();
      window.removeEventListener("message", alMensaje);
      window.removeEventListener("message", alDedo);
      window.removeEventListener("resize", esconder);
      document.removeEventListener("click", alClic, true);
      document.removeEventListener("click", alClicCierre, true);
      raiz.removeAttribute("data-landing-js");
    };
  }, []);

  return (
    <section ref={seccion} id="demo" aria-label="Demo: un pedido de principio a fin" className="landing-demo">
      <div
        ref={escenario}
        className="lt-escenario"
        data-paso={PASOS[0]!.id}
        data-indice="0"
        data-lado={PASOS[0]!.lado}
        data-telefono="compradora"
        data-bolsa="0"
        data-total="0"
        data-codigo="no"
        data-check="no"
        data-capitulo="1"
        data-toques="0"
        data-viajes="0"
      >
        {children}
      </div>
      {pasos}
    </section>
  );
}
