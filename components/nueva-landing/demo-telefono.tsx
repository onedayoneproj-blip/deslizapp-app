"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { flushSync } from "react-dom";
import { IconoWhatsApp } from "@/components/iconos";
import { formatearPesos } from "@/lib/formato";
import { ENLACE_MUESTRA, PISTA_AAAH, PISTA_DESLIZA, PRODUCTOS_LANDING, mensajeMuestra, type ProductoLanding } from "@/lib/nueva-landing/datos";

const UMBRAL_DESLIZAR = 46;
const UMBRAL_TOQUE = 14;
const DOBLE_TOQUE_MS = 340;

function Corazon({ tamano = 28 }: { tamano?: number }) {
  return (
    <svg width={tamano} height={tamano} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 20.2s-6.8-4.2-6.8-9.1C5.2 8.4 7.3 6.5 9.6 6.5c1.3 0 2.5.6 3.4 1.7.9-1.1 2.1-1.7 3.4-1.7 2.3 0 4.4 1.9 4.4 4.6 0 4.9-6.8 9.1-6.8 9.1z"
      />
    </svg>
  );
}

/**
 * Mini catálogo dentro de un marco de teléfono: deslizar (dedo, rueda o arrastre),
 * doble toque para el aaah y una muestra del mensaje de WhatsApp. No envía nada.
 */
