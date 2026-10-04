"use client";

import { useEffect, useState, type ReactNode } from "react";
import tokens from "@/referencias/sistema-de-diseno/tokens.json";
import { CARTAS_JUGADAS, lineaJugada } from "@/lib/proxima-jugada";
import {
  IconoBuscar,
  IconoCamion,
  IconoCheck,
  IconoChevronDerecha,
  IconoCorazon,
  IconoMas,
  IconoMoneda,
  IconoPedidos,
  IconoWhatsApp,
} from "@/components/iconos";
import {
  Alerta,
  Avatar,
  Aviso,
  Boton,
  BotonIcono,
  Buscador,
  Campo,
  CampoMonto,
  Cantidad,
  FilaAgregar,
  Contador,
  ControlSegmentado,
  Etiqueta,
  FilaLista,
  FilaPastillas,
  GrupoOpciones,
  ListaAgrupada,
  CheckSeleccion,
  CuadriculaSeleccion,
  ElegirMensaje,
  EditorEtiquetas,
  FilaVariante,
  VideoProducto,
  Interruptor,
  ProveedorToast,
  TiraMedios,
  Tarjeta,
  TarjetaDocumento,
  TarjetaJugada,
  TarjetaProximamente,
  HojaProximamente,
  VistaPreviaWhatsApp,
  useToastUI,
  VistaToast,
  type JerarquiaBoton,
  type TamanoBoton,
} from "@/components/ui";
import { IconoCerrar } from "@/components/iconos";

type Tema = "claro" | "oscuro";

/**
 * Guía viva (/diseno). El control Claro / Oscuro pone data-theme="dark" en el contenedor de la página; también en <html>
 * mientras la página está abierta, porque la Alerta y el toast se pintan en un portal fuera del contenedor.
 */
export function GuiaDiseno() {
  const [tema, setTema] = useState<Tema>("claro");
  useEffect(() => {
    const html = document.documentElement;
    if (tema === "oscuro") html.setAttribute("data-theme", "dark");
    else html.removeAttribute("data-theme");
    return () => html.removeAttribute("data-theme");
  }, [tema]);

  return (
    <div data-theme={tema === "oscuro" ? "dark" : undefined} className="min-h-dvh bg-fondo text-texto">
      <ProveedorToast>
        <div className="mx-auto flex max-w-180 flex-col gap-8 px-5 pt-6 pb-40">
          <header className="flex flex-col gap-4">
            <div>
              <h1 className="font-display text-titulo-pantalla">Sistema de diseño</h1>
              <p className="mt-1 text-cuerpo text-texto-secundario">
                Guía viva: los componentes reales de <code>components/ui</code>. Reglas en <code>docs/09-sistema-de-diseno.md</code>.
              </p>
            </div>
            <div className="max-w-80">
              <ControlSegmentado
                etiqueta="Tema de la guía"
                valor={tema}
                alCambiar={setTema}
                opciones={[
                  { id: "claro", texto: "Claro" },
                  { id: "oscuro", texto: "Oscuro" },
                ]}
              />
            </div>
          </header>

          <Colores />
          <Tipografia />
          <RadiosYSombras />
          <Botones />
          <Elegir />
          <Listas />
          <Avisos />
          <Hojas />
          <Tarjetas />
          <EtiquetasYAvatares />
          <Campos />
          <Producto />
          <Iconos />
        </div>
      </ProveedorToast>
    </div>
  );
}

function Seccion({ numero, titulo, children, nota }: { numero: string; titulo: string; children: ReactNode; nota?: ReactNode }) {
  return (
    <section className="flex flex-col gap-4" aria-labelledby={`s-${numero}`}>
      <div>
        <h2 id={`s-${numero}`} className="font-display text-titulo-seccion">
          {numero}. {titulo}
        </h2>
        {nota && <p className="mt-1 text-secundario text-texto-secundario">{nota}</p>}
      </div>
      {children}
    </section>
  );
}

function Rotulo({ children }: { children: ReactNode }) {
  return <p className="text-etiqueta text-texto-secundario">{children}</p>;
}

