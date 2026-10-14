"use client";
// El teléfono de la tienda en la demo de la landing (app/demo-landing/tienda, dentro de un iframe). Después del aviso y del chat
// de WhatsApp (dibujados), son los componentes REALES de la app con la demo en memoria (lib/data/demo.ts usarDemoEnMemoria +
// lib/landing/db-demo.ts): el enlace del pedido, «¿Eres la tienda?», «Pedido del catálogo» (Registrar), Pedidos y la hoja del
// pedido con Confirmar y Despachar. Los botones se pulsan de verdad sobre esa base en memoria: nada sale a la red ni se guarda.

import { useState } from "react";
import { flushSync } from "react-dom";
import { fuenteDemo, leerDemo, usarDemoEnMemoria } from "@/lib/data/demo";
import { ProveedorDemo } from "@/lib/data/provider";
import { TIENDA_ID_DEMO, catalogoDemo, dbBase, dbRegistrada, vistaSolicitudDemo } from "@/lib/landing/db-demo";
import { CODIGO_DEMO } from "@/lib/landing/pedido-demo";
import { indicePaso } from "@/lib/landing/pasos";
import { Hoja } from "../hoja";
import { ToastProvider } from "../toast";
import { ProveedorToast } from "../ui";
import { PanelUIProvider } from "../panel/ui";
import { VistaPedidos } from "../pedidos/vista-pedidos";
import { HojaPedido } from "../pedidos/hoja-pedido";
import { HojaRegistrarSolicitud } from "../pedido-catalogo/registrar-solicitud";
import { EresLaTienda } from "../pedido-catalogo/tienda-en-pedido";
import { PedidoComprador } from "../tienda/pedido-comprador";
import { Bloqueo, ChatWhatsApp } from "./whatsapp";
import { cajaDelTexto, esperar, porTexto, tocar, tocarYPulsar, useAnclas, usePasoDeLaLanding } from "./telefono-iframe";

type Pantalla = "bloqueo" | "chat" | "pedido" | "panel";
type Estado = { pantalla: Pantalla; aviso: boolean; eres: boolean; registrar: boolean; hojaPedido: boolean; montaje: number };

const P = {
  aviso: indicePaso("aviso"),
  chat: indicePaso("chat-tienda"),
  eres: indicePaso("eres-tienda"),
  registrar: indicePaso("registrar"),
  pedidos: indicePaso("pedidos"),
  confirmar: indicePaso("confirmar"),
  despachar: indicePaso("despachar"),
};

function estadoEn(paso: number, montaje: number): Estado {
  const pantalla: Pantalla = paso >= P.pedidos ? "panel" : paso >= P.eres ? "pedido" : paso >= P.chat ? "chat" : "bloqueo";
  return { pantalla, aviso: paso >= P.aviso, eres: paso === P.eres, registrar: paso === P.registrar, hojaPedido: paso >= P.confirmar, montaje };
}

/** La base en memoria como queda al terminar ese paso (para llegar sin animación). */
async function prepararBase(paso: number) {
  if (paso < P.registrar) return usarDemoEnMemoria(dbBase(), TIENDA_ID_DEMO);
  const { db, pedidoId } = dbRegistrada();
  usarDemoEnMemoria(db, TIENDA_ID_DEMO);
  if (paso >= P.confirmar) await fuenteDemo.confirmarPedido(TIENDA_ID_DEMO, pedidoId);
  if (paso >= P.despachar) await fuenteDemo.despacharPedido(TIENDA_ID_DEMO, pedidoId);
}

const pedidoId = () => leerDemo().db.pedidos[0]?.id ?? null;
const tituloHoja = (texto: string | RegExp) => porTexto('[role="dialog"] h2', texto);