export function DemoTelefono() {
  const [indice, setIndice] = useState(0);
  const [arrastre, setArrastre] = useState(0);
  const [gustados, setGustados] = useState<string[]>([]);
  const [pista, setPista] = useState(true);
  const [latido, setLatido] = useState(0);
  const [muestra, setMuestra] = useState(false);
  const [aviso, setAviso] = useState("");
  const reelRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const pedirRef = useRef<HTMLButtonElement>(null);
  const indiceRef = useRef(0);
  const gustadosRef = useRef<string[]>([]);
  const gesto = useRef<{ x: number; y: number } | null>(null);
  const ultimoToque = useRef(0);

  const producto = PRODUCTOS_LANDING[indice]!;
  const elegidos = gustados
    .map((id) => PRODUCTOS_LANDING.find((p) => p.id === id))
    .filter((p): p is ProductoLanding => Boolean(p));
  const ultimo = PRODUCTOS_LANDING.length - 1;

  const mover = useCallback((delta: number) => {
    const i = indiceRef.current;
    const n = Math.max(0, Math.min(PRODUCTOS_LANDING.length - 1, i + delta));
    if (n === i) return;
    indiceRef.current = n;
    setIndice(n);
    setPista(false);
    const siguiente = PRODUCTOS_LANDING[n]!;
    setAviso(`${siguiente.nombre}. ${n + 1} de ${PRODUCTOS_LANDING.length}.`);
  }, []);

  const darAaah = useCallback(() => {
    const actual = PRODUCTOS_LANDING[indiceRef.current]!;
    const ya = gustadosRef.current.includes(actual.id);
    const siguiente = ya ? gustadosRef.current.filter((id) => id !== actual.id) : [...gustadosRef.current, actual.id];
    gustadosRef.current = siguiente;
    setGustados(siguiente);
    setPista(false);
    if (!ya) setLatido((n) => n + 1);
    setAviso(
      ya
        ? `${actual.nombre} salió de la bolsa. ${siguiente.length} en total.`
        : `${actual.nombre} entró a la bolsa. ${siguiente.length} en total.`,
    );
  }, []);

  useEffect(() => {
    const el = reelRef.current;
    if (!el) return;
    let acum = 0;
    let espera = 0;
    const alGirar = (e: WheelEvent) => {
      e.preventDefault();
      acum += e.deltaY;
      window.clearTimeout(espera);
      espera = window.setTimeout(() => {
        acum = 0;
      }, 160);
      if (Math.abs(acum) < 48) return;
      mover(acum > 0 ? 1 : -1);
      acum = 0;
    };
    el.addEventListener("wheel", alGirar, { passive: false });
    return () => {
      el.removeEventListener("wheel", alGirar);
      window.clearTimeout(espera);
    };
  }, [mover]);

  function alBajar(e: PointerEvent<HTMLDivElement>) {
    if (e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    gesto.current = { x: e.clientX, y: e.clientY };
  }

  function alMoverPuntero(e: PointerEvent<HTMLDivElement>) {
    if (!gesto.current) return;
    const dy = e.clientY - gesto.current.y;
    const dx = e.clientX - gesto.current.x;
    if (Math.abs(dy) < 8 || Math.abs(dx) > Math.abs(dy)) return;
    const i = indiceRef.current;
    const frena = (i === 0 && dy > 0) || (i === ultimo && dy < 0);
    setArrastre(frena ? dy * 0.32 : dy);
  }

  function alSoltar(e: PointerEvent<HTMLDivElement>) {
    if (!gesto.current) return;
    const dy = e.clientY - gesto.current.y;
    const dx = e.clientX - gesto.current.x;
    gesto.current = null;
    setArrastre(0);
    if (Math.abs(dy) >= UMBRAL_DESLIZAR && Math.abs(dy) > Math.abs(dx)) {
      mover(dy < 0 ? 1 : -1);
      return;
    }
    if (Math.abs(dy) < UMBRAL_TOQUE && Math.abs(dx) < UMBRAL_TOQUE) {
      const ahora = performance.now();
      if (ahora - ultimoToque.current > 0 && ahora - ultimoToque.current < DOBLE_TOQUE_MS) {
        ultimoToque.current = 0;
        darAaah();
      } else {
        ultimoToque.current = ahora;
      }
    }
  }

  function pedir() {
    const vacia = gustadosRef.current.length === 0;
    flushSync(() => setMuestra(true));
    setAviso(vacia ? "Dale aaah a un producto antes de pedir." : "Así quedaría el mensaje. Nada se envió.");
    panelRef.current?.focus();
  }

  function cerrarMuestra() {
    setMuestra(false);
    pedirRef.current?.focus();
  }

  function teclas(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === "ArrowDown" || e.key === "ArrowRight") {
      e.preventDefault();
      mover(1);
    } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
      e.preventDefault();
      mover(-1);
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      darAaah();
    }
  }

  const mensaje = elegidos.length > 0 ? mensajeMuestra(elegidos) : "";

  return (
    <div className="nl-demo-bloque" data-demo-telefono data-producto={producto.id} data-bolsa={gustados.length}>
      <div className="nl-marco">
        <div
          ref={reelRef}
          className="nl-reel"
          tabIndex={0}
          role="group"
          aria-roledescription="carrusel"
          aria-label={`${producto.nombre}, ${indice + 1} de ${PRODUCTOS_LANDING.length}. Desliza o usa las flechas. Enter da aaah.`}
          onPointerDown={alBajar}
          onPointerMove={alMoverPuntero}
          onPointerUp={alSoltar}
          onPointerCancel={alSoltar}
          onKeyDown={teclas}
        >
          <div className={arrastre === 0 ? "nl-pista" : "nl-pista nl-pista-arrastre"} style={{ transform: `translate3d(0, calc(${-indice * 100}% + ${arrastre}px), 0)` }}>
            {PRODUCTOS_LANDING.map((p) => (
              <article key={p.id} className="nl-slide" aria-hidden={p.id !== producto.id}>
                <Image src={p.foto} alt={p.alt} fill sizes="320px" className="nl-slide-foto" draggable={false} />
                <div className="nl-caption">
                  <p className="nl-caption-nombre">{p.nombre}</p>
                  <p className="nl-caption-precio">{formatearPesos(p.precio)}</p>
                </div>
                {gustados.includes(p.id) && (
                  <span className="nl-gustado" aria-hidden="true">
                    <Corazon tamano={22} />
                  </span>
                )}
              </article>
            ))}
          </div>
          {pista && (
            <div className="nl-gesto" aria-hidden="true">
              <strong>{PISTA_DESLIZA}</strong>
              <span>{PISTA_AAAH}</span>
            </div>
          )}
          {latido > 0 && (
            <div key={latido} className="nl-aaah" aria-hidden="true">
              <span className="nl-aaah-corazon">
                <Corazon tamano={54} />
              </span>
              <b>aaah</b>
            </div>
          )}
          <p className="nl-bolsa">
            <span className="nl-sr">
              Bolsa: {gustados.length} {gustados.length === 1 ? "producto" : "productos"}
            </span>
            <span aria-hidden="true">{gustados.length}</span>
          </p>
          <div className="nl-puntos" aria-hidden="true">
            {PRODUCTOS_LANDING.map((p, i) => (
              <span key={p.id} className={i === indice ? "nl-punto nl-punto-activo" : "nl-punto"} />
            ))}
          </div>
        </div>
      </div>

      <div className="nl-fallback">
        <button type="button" onClick={() => mover(-1)} disabled={indice === 0}>
          Anterior
        </button>
        <button type="button" onClick={darAaah} aria-pressed={gustados.includes(producto.id)} aria-label={`Dar aaah a ${producto.nombre}`}>
          Dar aaah
        </button>
        <button type="button" onClick={() => mover(1)} disabled={indice === ultimo}>
          Siguiente
        </button>
      </div>
      <button ref={pedirRef} type="button" className="nl-pedir" onClick={pedir}>
        <IconoWhatsApp tamano={20} />
        Pedir por WhatsApp
      </button>
      <p className="nl-sr" aria-live="polite">
        {aviso}
      </p>

      {muestra && (
        <div ref={panelRef} className="nl-chat" tabIndex={-1} role="region" aria-label="Mensaje de WhatsApp de ejemplo" data-muestra-whatsapp>
          <div className="nl-chat-cabeza">
            <p>Así le llegaría a la tienda</p>
            <button type="button" onClick={cerrarMuestra}>
              Cerrar
            </button>
          </div>
          {elegidos.length === 0 ? (
            <p className="nl-chat-vacio">Dale aaah a lo que quieres. El pedido se arma con eso.</p>
          ) : (
            <>
              <pre className="nl-burbuja">{mensaje}</pre>
              <p className="nl-chat-nota">
                Es una muestra. Nada se envió. Quien compra sigue el pedido con el enlace y quien vende lo abre para confirmar y despachar.
              </p>
              <p className="nl-chat-enlace">
                Enlace de ejemplo: <span>{ENLACE_MUESTRA}</span>
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