function Fila({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap items-center gap-3">{children}</div>;
}

// ---- 2. Color ----

function Colores() {
  return (
    <Seccion numero="2" titulo="Color" nota="Por función, no por marca. En oscuro solo cambian los valores.">
      <ul className="grid grid-cols-1 gap-2 min-[560px]:grid-cols-2">
        {tokens.color.tokens.map((t) => (
          <li key={t.name} className="flex items-center gap-3 rounded-radio-m border border-linea bg-superficie p-2.5">
            <span aria-hidden="true" className="size-11 shrink-0 rounded-radio-s border border-linea" style={{ background: `var(--${t.name})` }} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-secundario font-extrabold">{t.name}</span>
              <span className="block truncate text-etiqueta font-normal text-texto-secundario tabular-nums">
                {t.value.light} · {t.value.dark}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </Seccion>
  );
}

// ---- 3. Tipografía ----

const ESCALA: { nombre: string; clase: string; muestra: string }[] = [
  { nombre: "cifra · 36/38 Fredoka", clase: "font-display text-cifra", muestra: "RD$6,100" },
  { nombre: "titulo-pantalla · 32/34 Fredoka", clase: "font-display text-titulo-pantalla", muestra: "Tu catálogo" },
  { nombre: "titulo-hoja · 24/28 Fredoka", clase: "font-display text-titulo-hoja", muestra: "Registrar abono" },
  { nombre: "titulo-seccion · 20/24 Fredoka", clase: "font-display text-titulo-seccion", muestra: "Lo que más se vende" },
  { nombre: "destacado · 17/24 800", clase: "text-destacado", muestra: "Marleny Peña" },
  { nombre: "cuerpo · 16/24", clase: "text-cuerpo", muestra: "Te avisamos en cuanto empecemos a armarlo." },
  { nombre: "secundario · 14/20", clase: "text-secundario", muestra: "2 pedidos · hace 26 días" },
  { nombre: "etiqueta · 12/16 800", clase: "text-etiqueta", muestra: "A crédito" },
  { nombre: "contador · 11/14 800", clase: "text-contador", muestra: "12" },
  { nombre: "mano · 22/24 Caveat", clase: "font-mano text-mano text-atencion-texto", muestra: "tu top 3" },
  { nombre: "mano-celebracion · 32/32 Caveat", clase: "font-mano text-mano-celebracion text-atencion-texto", muestra: "¡Terminó de pagar!" },
];

function Tipografia() {
  return (
    <Seccion numero="3" titulo="Tipografía" nota="Escala cerrada, en rem. Los títulos llevan font-display; la letra a mano, font-mano.">
      <ListaAgrupada>
        {ESCALA.map((e) => (
          <li key={e.nombre} className="flex flex-col gap-1 border-t border-linea px-4 py-3 first:border-t-0">
            <Rotulo>{e.nombre}</Rotulo>
            <p className={`${e.clase} break-words`}>{e.muestra}</p>
          </li>
        ))}
      </ListaAgrupada>
    </Seccion>
  );
}

// ---- 4. Radios y sombras ----

function RadiosYSombras() {
  return (
    <Seccion numero="4" titulo="Espacio, radios y profundidad" nota="Espacio en múltiplos de 4 (las clases de Tailwind ya coinciden). Cinco radios y dos sombras.">
      <Fila>
        {[
          ["radio-s · 10", "rounded-radio-s"],
          ["radio-m · 16", "rounded-radio-m"],
          ["radio-l · 22", "rounded-radio-l"],
          ["radio-xl · 28", "rounded-radio-xl"],
          ["pildora", "rounded-full"],
        ].map(([n, c]) => (
          <div key={n} className="flex flex-col items-center gap-1.5">
            <span className={`block size-16 border-[1.5px] border-accion bg-accion-suave ${c}`} />
            <Rotulo>{n}</Rotulo>
          </div>
        ))}
      </Fila>
      <Fila>
        <div className="flex h-20 w-40 items-center justify-center rounded-radio-l bg-superficie text-secundario font-extrabold shadow-flotante">sombra-flotante</div>
        <div className="flex h-20 w-40 items-center justify-center rounded-t-radio-xl bg-fondo text-secundario font-extrabold shadow-hoja">sombra-hoja</div>
      </Fila>
    </Seccion>
  );
}

// ---- 5. Botones ----

const JERARQUIAS: JerarquiaBoton[] = ["principal", "secundario", "terciario", "peligro", "resalte"];
const TAMANOS: TamanoBoton[] = ["grande", "normal", "compacto"];

function Botones() {
  const [contador, setContador] = useState(0);
  const [cantidadEj, setCantidadEj] = useState(2);
  return (
    <Seccion numero="5" titulo="Botones" nota="Píldora, extrabold. Una sola acción principal por vista; destruir nunca es principal.">
      {JERARQUIAS.map((j) => (
        <div key={j} className="flex flex-col gap-2">
          <Rotulo>{j}</Rotulo>
          <Fila>
            {TAMANOS.map((t) => (
              <Boton key={t} jerarquia={j} tamano={t}>
                {t === "grande" ? "Guardar abono" : t === "normal" ? "Registrar" : "Cambiar"}
              </Boton>
            ))}
            <Boton jerarquia={j} deshabilitado>
              Deshabilitado
            </Boton>
            <Boton jerarquia={j} cargando>
              Cargando
            </Boton>
          </Fila>
        </div>
      ))}
      <div className="flex flex-col gap-2">
        <Rotulo>Escribir por WhatsApp (compacto, relleno accion) · enlace · terciario peligro (pila de acciones, filas) · peligro relleno (solo en Alerta) · de solo icono</Rotulo>
        <Fila>
          <Boton icono={<IconoMas tamano={20} strokeWidth={2.4} />}>Crear pedido</Boton>
          <Boton whatsapp href="https://wa.me/" target="_blank" rel="noreferrer">
            Escribir
          </Boton>
          <Boton jerarquia="secundario" tamano="compacto" href="/diseno#s-5">
            Ver historial
          </Boton>
          <Boton jerarquia="terciario" tono="peligro">
            Cancelar pedido
          </Boton>
          <Boton jerarquia="peligro" relleno>
            Sí, borrar
          </Boton>
          <BotonIcono etiqueta="Cerrar">
            <IconoCerrar tamano={20} strokeWidth={2.2} />
          </BotonIcono>
          <BotonIcono etiqueta="Agregar otro" tono="accion">
            <IconoMas tamano={18} />
          </BotonIcono>
        </Fila>
      </div>
      <div className="flex flex-col gap-2">
        <Rotulo>secundario con relleno `superficie` · compacto dentro de una tarjeta · fila «Agregar …»</Rotulo>
        <div className="flex max-w-90 flex-col gap-3">
          <Boton jerarquia="secundario" anchoCompleto>
            Agregar más productos
          </Boton>
          <Tarjeta>
            <div className="flex items-center gap-3">
              <Avatar nombre="Carolina Peña" />
              <p className="min-w-0 flex-1 truncate text-destacado">Carolina Peña</p>
              <Boton jerarquia="secundario" tamano="compacto">
                Cambiar
              </Boton>
            </div>
            <FilaAgregar texto="Agregar cupón" alTocar={() => undefined} className="mt-2" />
          </Tarjeta>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <Rotulo>cantidad (− 1 +): cuadrados de 36 · − hundido, + verde · cada uno se apaga (40 %) en el mínimo o en el tope del stock</Rotulo>
        <Fila>
          <Cantidad valor={cantidadEj} max={4} alCambiar={setCantidadEj} />
          <Cantidad valor={4} max={4} alCambiar={() => {}} />
        </Fila>
      </div>
      <div className="flex flex-col gap-2">
        <Rotulo>lado a lado (secundario izquierda, principal derecha) · bloquea el doble toque</Rotulo>
        <div className="grid grid-cols-2 gap-3">
          <Boton jerarquia="secundario" anchoCompleto>
            Cancelar
          </Boton>
          <Boton anchoCompleto onClick={() => new Promise<void>((ok) => setTimeout(() => (setContador((c) => c + 1), ok()), 1200))}>
            Guardar ({contador})
          </Boton>
        </div>
      </div>
    </Seccion>
  );
}

// ---- 6. Elegir ----

function Elegir() {
  const [filtro, setFiltro] = useState<"todos" | "repiten" | "nuevos" | "deben" | "dormidos">("todos");
  const [metodo, setMetodo] = useState<"efectivo" | "transferencia" | "otro">("efectivo");
  const [vistaVentas, setVistaVentas] = useState<"dia" | "semana" | "mes">("semana");
  const [vista, setVista] = useState<"hoy" | "semana" | "mes">("semana");
  const [mensaje, setMensaje] = useState<"amable" | "directo">("amable");
  const [acercar, setAcercar] = useState<"saludo" | "codigo" | "productos">("saludo");
  const [productos, setProductos] = useState<string[]>(["oxana"]);
  return (
    <Seccion numero="6" titulo="Elegir: pastillas, opciones y controles" nota="Filtro (verde lleno), opción de formulario (menta con check) y control segmentado.">
      <div className="flex flex-col gap-2">
        <Rotulo>pastillas de filtro · Todos, el que pide acción y los demás; sin divisor (Dormidos tiene 0 y se oculta)</Rotulo>
        <FilaPastillas
          etiqueta="Filtrar clientes"
          valor={filtro}
          alCambiar={setFiltro}
          ocultarVacios
          opciones={[
            { id: "todos", texto: "Todos" },
            { id: "deben", texto: "Deben", cantidad: 4, atencion: true },
            { id: "repiten", texto: "Repiten", cantidad: 34 },
            { id: "nuevos", texto: "Nuevos", cantidad: 3 },
            { id: "dormidos", texto: "Dormidos", cantidad: 0 },
          ]}
        />
        <Rotulo>sin contador</Rotulo>
        <FilaPastillas
          etiqueta="Periodo"
          valor={vista}
          alCambiar={setVista}
          opciones={[
            { id: "hoy", texto: "Hoy" },
            { id: "semana", texto: "7 días" },
            { id: "mes", texto: "Mes" },
          ]}
        />
      </div>
      <GrupoOpciones
        titulo="¿Cómo te pagó?"
        valor={metodo}
        alCambiar={setMetodo}
        opciones={[
          { id: "efectivo", texto: "Efectivo" },
          { id: "transferencia", texto: "Transferencia" },
          { id: "otro", texto: "Otro" },
        ]}
      />
      <div className="flex max-w-90 flex-col gap-2">
        <Rotulo>compacta: tres opciones cortas en una fila</Rotulo>
        <GrupoOpciones
          compacta
          titulo="¿Con qué te acercas?"
          valor={acercar}
          alCambiar={setAcercar}
          opciones={[
            { id: "saludo", texto: "Un saludo" },
            { id: "codigo", texto: "Un código" },
            { id: "productos", texto: "Productos" },
          ]}
        />
      </div>
      <div className="flex max-w-90 flex-col gap-2">
        <Rotulo>elegir el mensaje: botón compacto que abre la hoja &quot;Elige el mensaje&quot;</Rotulo>
        <ElegirMensaje
          etiqueta="Mensaje del recordatorio"
          elegido={mensaje}
          alElegir={setMensaje}
          className="self-start"
          opciones={[
            { id: "amable", titulo: "Amable", texto: "¡Hola, Marleny! Te recuerdo con cariño el saldo de RD$1,300. ¡Gracias!" },
            { id: "directo", titulo: "Directo", texto: "Hola, Marleny. Tienes un saldo pendiente de RD$1,300." },
          ]}
        />
      </div>
      <div className="flex max-w-90 flex-col gap-2">
        <Rotulo>cuadrícula seleccionable: 3 columnas, hasta N (las demás se apagan)</Rotulo>
        <CuadriculaSeleccion
          etiqueta="Productos para el mensaje"
          maximo={2}
          elegidos={productos}
          alCambiar={setProductos}
          elementos={[
            { id: "oxana", titulo: "Oxana Black", detalle: "RD$1,200", imagen: <span className="block size-full bg-marca-rosa" /> },
            { id: "zakat", titulo: "Zakat", detalle: "RD$950", imagen: <span className="block size-full bg-accion-suave" /> },
            { id: "amber", titulo: "Amber Oud", detalle: "RD$1,450", imagen: <span className="block size-full bg-superficie-hundida" /> },
          ]}
        />
      </div>
      <div className="flex max-w-90 flex-col gap-2">
        <Rotulo>control segmentado: solo cambia la vista o el modo, no guarda un dato</Rotulo>
        <ControlSegmentado
          etiqueta="Ver ventas por"
          valor={vistaVentas}
          alCambiar={setVistaVentas}
          opciones={[
            { id: "dia", texto: "Día" },
            { id: "semana", texto: "Semana" },
            { id: "mes", texto: "Mes" },
          ]}
        />
      </div>
    </Seccion>
  );
}

// ---- 7. Listas ----

function Listas() {
  return (
    <Seccion numero="7" titulo="Listas" nota="Agrupada: filas sencillas en una tarjeta. Sueltas: cada elemento con estado propio en su tarjeta.">
      <ListaAgrupada etiqueta="Clientes de ejemplo">
        <FilaLista titulo="Marleny Peña" detalle="2 pedidos · hace 26 días" inicio={<Avatar nombre="Marleny Peña" />} href="/diseno#s-7" />
        <FilaLista titulo="Yahaira Rosario" detalle="1 pedido · ayer" inicio={<Avatar nombre="Yahaira Rosario" />} fin="RD$4,300" onClick={() => undefined} />
        <FilaLista titulo="Abono · Efectivo" detalle="22 sep · al entregar" inicio={<IconoMoneda tamano={24} className="text-exito-texto" />} fin="RD$1,000" />
      </ListaAgrupada>
      <ListaAgrupada etiqueta="Filas con casilla de selección">
        <FilaLista marcada onClick={() => undefined} inicio={<CheckSeleccion marcado />} titulo="Oxana Black" detalle="Vendido 30 sep" />
        <FilaLista marcada={false} onClick={() => undefined} inicio={<CheckSeleccion marcado={false} />} titulo="Zakat" detalle="Nunca se vendió" />
      </ListaAgrupada>
      <VistaPreviaWhatsApp nombre="Luisanna Peña" texto={"¡Hola, Luisanna! Te recuerdo con cariño que quedó pendiente RD$2,425. ¡Gracias!"} hora="9:41 a. m." />
      <VistaPreviaWhatsApp sinDestinatario texto={"¡Hola! Para reponer:\n• 2 Oxana Black\n• 1 Zakat\n¿Me confirmas precio y cuándo llegan? ¡Gracias!"} hora="9:41 a. m." />
      <ul className="flex flex-col gap-3">
        <li>
          <Tarjeta href="/diseno#s-7">
            <div className="flex items-center justify-between gap-2">
              <span className="text-secundario text-texto-secundario">#1042 · Hace 1 h</span>
              <Etiqueta tono="atencion">Nuevo</Etiqueta>
            </div>
            <p className="mt-1 text-destacado">Carolina Peña</p>
            <p className="text-secundario text-texto-secundario">2 productos · Del catálogo</p>
          </Tarjeta>
        </li>
        <li>
          <Tarjeta>
            <div className="flex items-center justify-between gap-2">
              <span className="text-destacado">Anyelo Brito</span>
              <span className="text-destacado text-atencion-texto tabular-nums">RD$1,900</span>
            </div>
            <Etiqueta tono="atencion" className="mt-1">
              Atrasado 6 días
            </Etiqueta>
          </Tarjeta>
        </li>
      </ul>
    </Seccion>
  );
}

// ---- 8. Avisos, toast y alerta ----

function Avisos() {
  const { mostrarToast, ocultarToast } = useToastUI();
  const [alerta, setAlerta] = useState<null | "peligro" | "accion">(null);
  return (
    <Seccion numero="8" titulo="Avisos y confirmaciones" nota="Toast (resultado), aviso en línea (lo que se ve) y alerta (lo que no se deshace).">
      <div className="flex flex-col gap-2">
        <Aviso tono="neutro">Por ahora tu catálogo se conecta por enlace.</Aviso>
        <Aviso tono="atencion">
          Queda debiendo <b className="text-atencion-texto">RD$3,300</b>. Te aviso el 15 oct.
        </Aviso>
        <Aviso tono="exito" icono={<IconoCheck tamano={20} strokeWidth={2.4} />}>
          Con este abono queda saldado.
        </Aviso>
        <Aviso tono="peligro" accion={{ texto: "Reintentar", alTocar: () => mostrarToast("Reintentando…") }}>
          No pudimos cargar tus pedidos.
        </Aviso>
      </div>
      <div className="flex flex-col gap-2">
        <Rotulo>toast (estático)</Rotulo>
        <VistaToast texto="Abono guardado" accion={{ texto: "Deshacer", alTocar: () => undefined }} className="max-w-100" />
        <VistaToast texto="Sin conexión" accion={{ texto: "Reintentar", alTocar: () => undefined }} className="max-w-100" />
      </div>
      <Fila>
        <Boton jerarquia="secundario" tamano="compacto" onClick={() => mostrarToast("Abono guardado", { accion: { texto: "Deshacer", alTocar: () => undefined } })}>
          Mostrar toast
        </Boton>
        <Boton jerarquia="secundario" tamano="compacto" onClick={() => mostrarToast("Sin conexión", { persistente: true, accion: { texto: "Reintentar", alTocar: () => undefined } })}>
          Toast persistente
        </Boton>
        <Boton jerarquia="secundario" tamano="compacto" onClick={() => ocultarToast()}>
          Ocultar
        </Boton>
      </Fila>
      <Fila>
        <Boton jerarquia="peligro" onClick={() => setAlerta("peligro")}>
          Borrar abono
        </Boton>
        <Boton jerarquia="secundario" onClick={() => setAlerta("accion")}>
          Confirmar algo
        </Boton>
      </Fila>
      <Alerta
        abierta={alerta === "peligro"}
        titulo="¿Borrar este abono?"
        descripcion="La deuda vuelve a subir RD$500."
        accion={{ texto: "Borrar", tono: "peligro", alConfirmar: () => (setAlerta(null), void mostrarToast("Abono borrado")) }}
        alCancelar={() => setAlerta(null)}
      />
      <Alerta
        abierta={alerta === "accion"}
        titulo="¿Publicar tu catálogo?"
        descripcion="Tus clientes lo verán en cuanto toques Publicar."
        accion={{ texto: "Publicar", tono: "accion", alConfirmar: () => setAlerta(null) }}
        alCancelar={() => setAlerta(null)}
      />
    </Seccion>
  );
}

// ---- 9. Hojas (representación: la hoja real es components/hoja.tsx y se migra después) ----

function Hojas() {
  return (
    <Seccion
      numero="9"
      titulo="Hojas"
      nota="La hoja real es components/hoja.tsx (se migra después). Automática por defecto; completa solo con teclado o lista que crece."
    >
      <div className="overflow-hidden rounded-radio-l bg-velo px-4 pt-10">
        <div className="mx-auto flex max-w-100 flex-col gap-3.5 rounded-t-radio-xl bg-fondo px-5 pt-2.5 pb-5 shadow-hoja">
          <span aria-hidden="true" className="mx-auto h-1.5 w-10 rounded-full bg-borde-pastilla" />
          <div className="flex items-center justify-between gap-3">
            <p className="font-display text-titulo-hoja">Registrar abono</p>
            <BotonIcono etiqueta="Cerrar (ejemplo)">
              <IconoCerrar tamano={20} strokeWidth={2.2} />
            </BotonIcono>
          </div>
          <p className="text-secundario text-texto-secundario">Yahaira debe RD$2,800 del pedido #1006</p>
          <Boton tamano="grande" anchoCompleto>
            Guardar abono
          </Boton>
        </div>
      </div>
    </Seccion>
  );
}

// ---- 10. Tarjetas ----

function Tarjetas() {
  const [proximamente, setProximamente] = useState(false);
  return (
    <Seccion numero="10" titulo="Tarjetas" nota="Sin sombra. Destacada: una por pantalla. De marca: plan y novedades.">
      <div className="grid grid-cols-1 gap-3 min-[560px]:grid-cols-3">
        <Tarjeta>
          <Rotulo>normal</Rotulo>
          <p className="mt-1 text-destacado">Pedidos recibidos</p>
          <p className="font-display text-titulo-seccion tabular-nums">5</p>
        </Tarjeta>
        <Tarjeta tono="destacada">
          <p className="text-secundario">Ventas de septiembre</p>
          <p className="font-display text-cifra tabular-nums">RD$6,100</p>
        </Tarjeta>
        <Tarjeta tono="marca" onClick={() => undefined}>
          <p className="text-secundario font-extrabold">Plan 20</p>
          <p className="text-cuerpo">12 de 20 productos</p>
        </Tarjeta>
      </div>
      <div className="flex max-w-90 flex-col gap-2">
        <Rotulo>tarjeta de documento (factura, recibo): miniatura, título, etiqueta y dos botones con texto</Rotulo>
        <TarjetaDocumento titulo="Factura #1039" etiqueta={{ texto: "Al contado", tono: "exito" }} alDescargar={() => undefined} alCompartir={() => undefined} />
        <TarjetaDocumento titulo="Factura #1036" etiqueta={{ texto: "A crédito", tono: "atencion" }} alDescargar={() => undefined} alCompartir={() => undefined} />
      </div>
      <div className="flex max-w-100 flex-col gap-2">
        <Rotulo>tarjeta de jugada (solo Tu próxima jugada): malla viva que sigue al dedo, Caveat, Fredoka y el mazo con su ciclo de 14 s</Rotulo>
        <TarjetaJugada
          titulo="Segundo aaah"
          linea={lineaJugada("segundo", 4)}
          cartas={CARTAS_JUGADAS}
          destacada="segundo"
          etiqueta="Tu próxima jugada: Segundo aaah, 4 clientes. Ver tus jugadas"
          alTocar={() => undefined}
        />
        <TarjetaJugada titulo={null} cartas={CARTAS_JUGADAS} etiqueta="Tu próxima jugada: la próxima conversación empieza aquí" alTocar={() => undefined} />
      </div>
      <div className="flex max-w-100 flex-col gap-2">
        <Rotulo>función en preparación: malla apagada y lenta tras un velo, pastilla &quot;Próximamente&quot;; toca para ver su hoja (se enciende en lib/funciones.ts)</Rotulo>
        <TarjetaProximamente
          voz="Tu próxima jugada"
          titulo="Algo se está cocinando"
          linea="Pronto te diré a quién escribirle hoy."
          etiqueta="Próximamente: Tu próxima jugada. Algo se está cocinando. Ver más"
          alTocar={() => setProximamente(true)}
        />
        {proximamente && (
          <HojaProximamente abierta alCerrar={() => setProximamente(false)} titulo="Tu próxima jugada" imagen="/ilustraciones/proxima-jugada/volver-a-saludar.webp">
            <p>Estamos afinando algo que te va a encantar. Cada día te va a decir a quién escribirle y qué decirle para que esa venta no se enfríe. Ya casi, ya casi.</p>
            <p className="text-secundario text-texto-secundario">Mientras tanto, sigue vendiendo. Aquí te aviso cuando esté lista.</p>
          </HojaProximamente>
        )}
      </div>
    </Seccion>
  );
}

// ---- 11. Etiquetas, contadores y avatares ----

function EtiquetasYAvatares() {
  return (
    <Seccion numero="11" titulo="Etiquetas, contadores y avatares">
      <Fila>
        <Etiqueta>Sin fecha acordada</Etiqueta>
        <Etiqueta tono="exito" icono={<IconoCheck tamano={14} strokeWidth={3} />}>
          Pagado
        </Etiqueta>
        <Etiqueta tono="atencion">Atrasado 6 días</Etiqueta>
        <Etiqueta tono="fuerte">Agotado</Etiqueta>
        <Etiqueta tono="exito" punto>
          En línea
        </Etiqueta>
      </Fila>
      <Fila>
        <Contador valor={3} />
        <Contador valor={12} atencion />
        <Contador valor={140} />
        <span className="inline-flex items-center gap-1.5 rounded-full bg-accion px-3 py-1.5 text-secundario font-extrabold text-sobre-accion">
          Sobre acción <Contador valor={8} sobreAccion />
        </span>
      </Fila>
      <Fila>
        <Avatar nombre="Marleny Peña" />
        <Avatar nombre="Esencias Michel" tipo="tienda" />
        <Avatar nombre="Marleny Peña" repite />
        <Avatar nombre="Marleny Peña" tamano="grande" solo repite />
        <Avatar nombre="Esencias Michel" tipo="tienda" tamano="grande" solo />
      </Fila>
    </Seccion>
  );
}

// ---- Campos ----

function Campos() {
  const [busqueda, setBusqueda] = useState("");
  const [telefono, setTelefono] = useState("80955");
  const [monto, setMonto] = useState("1500");
  return (
    <Seccion numero="12" titulo="Campos" nota="Rótulo arriba, ayuda o error abajo. Alto 50, letra 16 (iOS no hace zoom).">
      <Buscador etiqueta="Buscar cliente" valor={busqueda} alCambiar={setBusqueda} placeholder="Nombre o WhatsApp" />
      <div className="grid grid-cols-1 gap-4 min-[560px]:grid-cols-2">
        <Campo etiqueta="Nombre" placeholder="Ej: Paola Jiménez" autoComplete="off" />
        <Campo etiqueta="Precio" inputMode="numeric" placeholder="0" ayuda="En pesos, sin decimales." />
        <Campo
          etiqueta="WhatsApp"
          type="tel"
          value={telefono}
          onChange={(e) => setTelefono(e.target.value)}
          error={telefono.replace(/\D/g, "").length === 10 ? undefined : "Escríbelo con 809, 829 o 849 y 7 dígitos más."}
        />
        <Campo etiqueta="Código" value="AAAH10" disabled readOnly />
        <Campo etiqueta="Con foco (cursor dentro): contorno verde de 2 px" defaultValue="Paola" className="[&_input]:border-accion" />
        <Campo etiqueta="Con error: contorno rojo de 2 px" defaultValue="809" error="Escríbelo con 809, 829 o 849 y 7 dígitos más." />
        <CampoMonto etiqueta="Te dio ahora (opcional)" valor={monto} alCambiar={setMonto} />
        <CampoMonto etiqueta="¿Cuánto te pagó?" tamano="grande" valor={monto} alCambiar={setMonto} error={Number(monto) > 1000 ? "Te debe RD$1,000; no puedes abonar más que eso." : undefined} />
      </div>
    </Seccion>
  );
}

// ---- Producto: medios, etiquetas, interruptor y variantes ----

const FOTO_GUIA = "/seed/productos/mayar-natural-intense.svg";

function Producto() {
  const [visible, setVisible] = useState(true);
  const [encargo, setEncargo] = useState(false);
  const [tallas, setTallas] = useState(["S", "M", "L"]);
  const [ocasiones, setOcasiones] = useState(["Día", "Oficina"]);
  const [medios, setMedios] = useState([
    { id: "a", tipo: "foto" as const, imagen: FOTO_GUIA },
    { id: "b", tipo: "video" as const, imagen: "/seed/productos/kiara-pink.svg", duracionS: 18 },
    { id: "c", tipo: "foto" as const, imagen: "/seed/productos/parade.svg", progreso: 62 },
  ]);
  const [stock, setStock] = useState({ s: 2, m: 1, l: 0 });
  const video = useVideoDeMuestra();
  return (
    <Seccion numero="14" titulo="Producto" nota="Tira de fotos y video, etiquetas editables, interruptor, stock por variante y el video del producto.">
      <div className="flex max-w-90 flex-col gap-2">
        <Rotulo>tira de medios · 76 px, portada primero, video con su duración, subiendo con anillo; mantén presionado para ordenar</Rotulo>
        <TiraMedios
          elementos={medios}
          alTocar={() => undefined}
          alAgregar={() => undefined}
          alMover={(desde, hasta) =>
            setMedios((l) => {
              const copia = [...l];
              const [m] = copia.splice(desde, 1);
              copia.splice(hasta, 0, m!);
              return copia;
            })
          }
          nota="Hasta 10. Mantén presionado para ordenar."
        />
        <Rotulo>al llegar al límite, la casilla se apaga con su motivo</Rotulo>
        <TiraMedios elementos={medios.slice(0, 2)} alTocar={() => undefined} alAgregar={() => undefined} alMover={() => undefined} bloqueo="Ya tiene 10. Quita uno para agregar otro." />
      </div>
      <div className="flex max-w-90 flex-col gap-4">
        <EditorEtiquetas etiqueta="Valores" valores={tallas} alCambiar={setTallas} sugerencias={["XS", "S", "M", "L", "XL"]} largoMaximo={20} />
        <EditorEtiquetas etiqueta="Ideal para (con valores fijos: casillas)" valores={ocasiones} alCambiar={setOcasiones} permitidos={["Día", "Oficina", "Noche", "Citas", "Regalo"]} />
      </div>
      <div className="flex max-w-90 flex-col gap-2">
        <Rotulo>interruptor: encender o apagar algo; con su texto en la fila</Rotulo>
        <ListaAgrupada>
          <FilaLista titulo="Visible en el catálogo" accion={<Interruptor encendido={visible} alCambiar={setVisible} etiqueta="Visible en el catálogo" />} />
          <FilaLista titulo="Por encargo" detalle="Se puede pedir aunque no haya." accion={<Interruptor encendido={encargo} alCambiar={setEncargo} etiqueta="Por encargo" />} />
          <FilaLista titulo="Bloqueado (40 %)" accion={<Interruptor encendido={false} alCambiar={() => undefined} etiqueta="Bloqueado" deshabilitado />} />
        </ListaAgrupada>
      </div>
      <div className="flex max-w-90 flex-col gap-2">
        <Rotulo>fila de variante: color conocido, &quot;Queda 1&quot; o &quot;Agotado&quot; en atención, y la cantidad</Rotulo>
        <ListaAgrupada etiqueta="Stock por variante">
          <FilaVariante texto="S · Arena" color="#e8d9c4" stock={stock.s} alCambiar={(v) => setStock((s) => ({ ...s, s: v }))} />
          <FilaVariante texto="M · Arena" color="#e8d9c4" stock={stock.m} alCambiar={(v) => setStock((s) => ({ ...s, m: v }))} />
          <FilaVariante texto="L · Negro" color="#2b2b2b" stock={stock.l} alCambiar={(v) => setStock((s) => ({ ...s, l: v }))} />
        </ListaAgrupada>
      </div>
      <div className="flex max-w-90 flex-col gap-2">
        <Rotulo>video del producto · solo, mudo y en bucle; tocarlo activa el sonido (bocina en la esquina)</Rotulo>
        {video ? <VideoProducto src={video} portada={null} className="aspect-square w-full max-w-60 rounded-radio-m" /> : <p className="text-secundario text-texto-secundario">Armando un video de muestra…</p>}
      </div>
      <div className="flex max-w-90 flex-col gap-2">
        <Rotulo>video que no se puede reproducir: queda la portada con una línea</Rotulo>
        <VideoProducto src="/no-existe.mp4" portada="/seed/productos/kiara-pink.svg" className="aspect-square w-full max-w-60 rounded-radio-m" />
      </div>
    </Seccion>
  );
}

/** Un video corto armado en el navegador (canvas + MediaRecorder) para mostrar VideoProducto sin un archivo en el repo. */
function useVideoDeMuestra() {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (typeof MediaRecorder === "undefined") return;
    const lienzo = document.createElement("canvas");
    lienzo.width = 240;
    lienzo.height = 240;
    const ctx = lienzo.getContext("2d")!;
    const grabadora = new MediaRecorder(lienzo.captureStream(24));
    const trozos: Blob[] = [];
    let creada: string | null = null;
    grabadora.ondataavailable = (e) => trozos.push(e.data);
    grabadora.onstop = () => {
      creada = URL.createObjectURL(new Blob(trozos, { type: grabadora.mimeType }));
      setUrl(creada);
    };
    let n = 0;
    const reloj = window.setInterval(() => {
      ctx.fillStyle = `hsl(${(n * 6) % 360} 60% 70%)`;
      ctx.fillRect(0, 0, 240, 240);
      ctx.fillStyle = "#10362a";
      ctx.beginPath();
      ctx.arc(120 + Math.sin(n / 6) * 70, 120, 26, 0, Math.PI * 2);
      ctx.fill();
      n++;
    }, 40);
    grabadora.start();
    const fin = window.setTimeout(() => grabadora.state !== "inactive" && grabadora.stop(), 2000);
    return () => {
      window.clearInterval(reloj);
      window.clearTimeout(fin);
      if (grabadora.state !== "inactive") grabadora.stop();
      if (creada) URL.revokeObjectURL(creada);
    };
  }, []);
  return url;
}

// ---- Iconos ----

function Iconos() {
  const lista: [string, ReactNode][] = [
    ["Pedidos", <IconoPedidos key="p" tamano={20} strokeWidth={2.2} />],
    ["Buscar", <IconoBuscar key="b" tamano={20} strokeWidth={2.2} />],
    ["Corazón", <IconoCorazon key="c" tamano={20} strokeWidth={2.2} />],
    ["WhatsApp", <IconoWhatsApp key="w" tamano={20} />],
    ["Despachar", <IconoCamion key="d" tamano={20} strokeWidth={2.2} />],
    ["Abono", <IconoMoneda key="m" tamano={20} strokeWidth={2.2} />],
    ["Abrir", <IconoChevronDerecha key="a" tamano={20} strokeWidth={2.2} />],
  ];
  return (
    <Seccion numero="15" titulo="Iconos" nota="Trazo 2.2, puntas redondeadas. 20 px normal, 24 en la barra, 16 en etiquetas.">
      <Fila>
        {lista.map(([n, i]) => (
          <span key={n} className="flex w-20 flex-col items-center gap-1.5 rounded-radio-m bg-superficie-hundida py-2.5">
            {i}
            <span className="text-etiqueta text-texto-secundario">{n}</span>
          </span>
        ))}
      </Fila>
    </Seccion>
  );
}
