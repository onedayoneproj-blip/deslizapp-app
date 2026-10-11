"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { NOMBRE_PLAN } from "@/lib/config";
import { useConsulta } from "@/lib/data/consulta";
import { mensajeDeError } from "@/lib/data/errores";
import { useData } from "@/lib/data/provider";
import { VERSION_ACTUAL } from "@/lib/novedades";
import { Hoja } from "../hoja";
import { IconoCheck, IconoChevronDerecha, IconoClientes, IconoDescargar, IconoMatraz, IconoPedidos, IconoReiniciar } from "../iconos";
import { Boton, GrupoOpciones } from "../ui";
import { usePermisos } from "@/lib/data/permisos";
import { NIVELES } from "@/lib/equipo";
import { AVISO_SIN_CAMBIO, avisoAhoraEstas, etiquetaTienda, ordenarTiendas, tituloMenu } from "@/lib/cuenta";
import { detalleMiMarca } from "@/lib/marca-retoque";
import { Esqueleto } from "../esqueleto";
import { useToast } from "../toast";
import { Logotipo } from "../marca";
import { AccesoAdmin } from "./acceso-admin";
import { FilaCuenta } from "./cuenta";
import { LogoTienda } from "./logo-tienda";
import { usePanelUI } from "./ui";
import { HojaInstalarApp, useMarcarInstalada } from "../pwa/hoja-instalar-app";
import { useAppInstalada, useEsIos, useInstalarPwa } from "../pwa/instalar-pwa";

const NOMBRE_ESTADO_CATALOGO = {
  sin: "sin catálogo",
  solicitado: "pedido recibido",
  generando: "armando",
  revisar: "listo para revisar",
  cambios: "aplicando cambios",
  publicado: "en línea",
} as const;

/**
 * Menú de tus tiendas (hace de Ajustes). De arriba abajo: la tienda activa (con Mi marca dentro de su tarjeta), las otras
 * tiendas de la cuenta (tocar una cambia de tienda), «Administrar Deslizapp» si eres admin, la cuenta de Google con «Cerrar
 * sesión» y la versión. En la demo, además, la sección «Modo demo». Aquí irá «Crear otra tienda» (PR de grupos de tiendas).
 */
