"use client";
import { useRef, useState } from "react";
import {
  ArteHistoria,
  HISTORIAS,
  MarcaDeslizapp,
  ArteFinal,
} from "./artes-deslizapp";
import { DialogoCatalogo } from "./dialogo";
import { Icono } from "./iconos";
export { ArteFinal };
export function Historias({
  cerrar,
  planes,
  contacto,
}: {
  cerrar: () => void;
  planes: () => void;
  contacto: string;
}) {
  const [indice, setIndice] = useState(0);
  const [pausa, setPausa] = useState(false);
  const held = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const step = (d: number) => {
    if (held.current) {
      held.current = false;
      return;
    }
    setIndice((i) => Math.min(HISTORIAS.length - 1, Math.max(0, i + d)));
  };
  return (
    <DialogoCatalogo
      id="story"
      fondo={HISTORIAS[indice].bg}
      nombre="Cómo funciona Deslizapp"
      clase={"story" + (pausa ? " paused" : "")}
      cerrar={cerrar}
    >
      <div className="sin" data-bg={HISTORIAS[indice].bg}>
        <div className="sbars" aria-hidden="true">
          {HISTORIAS.map((_, i) => (
            <span
              key={i}
              className={i < indice ? "done" : i === indice ? "run" : ""}
            >
              <i
                key={i === indice ? indice : "quieto"}
                onAnimationEnd={() =>
                  setIndice((i) => Math.min(HISTORIAS.length - 1, i + 1))
                }
              />
            </span>
          ))}
        </div>
        <div className="stop">
          <span className="brand">
            <MarcaDeslizapp />
            <span className="dztag">
              Desliz<em>aaah…</em>
            </span>
          </span>
          <span className="sbtns">
            <button className="sx" aria-label="Cerrar" onClick={cerrar}>
              ×
            </button>
          </span>
        </div>
        <div
          className="slides"
          onClick={(e) => {
            const target = e.target as HTMLElement;
            if (target.closest("[data-plans]")) planes();
            if (target.closest("[data-sagain]")) setIndice(0);
          }}
        >
          <ArteHistoria key={indice} indice={indice} contacto={contacto} />
        </div>
        {[-1, 1].map((d) => (
          <button
            key={d}
            className={d < 0 ? "tapL" : "tapR"}
            aria-label={d < 0 ? "Paso anterior" : "Paso siguiente"}
            onClick={() => step(d)}
            onPointerDown={() => {
              held.current = false;
              timer.current = setTimeout(() => {
                held.current = true;
                setPausa(true);
              }, 220);
            }}
            onPointerUp={() => {
              if (timer.current) clearTimeout(timer.current);
              setPausa(false);
            }}
            onPointerCancel={() => {
              if (timer.current) clearTimeout(timer.current);
              setPausa(false);
            }}
          />
        ))}
        <p className="shint">
          Toca para avanzar · mantén presionado para pausar
        </p>
        <p className="sr" aria-live="polite">
          Paso {indice + 1} de {HISTORIAS.length}
        </p>
      </div>
    </DialogoCatalogo>
  );
}
export function Coach({
  cerrar,
  productos,
}: {
  cerrar: () => void;
  productos: { foto: string; nombre: string }[];
}) {
  const [step, setStep] = useState(0);
  return (
    <DialogoCatalogo
      id="coach"
      nombre="Así funciona mi catálogo"
      clase="coach"
      cerrar={cerrar}
    >
      <div className="cbox">
        <button className="cskip" onClick={cerrar}>
          Saltar
        </button>
        <p className="ckick">
          Así funciona <em>mi catálogo</em>
        </p>
        <div className="csteps">
          {[0, 1, 2].map((i) => (
            <section
              key={i}
              className={
                "cstep" + (i === step ? " on" : i < step ? " past" : "")
              }
              aria-hidden={i !== step}
            >
              <div className={"cart cart" + (i + 1)} aria-hidden="true">
                {i === 0 ? (
                  <>
                    <div className="cph">
                      <div className="cstack">
                        {[0, 1, 2, 0].map((n, k) => (
                          <img
                            key={k}
                            src={productos[n % productos.length]?.foto}
                            alt=""
                          />
                        ))}
                      </div>
                    </div>
                    <span className="cfing" />
                  </>
                ) : i === 1 ? (
                  <>
                    <div className="cph">
                      <img src={productos[0]?.foto} alt="" />
                    </div>
                    <span className="cbst">
                      <Icono nombre="heart" />
                      <span className="aw">aaah</span>
                    </span>
                    <span className="cfing" />
                    <span className="cbag">
                      <Icono nombre="bag" />
                      <i className="cnt">1</i>
                    </span>
                  </>
                ) : (
                  <>
                    <span className="cpill">
                      <Icono nombre="wa" />
                      Enviar por WhatsApp
                    </span>
                    <span className="cfing" />
                    <div className="cbub">
                      <b>¡Hola! Vi tu catálogo y quiero:</b>
                      {productos.slice(0, 2).map((p) => (
                        <div key={p.nombre}>• {p.nombre}</div>
                      ))}
                      <span className="tag">Mi pedido</span>
                      <span className="ck">✓✓</span>
                    </div>
                  </>
                )}
              </div>
              <h3>
                {i === 0 ? (
                  <>
                    Desliza <em>hacia arriba</em>
                  </>
                ) : i === 1 ? (
                  <>
                    ¿Te encantó? <em>Dale ♥</em>
                  </>
                ) : (
                  <>
                    Envíame <em>tu pedido</em>
                  </>
                )}
              </h3>
              <p>
                {i === 0
                  ? "y va apareciendo el siguiente producto."
                  : i === 1
                    ? "o toca dos veces la foto. Se va directo a tu pedido."
                    : "Me llega por WhatsApp, ya escrito. Tú solo le das a enviar."}
              </p>
            </section>
          ))}
        </div>
        <div className="cdots" aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <i key={i} className={i === step ? "on" : ""} />
          ))}
        </div>
        <button
          className="btn cok"
          id="coachOk"
          onClick={() => (step === 2 ? cerrar() : setStep(step + 1))}
        >
          {step === 2 ? "¡A deslizar!" : "Siguiente"}
        </button>
      </div>
    </DialogoCatalogo>
  );
}
