"use client";
import { NOMBRE_PRODUCTO } from "@/lib/rubros";
import { useState } from "react";
import type { CatalogoPublico, ProductoPublico } from "@/lib/types";
import type { LineaLocal } from "@/lib/tienda/carrito";
import { dinero, mensajePedido } from "@/lib/tienda/carrito";
import { modoOpiniones } from "@/lib/tienda/tema";
import { DialogoCatalogo, PanelCatalogo } from "./dialogo";
import { Icono } from "./iconos";
import { MarcaDeslizapp } from "./artes-deslizapp";
export function HojaPedido({
  t,
  lineas,
  cerrar,
  quitar,
  ver,
  enviar,
  enviando,
}: {
  t: CatalogoPublico["tienda"];
  lineas: LineaLocal[];
  cerrar: () => void;
  quitar: (l: LineaLocal) => void;
  ver: (slug: string) => void;
  enviar: () => void;
  enviando: boolean;
}) {
  const total = lineas.reduce((s, l) => s + l.precioUnitario * l.cantidad, 0);
  return (
    <DialogoCatalogo id="orBg" nombre="Tu pedido" cerrar={cerrar}>
      <PanelCatalogo clase="wa" cerrar={cerrar}>
        <header className="wahead">
          <button className="wagrab" aria-label="Ampliar el chat">
            <i />
          </button>
          <span className="waav" aria-hidden="true" />
          <div className="wawho">
            <h2 id="orTitle">{t.nombreVendedora ?? t.nombre}</h2>
            <small>Tu pedido</small>
          </div>
          <button className="wax" aria-label="Cerrar" onClick={cerrar}>
            ×
          </button>
        </header>
        <div className="wabody">
          <span className="wachip">Hoy</span>
          {!lineas.length ? (
            <div className="wamsg in">
              <p>
                Todavía no has elegido {t.rubro === "ropa" ? "ninguna" : "ningún"} {NOMBRE_PRODUCTO[t.rubro].singular}. Dale ♥ a los que te
                gusten y aparecen aquí 😉
              </p>
            </div>
          ) : (
            <div id="waOutWrap">
              <span className="wanote">
                Así le llegará tu pedido a {t.nombreVendedora ?? t.nombre}
              </span>
              <div className="wamsg out">
                <p>{mensajePedido(t, [], 0).split("\n")[0]}</p>
                <div id="lines">
                  {lineas.map((l) => (
                    <div
                      className="line"
                      key={l.productoId + (l.varianteId ?? "")}
                    >
                      <button
                        className="lpic"
                        onClick={() => ver(l.slug)}
                        aria-label={"Ver " + l.nombre}
                      >
                        {l.foto && <img src={l.foto} alt="" />}
                      </button>
                      <div>
                        <b>{l.nombre}</b>
                        {l.varianteTexto && (
                          <small>
                            {l.varianteTexto}
                            <br />
                          </small>
                        )}
                        <small>
                          {dinero(l.precioUnitario * l.cantidad)}
                          {l.cantidad > 1 ? " × " + l.cantidad : ""}
                          {l.porEncargo ? " · Por encargo" : ""}
                          {l.noDisponible ? " · Agotado" : ""}
                        </small>
                      </div>
                      <button
                        className="rm"
                        onClick={() => quitar(l)}
                        aria-label={"Quitar " + l.nombre + " del pedido"}
                      >
                        <Icono nombre="trash" />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="total" id="totalRow">
                  <span>Total</span>
                  <strong>{dinero(total)}</strong>
                </div>
                <p>
                  {(
                    t.personalizacion.mensajes as
                      Record<string, string> | undefined
                  )?.cierre_whatsapp ?? "¿Los tienes disponibles?"}
                </p>
                <p className="walink">
                  Mi pedido en línea:
                  <br />
                  <span>🔗 {t.nombre} · pedido</span>
                </p>
              </div>
            </div>
          )}
        </div>
        <div className="wafoot">
          {lineas.length ? (
            <button
              className="wasend"
              id="sheetSend"
              disabled={enviando || lineas.some((l) => l.noDisponible)}
              onClick={enviar}
            >
              <Icono nombre="wa" />
              {enviando ? "Preparando pedido…" : "Enviar por WhatsApp"}
            </button>
          ) : (
            <button className="wasend soft" onClick={cerrar}>
              Ver {NOMBRE_PRODUCTO[t.rubro].plural}
            </button>
          )}
          <p className="hint2">
            Se abre WhatsApp con este mensaje listo. Solo lo envías.
          </p>
          <p className="dzsig">
            Pedido armado con <MarcaDeslizapp />
          </p>
        </div>
      </PanelCatalogo>
    </DialogoCatalogo>
  );
}
export function HojaOpiniones({
  t,
  p,
  cerrar,
}: {
  t: CatalogoPublico["tienda"];
  p: ProductoPublico;
  cerrar: () => void;
}) {
  const [texto, setTexto] = useState("");
  const mostrar = modoOpiniones(t.personalizacion.secciones) === "si";
  const opiniones = mostrar ? p.opiniones : [];
  const preguntar = () => {
    if (!t.whatsapp) return;
    location.href =
      "https://wa.me/" +
      t.whatsapp.replace(/\D/g, "") +
      "?text=" +
      encodeURIComponent(
        `¡Hola ${t.nombreVendedora ?? t.nombre}! Sobre el ${p.nombre}: ${texto.trim()}`,
      );
  };
  return (
    <DialogoCatalogo
      id="cmBg"
      nombre={"Opiniones · " + p.nombre}
      cerrar={cerrar}
    >
      <PanelCatalogo cerrar={cerrar}>
        <div className="shead">
          <h2 id="cmTitle">Opiniones · {p.nombre}</h2>
          <button className="x" aria-label="Cerrar" onClick={cerrar}>
            ×
          </button>
        </div>
        <div className="sbody" id="cmBody">
          <div className="cm">
            <span className="ico mi" aria-hidden="true" />
            <div>
              <div className="hd">
                {t.nombre} <span>· Fijado</span>
              </div>
              <p>
                ¿Tienes alguna duda de {t.rubro === "ropa" ? "esta" : "este"} {NOMBRE_PRODUCTO[t.rubro].singular}? Escríbeme aquí abajo y te
                contesto por WhatsApp.
              </p>
            </div>
          </div>
          {mostrar && (
            <>
              <div className="sec">
                {opiniones.length
                  ? `${opiniones.length} opiniones de personas en internet`
                  : "Opiniones en internet"}
              </div>
              {opiniones.length ? (
                opiniones.map((r, i) => (
                  <div className="cm" key={i}>
                    <span
                      className="ico"
                      aria-hidden="true"
                      style={{
                        background: [
                          "#B5577A",
                          "#8E6FA8",
                          "#5E8C7A",
                          "#C98A4B",
                          "#6A7FB0",
                        ][i % 5],
                      }}
                    >
                      {r.usuario[0]?.toUpperCase()}
                    </span>
                    <div>
                      <div className="hd">
                        {r.usuario}{" "}
                        <span>
                          ·{" "}
                          <a
                            href={r.url}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {r.fuente}
                          </a>
                          {r.estrellas ? " · " + "★".repeat(r.estrellas) : ""}
                        </span>
                      </div>
                      <p>{r.texto}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="none">
                  Todavía no hay opiniones publicadas de {t.rubro === "ropa" ? "esta" : "este"} {NOMBRE_PRODUCTO[t.rubro].singular} en
                  internet. Si tienes una pregunta, escríbeme y te cuento.
                </p>
              )}
              {opiniones.length > 0 && (
                <p className="note">
                  Opiniones reales publicadas en internet
                  {opiniones.some((r) => r.traducida)
                    ? ", traducidas al español"
                    : ""}
                  . Toca el nombre del sitio para ver la original.
                </p>
              )}
            </>
          )}
        </div>
        <form
          className="sfoot ask"
          onSubmit={(e) => {
            e.preventDefault();
            preguntar();
          }}
        >
          <span className="av" aria-hidden="true" />
          <label className="sr" htmlFor="askInput">
            Escríbele a {t.nombreVendedora ?? t.nombre}
          </label>
          <input
            id="askInput"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder={`Pregúntale algo a ${t.nombreVendedora ?? t.nombre}…`}
            autoComplete="off"
          />
          <button
            type="submit"
            id="askSend"
            disabled={!texto.trim() || !t.whatsapp}
          >
            Enviar
          </button>
        </form>
      </PanelCatalogo>
    </DialogoCatalogo>
  );
}
export function HojaAviso({
  p,
  varianteId,
  cerrar,
  guardar,
}: {
  p: ProductoPublico;
  varianteId: string | null;
  cerrar: () => void;
  guardar: (telefono: string) => Promise<void>;
}) {
  const [telefono, setTelefono] = useState("");
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);
  const variante = p.variantes.find((v) => v.id === varianteId);
  return (
    <DialogoCatalogo
      id="avisoBg"
      nombre="Te aviso cuando llegue"
      cerrar={cerrar}
    >
      <PanelCatalogo clase="sheet aviso-llegada" asa={false} cerrar={cerrar}>
        <button className="grab" aria-label="Cerrar aviso" onClick={cerrar} />
        <div className="shead">
          <h2>Te aviso cuando llegue</h2>
          <button className="x" aria-label="Cerrar" onClick={cerrar}>
            ×
          </button>
        </div>
        <form
          className="sbody"
          onSubmit={async (e) => {
            e.preventDefault();
            if (guardando) return;
            setError("");
            setGuardando(true);
            try {
              await guardar(telefono);
            } catch (e) {
              setError(
                e instanceof Error
                  ? e.message
                  : "No se pudo guardar. Inténtalo otra vez.",
              );
            } finally {
              setGuardando(false);
            }
          }}
        >
          <p>
            {p.nombre}
            {variante
              ? " · " +
                p.opciones.map((o) => variante.valores[o.nombre]).join(" · ")
              : ""}
          </p>
          <label htmlFor="telefonoAviso">TU WHATSAPP</label>
          <input
            id="telefonoAviso"
            type="tel"
            inputMode="tel"
            placeholder="809 000 0000"
            autoComplete="tel"
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
          />
          {error && <p role="alert">{error}</p>}
          <button className="btn aviso-boton" disabled={guardando}>
            {guardando ? "Guardando…" : "Avísame"}
          </button>
          <p className="note">Solo para este aviso.</p>
        </form>
      </PanelCatalogo>
    </DialogoCatalogo>
  );
}
