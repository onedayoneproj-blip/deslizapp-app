"use client";
// El teléfono de la tienda en la demo de la landing (app/demo-landing/tienda, dentro de un iframe). Después del aviso y del chat
// de WhatsApp (dibujados), son los componentes REALES de la app con la demo en memoria (lib/data/demo.ts usarDemoEnMemoria +
// lib/landing/db-demo.ts): el enlace del pedido, «¿Eres la tienda?», «Pedido del catálogo» (Registrar), Pedidos y la hoja del
// pedido con Confirmar y Despachar. Los botones se pulsan de verdad sobre esa base en memoria: nada sale a la red ni se guarda.

import { useState } from "react";
import { flushSync } from "react-dom";
import { fijarRelojDemo, fuenteDemo, leerDemo, usarDemoEnMemoria } from "@/lib/data/demo";
import { ProveedorDemo } from "@/lib/data/provider";
import { TIENDA_ID_DEMO, ahoraDemo, catalogoDemo, dbBase, dbRegistrada, vistaSolicitudDemo } from "@/lib/landing/db-demo";
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
import { esperar, porTexto, tocar, tocarYPulsar, useAnclas, usePasoDeLaLanding } from "./telefono-iframe";

type Pantalla = "bloqueo" | "chat" | "pedido" | "panel";
type Estado = { pantalla: Pantalla; eres: boolean; registrar: boolean; hojaPedido: boolean; montaje: number };

const P = {
  aviso: indicePaso("aviso"),
  chat: indicePaso("chat-tienda"),
  registrar: indicePaso("registrar"),
  pedidos: indicePaso("pedidos"),
  confirmar: indicePaso("confirmar"),
  despachar: indicePaso("despachar"),
};

function estadoEn(paso: number, montaje: number): Estado {
  const pantalla: Pantalla = paso >= P.pedidos ? "panel" : paso >= P.registrar ? "pedido" : paso >= P.chat ? "chat" : "bloqueo";
  return { pantalla, eres: false, registrar: paso === P.registrar, hojaPedido: paso >= P.confirmar, montaje };
}

/**
 * La base en memoria para llegar a ese paso sin animación. En «registrar» todavía sin registrar: la hoja enseña el formulario (si
 * no, diría «Este pedido ya está registrado»).
 */
async function prepararBase(paso: number) {
  if (paso <= P.registrar) return usarDemoEnMemoria(dbBase(), TIENDA_ID_DEMO);
  const { db, pedidoId } = dbRegistrada();
  usarDemoEnMemoria(db, TIENDA_ID_DEMO);
  if (paso >= P.confirmar) await fuenteDemo.confirmarPedido(TIENDA_ID_DEMO, pedidoId);
  if (paso >= P.despachar) await fuenteDemo.despacharPedido(TIENDA_ID_DEMO, pedidoId);
}

const pedidoId = () => leerDemo().db.pedidos[0]?.id ?? null;

export function TelefonoTienda() {
  const [datos] = useState(() => {
    const db = dbBase();
    // Solo en el navegador (en el servidor no hay demo): desde aquí la demo de esta página vive en memoria.
    if (typeof window !== "undefined") {
      usarDemoEnMemoria(db, TIENDA_ID_DEMO);
      // Un solo reloj: el pedido que registra la tienda lleva la hora del aviso (3:44 p. m.), no la del momento.
      fijarRelojDemo(() => ahoraDemo().getTime());
    }
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
    if (!animar || destino !== desde + 1 || destino <= P.aviso) return fijo();
    // `aviso`: la pantalla bloqueada ya está a la vista (la del teléfono que gira en el cambio de lado, cambio-lado.tsx): nada que animar.
    if (destino === P.chat) {
      await tocar(document.querySelector("[data-aviso]"));
      if (vigente()) setEstado((e) => ({ ...e, pantalla: "chat" }));
    } else if (destino === P.registrar) {
      // «¿Eres la tienda?»: el enlace del pedido, entrar con la cuenta y registrarlo.
      await tocar(document.querySelector("[data-vista-previa]"));
      if (!vigente()) return;
      setEstado((e) => ({ ...e, pantalla: "pedido" }));
      await esperar(800);
      if (!vigente()) return;
      await tocar(document.querySelector(".pvest-tienda button"));
      if (!vigente()) return;
      setEstado((e) => ({ ...e, eres: true }));
      await esperar(900);
      if (!vigente()) return;
      await tocar(porTexto('[role="dialog"] button', /Entrar con Google/));
      if (!vigente()) return;
      setEstado((e) => ({ ...e, eres: false, registrar: true }));
      await esperar(900);
      if (!vigente()) return;
      await tocarYPulsar(document.querySelector('[aria-label="Elegir quién te escribió"]'));
      await esperar(450);
      if (!vigente()) return;
      await tocarYPulsar(porTexto('[role="dialog"] button', /^A?\s*Ana/));
      await esperar(450);
      if (!vigente()) return;
      await tocarYPulsar(porTexto('[role="dialog"] button', "Registrar pedido"));
    } else if (destino === P.pedidos) {
      await tocar(porTexto('[role="dialog"] button', /Ver pedido/));
      // Si «registrar» se vio sin animación, el pedido aún no está registrado.
      if (!pedidoId()) await prepararBase(destino);
      if (vigente()) setEstado((e) => ({ ...e, registrar: false, pantalla: "panel" }));
    } else if (destino === P.confirmar) {
      await tocar(document.querySelector('a[href^="/pedidos/"]'));
      if (!vigente()) return;
      setEstado((e) => ({ ...e, hojaPedido: true }));
      await esperar(900);
      if (!vigente()) return;
      await tocarYPulsar(porTexto('[role="dialog"] button', "Confirmar pedido"));
    } else if (destino === P.despachar) {
      await tocarYPulsar(porTexto('[role="dialog"] button', /Despachar pedido/));
    } else await fijo();
  });

  // Adonde llega el ♥ que cruza desde el teléfono de Ana (ningún paso lo usa hoy: el cambio de lado es una pantalla propia).
  useAnclas((id) => (id === "bloqueo" ? { el: document.querySelector('[data-ancla="bloqueo"]'), w: 60 } : null));

  const id = pedidoId();
  return (
    <div data-telefono="tienda" data-pantalla={estado.pantalla} className="h-dvh overflow-hidden bg-fondo">
      <ProveedorDemo cargando={null}>
        <ToastProvider>
          <ProveedorToast>
            <PanelUIProvider sinNovedades>
              <div key={estado.montaje}>
                <div className="dz-pantalla" data-visible={estado.pantalla === "panel" ? "" : undefined}>
                  {estado.pantalla === "panel" && (
                    <div className="mx-auto flex min-h-dvh max-w-[480px] flex-col bg-fondo pt-[44px]">
                      {/* Sin el encabezado del panel: mostraría el plan y los créditos, y la landing no habla de planes. */}
                      <main className="flex-1 pb-8">
                        <VistaPedidos>{estado.hojaPedido && id && <HojaPedido pedidoId={id} sinConteo />}</VistaPedidos>
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
                  <Bloqueo aviso />
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