export function TelefonoTienda() {
  const [datos] = useState(() => {
    const db = dbBase();
    // Solo en el navegador (en el servidor no hay demo): desde aquí la demo de esta página vive en memoria.
    if (typeof window !== "undefined") usarDemoEnMemoria(db, TIENDA_ID_DEMO);
    return { vista: vistaSolicitudDemo(db), c: catalogoDemo(db) };
  });
  const [estado, setEstado] = useState<Estado>(() => estadoEn(0, 0));
  const nada = () => {};

  usePasoDeLaLanding(async (destino, animar, vigente) => {
    const desde = window.__dzPasoTienda ?? 0;
    window.__dzPasoTienda = destino;
    const fijo = async () => {
      await prepararBase(destino);
      if (vigente()) flushSync(() => setEstado((e) => estadoEn(destino, e.montaje + 1)));
    };
    if (!animar || destino !== desde + 1 || destino <= P.aviso - 1) return fijo();
    if (destino === P.aviso) setEstado((e) => ({ ...e, aviso: true }));
    else if (destino === P.chat) {
      tocar(document.querySelector("[data-aviso]"));
      await esperar(320);
      if (vigente()) setEstado((e) => ({ ...e, pantalla: "chat" }));
    } else if (destino === P.eres) {
      tocar(document.querySelector("[data-vista-previa]"));
      await esperar(320);
      if (!vigente()) return;
      setEstado((e) => ({ ...e, pantalla: "pedido" }));
      await esperar(800);
      if (!vigente()) return;
      tocar(document.querySelector(".pvest-tienda button"));
      await esperar(260);
      if (vigente()) setEstado((e) => ({ ...e, eres: true }));
    } else if (destino === P.registrar) {
      tocar(porTexto('[role="dialog"] button', /Entrar con Google/));
      await esperar(420);
      if (!vigente()) return;
      setEstado((e) => ({ ...e, eres: false, registrar: true }));
      await esperar(900);
      if (!vigente()) return;
      await tocarYPulsar(document.querySelector('[aria-label="Elegir quién te escribió"]'));
      await esperar(650);
      if (!vigente()) return;
      await tocarYPulsar(porTexto('[role="dialog"] button', /^A?\s*Ana/));
      await esperar(600);
      if (!vigente()) return;
      await tocarYPulsar(porTexto('[role="dialog"] button', "Registrar pedido"));
    } else if (destino === P.pedidos) {
      tocar(porTexto('[role="dialog"] button', /Ver pedido/));
      await esperar(300);
      if (vigente()) setEstado((e) => ({ ...e, registrar: false, pantalla: "panel" }));
    } else if (destino === P.confirmar) {
      tocar(document.querySelector('a[href^="/pedidos/"]'));
      await esperar(300);
      if (!vigente()) return;
      setEstado((e) => ({ ...e, hojaPedido: true }));
      await esperar(900);
      if (!vigente()) return;
      await tocarYPulsar(porTexto('[role="dialog"] button', "Confirmar pedido"));
    } else if (destino === P.despachar) {
      await tocarYPulsar(porTexto('[role="dialog"] button', /Despachar pedido/));
    } else await fijo();
  });

  useAnclas((id) => {
    if (id === "bloqueo" || id === "aviso" || id === "chat") return { el: document.querySelector(`[data-ancla="${id}"]`), w: id === "bloqueo" ? 60 : id === "aviso" ? 24 : 34 };
    // Justo a la derecha del texto del título.
    const derecha = (el: Element | null, w = 26) => {
      const caja = cajaDelTexto(el);
      return { el, caja, w, dx: caja ? caja.width / 2 + w / 2 + 8 : 0 };
    };
    if (id === "eres-tienda") return derecha(tituloHoja("¿Eres la tienda?"));
    if (id === "registrar") return derecha(tituloHoja("Pedido del catálogo"));
    if (id === "hoja-pedido") return derecha(tituloHoja(/^Pedido #/));
    if (id === "pedidos") {
      const tarjeta = document.querySelector('a[href^="/pedidos/"]');
      return { el: tarjeta, w: 26, dx: tarjeta ? tarjeta.getBoundingClientRect().width / 2 - 40 : 0 };
    }
    if (id === "despachar") {
      const boton = porTexto('[role="dialog"] button', /Despachar pedido/);
      if (boton) return { el: boton, w: 26, dx: -boton.getBoundingClientRect().width / 2 + 40 };
      // Ya despachado: la hoja de celebración, sobre su título.
      const titulo = tituloHoja("Pedido despachado");
      const caja = cajaDelTexto(titulo);
      if (titulo && caja) return { el: titulo, caja, w: 34, dx: -caja.width / 2 - 26 };
      return derecha(tituloHoja(/^Pedido #/), 30);
    }
    return null;
  });

  const id = pedidoId();
  return (
    <div data-telefono="tienda" data-pantalla={estado.pantalla} className="h-dvh overflow-hidden bg-fondo">
      <ProveedorDemo cargando={null}>
        <ToastProvider>
          <ProveedorToast>
            <PanelUIProvider>
              <div key={estado.montaje}>
                <div className="dz-pantalla" data-visible={estado.pantalla === "panel" ? "" : undefined}>
                  {estado.pantalla === "panel" && (
                    <div className="mx-auto flex min-h-dvh max-w-[480px] flex-col bg-fondo pt-[44px]">
                      {/* Sin el encabezado del panel: mostraría el plan y los créditos, y la landing no habla de planes. */}
                      <main className="flex-1 pb-8">
                        <VistaPedidos>{estado.hojaPedido && id && <HojaPedido pedidoId={id} />}</VistaPedidos>
                      </main>
                    </div>
                  )}
                </div>
                <div className="dz-pantalla" data-visible={estado.pantalla === "pedido" ? "" : undefined}>
                  {(estado.pantalla === "pedido" || estado.registrar) && <PedidoComprador codigo={CODIGO_DEMO} demo={false} inicial={datos.vista} inicialCatalogo={datos.c} ilustracion />}
                  <Hoja abierta={estado.eres} alCerrar={nada} titulo="¿Eres la tienda?">
                    <EresLaTienda codigo={CODIGO_DEMO} demo={false} aviso={null} alVerComoTiendaDemo={nada} />
                  </Hoja>
                  {estado.registrar && <HojaRegistrarSolicitud codigo={CODIGO_DEMO} abierta alCerrar={nada} alVerPedido={nada} />}
                </div>
                <div className="dz-pantalla" data-visible={estado.pantalla === "chat" ? "" : undefined}>
                  <ChatWhatsApp sale={false} enviado />
                </div>
                <div className="dz-pantalla" data-visible={estado.pantalla === "bloqueo" ? "" : undefined}>
                  <Bloqueo aviso={estado.aviso} />
                </div>
              </div>
            </PanelUIProvider>
          </ProveedorToast>
        </ToastProvider>
      </ProveedorDemo>
    </div>
  );
}

declare global {
  interface Window {
    __dzPasoTienda?: number;
  }
}
