"use client";

import { useEffect, useRef, useState } from "react";
import { ENLACE_QUIERO_VENDER } from "@/lib/landing/enlaces";
import { horaCorta } from "@/lib/formato";
import { menosMovimiento } from "@/lib/movimiento";
import { PREGUNTAS_PLANES, type PreguntaPlanes } from "@/lib/planes/preguntas";
import { IconoInstagram } from "../iconos";
import { BurbujaChat } from "../chat/burbuja-chat";

/** Lo que tarda el «escribiendo…» antes de la respuesta. */
const MS_ESCRIBIENDO = 650;

const SALUDO = "¡Hola! 👋 ¿Qué quieres saber? Toca una pregunta.";

type Turno = { id: string; hora: string; respuesta: { hora: string } | null };
type Mensaje = { clave: string; lado: "enviado" | "recibido"; texto: string; hora: string };

/**
 * Las preguntas frecuentes de /planes como un chat de WhatsApp (docs/prompts/planes-incluye-y-preguntas.md §2, opción E2). Las
 * preguntas son respuestas rápidas abajo: al tocar una sale como mensaje enviado, aparece «escribiendo…» y llega la respuesta; esa
 * pregunta ya no está en las rápidas. Las burbujas son las de «Cómo funciona» (components/chat/burbuja-chat.tsx). Con movimiento
 * reducido no hay «escribiendo…» ni rebote: la respuesta aparece directamente. Las respuestas que llegan se anuncian (aria-live); las
 * preguntas con sus respuestas también están en el HTML (lista oculta y FAQPage, components/planes/pagina-planes.tsx).
 */
export function PreguntasChat({ preguntas = PREGUNTAS_PLANES }: { preguntas?: PreguntaPlanes[] }) {
  const [turnos, setTurnos] = useState<Turno[]>([]);
  // La hora del saludo se lee ya en el navegador: en el servidor sería otra y no coincidiría al hidratar.
  const [horaSaludo, setHoraSaludo] = useState("");
  const cuerpo = useRef<HTMLDivElement>(null);
  const rapidas = useRef<HTMLDivElement>(null);
  const instagram = useRef<HTMLAnchorElement>(null);
  const foco = useRef<number | null>(null);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    setHoraSaludo(horaCorta(new Date())); // eslint-disable-line react-hooks/set-state-in-effect -- solo existe en el navegador
    const pendientes = timers.current;
    return () => pendientes.forEach((t) => window.clearTimeout(t));
  }, []);

  // Lo último que llegó queda a la vista dentro del chat.
  useEffect(() => {
    const c = cuerpo.current;
    if (c && turnos.length) c.scrollTo({ top: c.scrollHeight, behavior: menosMovimiento() ? "auto" : "smooth" });
  }, [turnos]);

  // La pregunta tocada desaparece con el foco en ella: el foco pasa a la siguiente (o, si no quedan, a «Escribir»).
  useEffect(() => {
    if (foco.current === null) return;
    const botones = rapidas.current?.querySelectorAll<HTMLButtonElement>("button");
    (botones?.[Math.min(foco.current, (botones?.length ?? 1) - 1)] ?? instagram.current)?.focus();
    foco.current = null;
  }, [turnos]);

  const preguntar = (id: string, posicion: number) => {
    foco.current = posicion;
    const hora = horaCorta(new Date());
    if (menosMovimiento()) {
      setTurnos((t) => [...t, { id, hora, respuesta: { hora } }]);
      return;
    }
    setTurnos((t) => [...t, { id, hora, respuesta: null }]);
    timers.current.push(
      window.setTimeout(() => {
        setTurnos((t) => t.map((x) => (x.id === id ? { ...x, respuesta: { hora: horaCorta(new Date()) } } : x)));
      }, MS_ESCRIBIENDO),
    );
  };

  const porId = new Map(preguntas.map((p) => [p.id, p]));
  const mensajes: (Mensaje | { clave: string; escribiendo: true })[] = [{ clave: "saludo", lado: "recibido", texto: SALUDO, hora: horaSaludo }];
  for (const t of turnos) {
    const p = porId.get(t.id);
    if (!p) continue;
    mensajes.push({ clave: `p-${t.id}`, lado: "enviado", texto: p.pregunta, hora: t.hora });
    if (t.respuesta) mensajes.push({ clave: `r-${t.id}`, lado: "recibido", texto: p.respuesta, hora: t.respuesta.hora });
    else mensajes.push({ clave: `e-${t.id}`, escribiendo: true });
  }
  const hechas = new Set(turnos.map((t) => t.id));
  const quedan = preguntas.filter((p) => !hechas.has(p.id));

  return (
    <div className="pl-chat">
      <div className="pl-chat-barra">
        {/* eslint-disable-next-line @next/next/no-img-element -- icono pequeño de la app, sin optimizador */}
        <img src="/icons/apple-touch-icon.png" alt="" width={40} height={40} />
        <span>
          <b>Deslizapp</b>
          <span>Preguntas frecuentes</span>
        </span>
      </div>
      <div ref={cuerpo} className="pl-chat-cuerpo" role="log" aria-live="polite" aria-label="Chat de preguntas frecuentes" tabIndex={0}>
        {mensajes.map((m, i) => {
          if ("escribiendo" in m) {
            return (
              <div key={m.clave} className="pl-chat-fila" data-lado="recibido" aria-hidden="true">
                <BurbujaChat lado="recibido" hora="" className="pl-chat-escribe">
                  <i />
                  <i />
                  <i />
                </BurbujaChat>
              </div>
            );
          }
          // Como en WhatsApp, solo el último mensaje de cada grupo lleva cola.
          const siguiente = mensajes[i + 1];
          const cola = !siguiente || ("escribiendo" in siguiente ? "recibido" : siguiente.lado) !== m.lado;
          return (
            <div key={m.clave} className="pl-chat-fila" data-lado={m.lado}>
              <BurbujaChat lado={m.lado} cola={cola} hora={m.hora}>
                {m.texto}
              </BurbujaChat>
            </div>
          );
        })}
      </div>
      {quedan.length > 0 && (
        <div ref={rapidas} className="pl-chat-rapidas" role="group" aria-label="Elige una pregunta">
          {quedan.map((p, k) => (
            <button key={p.id} type="button" className="pl-chat-rapida tocable" onClick={() => preguntar(p.id, k)}>
              {p.pregunta}
            </button>
          ))}
        </div>
      )}
      <div className="pl-chat-fin">
        <IconoInstagram tamano={26} strokeWidth={2} />
        <span>¿Otra pregunta? Escríbenos por Instagram.</span>
        <a ref={instagram} href={ENLACE_QUIERO_VENDER} target="_blank" rel="noopener noreferrer" className="tocable">
          Escribir
        </a>
      </div>
    </div>
  );
}