export function MenuTienda({ abierto, alCerrar }: { abierto: boolean; alCerrar: () => void }) {
  const { modo, soloMirar, tiendaActivaId, cuenta, getTiendas, getMarcaRetoque, getEquipo, salirDeTienda, mirarDemoComo, cambiarTiendaActiva, simularPedidoCatalogo, simularAvanceCatalogo, reiniciarDemo, salir } = useData();
  const { permiso, esDuena } = usePermisos();
  // Solo la dueña lee su equipo (la base no se lo da a nadie más): para la marca de «esperan tu visto bueno».
  const { data: equipo } = useConsulta(`equipo:${tiendaActivaId}:${esDuena && !soloMirar}`, () =>
    esDuena && !soloMirar ? getEquipo(tiendaActivaId) : Promise.resolve(null),
  );
  const esperan = equipo?.solicitudes.length ?? 0;
  const [confirmarSalida, setConfirmarSalida] = useState(false);
  const demo = modo === "demo";
  const { data: tiendas } = useConsulta("tiendas", getTiendas);
  // La línea de Mi marca dice lo que falta con la misma regla que bloquea el retoque (también en Ver como, solo para mirar).
  const { data: marcaRetoque, cargando: leyendoMarca } = useConsulta(`marca:${tiendaActivaId}`, () => getMarcaRetoque(tiendaActivaId));
  const estadoMarca = detalleMiMarca(marcaRetoque);
  const toast = useToast();
  const { abrirNovedades, abrirMiMarca, abrirEquipo } = usePanelUI();
  const [confirmarReinicio, setConfirmarReinicio] = useState(false);
  const [cambiando, setCambiando] = useState<string | null>(null);
  // «Instalar app», fija mientras se pueda: Chrome ofrece instalar (un toque abre su diálogo) o es iPhone (abre la guía).
  const instalacion = useInstalarPwa();
  const yaInstalada = useAppInstalada();
  const esIos = useEsIos();
  const marcarInstalada = useMarcarInstalada();
  const [hojaInstalar, setHojaInstalar] = useState(false);
  const mostrarInstalar = !yaInstalada && (instalacion.puedeInstalar || esIos);
  const tocarInstalar = async () => {
    if (!instalacion.puedeInstalar) { cerrar(); setHojaInstalar(true); return; }
    const r = await instalacion.instalar();
    if (r === "accepted") {
      cerrar();
      try { await marcarInstalada?.(); } catch { /* el paso se puede marcar luego desde la guía */ }
      toast("Deslizapp ya está en tu pantalla de inicio.");
    } else if (r === "no-disponible") { cerrar(); setHojaInstalar(true); }
  };

  const ordenadas = ordenarTiendas(tiendas ?? [], tiendaActivaId);
  const activa = ordenadas.find((t) => t.id === tiendaActivaId) ?? null;
  const otras = ordenadas.filter((t) => t.id !== tiendaActivaId);

  const cerrar = () => {
    setConfirmarReinicio(false);
    setConfirmarSalida(false);
    alCerrar();
  };

  const salirDeEstaTienda = async () => {
    if (!confirmarSalida) {
      setConfirmarSalida(true);
      return;
    }
    try {
      await salirDeTienda(tiendaActivaId);
      if (demo) {
        toast("Listo. Vuelves a mirar la demo como dueña.");
        cerrar();
      } else {
        // La cuenta queda con otra tienda suya o sin tienda: se recarga para no ver nada de esta.
        window.location.reload();
      }
    } catch (e) {
      setConfirmarSalida(false);
      toast(mensajeDeError(e));
    }
  };

  const elegirTienda = async (id: string) => {
    if (cambiando || soloMirar || id === tiendaActivaId) return;
    const nombre = tiendas?.find((t) => t.id === id)?.nombre;
    const aviso = nombre ? avisoAhoraEstas(nombre) : undefined;
    setCambiando(id);
    try {
      await cambiarTiendaActiva(id, aviso);
      // Demo: el cambio fue al instante. Real: la página se recarga y el aviso sale al volver.
      if (demo) {
        if (aviso) toast(aviso);
        cerrar();
      }
    } catch {
      // Con un error la tienda sigue como estaba.
      toast(AVISO_SIN_CAMBIO);
    } finally {
      setCambiando(null);
    }
  };

  const simular = async () => {
    try {
      const { pedido, cliente } = await simularPedidoCatalogo(tiendaActivaId);
      toast(`Pedido #${pedido.numero} de ${cliente.nombre}. Alguien dijo aaah.`);
    } catch {
      toast("Sin productos visibles no hay pedido que simular.");
    }
    cerrar();
  };

  const avanzarCatalogo = async () => {
    try {
      const t = await simularAvanceCatalogo(tiendaActivaId);
      toast(t.catalogoEstado === "generando" ? `Catálogo: armando (paso ${t.catalogoPaso ?? 1} de 3).` : `Catálogo: ${NOMBRE_ESTADO_CATALOGO[t.catalogoEstado]}.`);
    } catch (e) {
      toast(mensajeDeError(e));
    }
  };

  const reiniciar = async () => {
    if (!confirmarReinicio) {
      setConfirmarReinicio(true);
      return;
    }
    await reiniciarDemo();
    toast("Datos de prueba como nuevos. Aquí no pasó nada.");
    cerrar();
  };

  const etiquetaSalir = demo ? "Salir de la demo" : soloMirar ? "Cerrar sesión y salir" : "Cerrar sesión";
  const alSalir = () => {
    cerrar();
    void salir();
  };

  return (
    <Hoja abierta={abierto} alCerrar={cerrar} titulo={tituloMenu(ordenadas.length)} altura="auto">
      {activa && (
        <div className="overflow-hidden rounded-radio-l border-2 border-accion bg-superficie" data-tienda-activa="">
          <div className="flex items-center gap-3 px-3.5 py-3" aria-label={etiquetaTienda(activa.nombre, NOMBRE_PLAN[activa.plan], true)} role="group">
            <LogoTienda tienda={activa} tamano={44} />
            <span className="min-w-0 flex-1">
              <span className="block truncate font-extrabold">{activa.nombre}</span>
              <span className="block text-secundario text-texto-secundario">
                {NOMBRE_PLAN[activa.plan]} · {activa.creditosRetoque} créditos
              </span>
            </span>
            <IconoCheck tamano={22} className="shrink-0 text-accion" />
          </div>
          <button
            type="button"
            data-solo-mirar-permitido={soloMirar || undefined}
            onClick={() => {
              cerrar();
              abrirMiMarca();
            }}
            className="tocable flex min-h-14 w-full items-center gap-3 border-t border-linea px-3.5 py-2 text-left"
          >
            <span aria-hidden="true" className="grid size-8 shrink-0 place-items-center rounded-full bg-accion-suave text-texto">✦</span>
            <span className="min-w-0 flex-1">
              <span className="block font-extrabold">Mi marca</span>
              {estadoMarca ? (
                <span className={`block text-secundario ${estadoMarca.tono === "lista" ? "text-exito-texto" : "text-atencion-texto"}`} data-estado-marca={estadoMarca.tono}>
                  {estadoMarca.texto}
                </span>
              ) : (
                // Mientras se lee (o si no se pudo leer) no se inventa un estado: una línea corta de carga o nada.
                <span className="block h-5" data-estado-marca="leyendo">{leyendoMarca && <Esqueleto className="mt-1.5 h-3 w-32 rounded-full" />}</span>
              )}
            </span>
            <IconoChevronDerecha tamano={18} className="shrink-0 text-texto-secundario" />
          </button>
          {!soloMirar && esDuena && (
            <button
              type="button"
              onClick={() => {
                cerrar();
                abrirEquipo();
              }}
              data-fila-equipo=""
              className="tocable flex min-h-14 w-full items-center gap-3 border-t border-linea px-3.5 py-2 text-left"
            >
              <span aria-hidden="true" className="grid size-8 shrink-0 place-items-center rounded-full bg-accion-suave text-texto"><IconoClientes tamano={18} /></span>
              <span className="min-w-0 flex-1">
                <span className="block font-extrabold">Tu equipo</span>
                <span className={`block text-secundario ${esperan > 0 ? "font-bold text-atencion-texto" : "text-texto-secundario"}`}>
                  {esperan > 0 ? `${esperan} ${esperan === 1 ? "espera" : "esperan"} tu visto bueno` : "Invita a quien te ayuda"}
                </span>
              </span>
              {esperan > 0 && <span aria-hidden="true" className="size-2.5 shrink-0 rounded-full bg-resalte" />}
              <IconoChevronDerecha tamano={18} className="shrink-0 text-texto-secundario" />
            </button>
          )}
          {mostrarInstalar && (
            <button
              type="button"
              onClick={() => void tocarInstalar()}
              data-fila-instalar=""
              className="tocable flex min-h-14 w-full items-center gap-3 border-t border-linea px-3.5 py-2 text-left"
            >
              <span aria-hidden="true" className="grid size-8 shrink-0 place-items-center rounded-full bg-accion-suave text-texto"><IconoDescargar tamano={18} /></span>
              <span className="min-w-0 flex-1">
                <span className="block font-extrabold">Instalar app</span>
                <span className="block text-secundario text-texto-secundario">{esIos ? "Ponla en tu pantalla de inicio" : "Un toque y queda en tu pantalla"}</span>
              </span>
              <IconoChevronDerecha tamano={18} className="shrink-0 text-texto-secundario" />
            </button>
          )}
          {!soloMirar && permiso?.rol === "staff" && (
            <div className="border-t border-linea px-3.5 py-3" data-fila-equipo="colaborador">
              <p className="font-extrabold opacity-60">Tu equipo</p>
              <p className="text-secundario text-texto-secundario">Esto lo ve quien administra la tienda. Aquí eres {NIVELES.find((n) => n.id === permiso.nivel)?.nombre}.</p>
              <Boton jerarquia="terciario" tono="peligro" tamano="compacto" className="mt-1 -ml-2" onClick={salirDeEstaTienda}>
                {confirmarSalida ? "Toca otra vez para salir" : "Salir de esta tienda"}
              </Boton>
            </div>
          )}
        </div>
      )}

      {otras.length > 0 && (
        <ul className="mt-2 space-y-2" aria-label="Tus otras tiendas">
          {otras.map((t) => (
            <li key={t.id}>
              <button
                type="button"
                onClick={() => void elegirTienda(t.id)}
                disabled={soloMirar || cambiando !== null}
                aria-label={etiquetaTienda(t.nombre, NOMBRE_PLAN[t.plan], false)}
                aria-busy={cambiando === t.id || undefined}
                className="tocable flex min-h-14 w-full items-center gap-3 rounded-radio-l border-[1.5px] border-linea bg-superficie px-3.5 py-2.5 text-left disabled:opacity-60"
              >
                <LogoTienda tienda={t} tamano={44} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-extrabold">{t.nombre}</span>
                  <span className="block text-secundario text-texto-secundario">
                    {NOMBRE_PLAN[t.plan]} · {t.creditosRetoque} créditos
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <AccesoAdmin alAbrir={cerrar} />
      <HojaInstalarApp abierta={hojaInstalar} alCerrar={() => setHojaInstalar(false)} plataformaInicial={esIos ? "ios" : "android"} />

      {demo && (
        <>
          <div className="mt-6 flex items-baseline gap-2">
            <h2 className="text-xs font-bold tracking-wider text-suave uppercase">Modo demo</h2>
            <span className="font-mano text-lg text-mandarina-texto">nadie se entera</span>
          </div>
          <div className="mt-2 rounded-3xl border border-linea bg-white px-4 py-3" data-mirar-como="">
            <GrupoOpciones
              titulo="Mirar la app como"
              etiqueta="Mirar la app como"
              compacta
              opciones={[{ id: "dueno" as const, texto: "Dueña" }, ...NIVELES.map((n) => ({ id: n.id, texto: n.nombre }))]}
              valor={permiso?.rol === "dueno" ? "dueno" : (permiso?.nivel ?? "dueno")}
              alCambiar={(n) => void mirarDemoComo(n)}
            />
            <p className="mt-1.5 text-xs text-suave">Para ver lo que ve cada persona de tu equipo. Solo en la demo.</p>
          </div>
          <div className="mt-2 divide-y divide-linea overflow-hidden rounded-3xl border border-linea bg-white">
            <AccionDemo
              icono={<IconoPedidos tamano={20} />}
              titulo="Simular pedido del catálogo"
              detalle="Entra un pedido nuevo con productos al azar."
              onClick={simular}
            />
            <AccionDemo
              icono={<IconoPedidos tamano={20} />}
              titulo="Simular avance del catálogo"
              detalle="Hace de equipo: pedido → armando → listo para revisar."
              onClick={avanzarCatalogo}
            />
            <AccionDemo
              icono={<IconoReiniciar tamano={20} />}
              titulo={confirmarReinicio ? "¿Seguro? Toca otra vez para reiniciar" : "Reiniciar datos de prueba"}
              detalle="Todo vuelve a como estaba. Como si nada."
              onClick={reiniciar}
              alerta={confirmarReinicio}
            />
            <Link href="/prueba" onClick={cerrar} className="flex items-center gap-3 px-4 py-3 text-left hover:bg-menta/40">
              <span className="text-bosque">
                <IconoMatraz tamano={20} />
              </span>
              <span>
                <span className="block text-sm font-extrabold">Laboratorio de datos</span>
                <span className="block text-xs text-suave">Para comprobar que cada tienda ve solo lo suyo.</span>
              </span>
            </Link>
          </div>
        </>
      )}

      <div className="mt-5 border-t border-linea pt-4">
        {cuenta ? (
          <FilaCuenta cuenta={cuenta} etiquetaSalir={etiquetaSalir} alSalir={alSalir} />
        ) : (
          // Ver como: no hay una cuenta que mostrar, solo la salida.
          <Boton jerarquia="secundario" anchoCompleto onClick={alSalir}>
            {etiquetaSalir}
          </Boton>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 px-1 text-[13px] text-suave">
        <span>
          <Logotipo className="text-bosque" /> · versión {VERSION_ACTUAL}
        </span>
        <button
          type="button"
          onClick={() => {
            cerrar();
            abrirNovedades();
          }}
          className="tocable font-extrabold text-bosque"
        >
          Ver novedades
        </button>
      </div>
      <div className="mt-1 flex justify-center gap-5 text-[13px] text-suave">
        <Link href="/privacidad" onClick={cerrar} className="tocable flex items-center underline">
          Privacidad
        </Link>
        <Link href="/terminos" onClick={cerrar} className="tocable flex items-center underline">
          Términos
        </Link>
      </div>
    </Hoja>
  );
}

function AccionDemo({
  icono,
  titulo,
  detalle,
  onClick,
  alerta = false,
}: {
  icono: ReactNode;
  titulo: string;
  detalle: string;
  onClick: () => void;
  alerta?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-3 px-4 py-3 text-left ${alerta ? "bg-mandarina/15" : "hover:bg-menta/40"}`}
    >
      <span className={alerta ? "text-mandarina" : "text-bosque"}>{icono}</span>
      <span>
        <span className="block text-sm font-extrabold">{titulo}</span>
        <span className="block text-xs text-suave">{detalle}</span>
      </span>
    </button>
  );
}
