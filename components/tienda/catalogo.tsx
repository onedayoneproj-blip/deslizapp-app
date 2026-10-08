"use client";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useCallback,
} from "react";
import { flushSync } from "react-dom";
import type { CSSProperties } from "react";
import type { CatalogoPublico } from "@/lib/types";
import {
  fuentePublica,
  observarFuentePublicaDemo,
  type FuentePublica,
} from "@/lib/data/publica";
import {
  ProductoNoDisponible,
  DemasiadosIntentos,
  CatalogoNoDisponible,
} from "@/lib/data/errores";
import { temaDeTienda } from "@/lib/tienda/tema";
import { portada, coleccionesDe, mostrarDetalle, catalogosDe, catalogoFiltrado, filtroVigente } from "@/lib/tienda/catalogo";
import { buscarConPrecio, avisoSinPrecio, CHIPS_PERFUME, tiposDelCatalogo, tiposEnConsulta } from "@/lib/tienda/busqueda";
import { NOMBRE_PRODUCTO, NOMBRE_TIPO, type Rubro } from "@/lib/rubros";
import { normalizarTelefonoDO } from "@/lib/telefono";
import {
  dispositivo,
  dinero,
  lineaDe,
  leerCarrito,
  guardarLocal,
  vioCoach,
  mensajePedido,
  type LineaLocal,
} from "@/lib/tienda/carrito";
import { Reel } from "./reel";
import { Icono, SelloAgotado } from "./iconos";
import { colorDePortada } from "./medios";
import { MenuCatalogo } from "./menu-catalogo";
import { DialogoCatalogo } from "./dialogo";
import { HojaPedido, HojaOpiniones, HojaAviso } from "./hojas-compra";
import { HojaPresentaciones } from "./hoja-presentaciones";
import { VisorFicha } from "./visor-ficha";
import { desde, tienePresentaciones, varianteDe, type Eleccion } from "@/lib/tienda/presentaciones";
import { Coach, Historias, ArteFinal } from "./historias";
import { Planes } from "./planes";
import { transformarPedido, volarPedido } from "@/lib/tienda/movimiento";
import { MarcaDeslizapp } from "./artes-deslizapp";
const abrirWhatsApp = (telefono: string, texto: string) => {
  window.location.assign(
    "https://wa.me/" +
      telefono.replace(/\D/g, "") +
      "?text=" +
      encodeURIComponent(texto),
  );
};
type Vista =
  | "colecciones"
  | "buscar"
  | "pedido"
  | "opiniones"
  | "aviso"
  | "coach"
  | "presentaciones"
  | "ficha"
  | "historia"
  | "planes"
  | null;
export function Catalogo({
  slug,
  demo,
  inicial,
  errorInicial,
}: {
  slug: string;
  demo: boolean;
  inicial: CatalogoPublico | null;
  errorInicial?: string;
}) {
  const [ahora] = useState(() => Date.now());
  const [c, setC] = useState(inicial);
  const [tinteOscuro,setTinteOscuro] = useState(false);
  const [error, setError] = useState(errorInicial ?? "");
  const [intento, setIntento] = useState(0);
  const fuente = useRef<FuentePublica | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const [vista, setVista] = useState<Vista>(null);
  const vistaRef = useRef<Vista>(null);
  useLayoutEffect(() => {
    vistaRef.current = vista;
  }, [vista]);
  const [perfil, setPerfil] = useState(false);
  const [filter, setFilter] = useState("all");
  // Ver por catálogo (rubro); null = Todo. Solo cambia con más de un catálogo.
  const [catalogoActivo, setCatalogoActivo] = useState<Rubro | null>(null);
  const [actual, setActual] = useState(inicial?.productos[0]?.slug ?? "");
  const [cart, setCart] = useState<LineaLocal[]>([]);
  const [query, setQuery] = useState("");
  const [tipoBusqueda, setTipoBusqueda] = useState<Rubro | null>(null);
  const [elegido, setElegido] = useState<{
    slug: string;
    varianteId: string | null;
  } | null>(null);
  // Presentaciones: la que eligió cada producto (por slug), qué hoja se abre y el «aaah» de cada reel.
  const [elecciones, setElecciones] = useState<Record<string, Eleccion>>({});
  const [modoPres, setModoPres] = useState<"a" | "b">("b");
  const bursts = useRef(new Map<string, () => void>());
  const [toast, setToast] = useState("");
  const [bar, setBar] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const envio = useRef(false);
  const barTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const entrada = useRef(false);
  const posicion = useRef(72);
  const trasCerrar = useRef<(() => void) | null>(null);
  const avisar = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 3000);
  }, []);
  const abrir = (v: Vista, hash?: string) => {
    if (vistaRef.current !== null) {
      history.replaceState(
        { ...history.state, catalogoVista: v },
        "",
        hash ?? location.href,
      );
    } else
      history.pushState(
        { ...history.state, catalogoVista: v },
        "",
        hash ?? location.href,
      );
    flushSync(() => setVista(v));
    if (v === "pedido") transformarPedido();
    if (v === "buscar")
      document.getElementById("srIn")?.focus({ preventScroll: true });
  };
  const cerrar = () => {
    if (vista === "coach") guardarLocal("dz-coach-" + slug, "1");
    if (history.state?.catalogoVista) history.back();
    else {
      setVista(null);
      history.replaceState(
        history.state,
        "",
        location.pathname + location.search,
      );
    }
  };
  useEffect(() => {
    let activa = true;
    let cancelar: (() => void) | undefined;
    if (demo)
      observarFuentePublicaDemo().then((fn) => {
        if (activa) cancelar = fn;
        else fn();
      });
    return () => {
      activa = false;
      cancelar?.();
    };
  }, [demo]);
  useEffect(() => {
    let vigente = true;
    fuentePublica(demo)
      .then(async (f) => {
        fuente.current = f;
        const datos =
          demo || !inicial ? await f.catalogoPublico(slug) : inicial;
        if (!vigente) return;
        setC(datos);
        setError("");
        setActual(datos.productos[0]?.slug ?? "");
        setCart(leerCarrito(slug, datos.productos));
        if (!entrada.current) {
          entrada.current = true;
          const hash = decodeURIComponent(location.hash.slice(1));
          if (hash.startsWith("planes")) setVista("planes");
          else if (hash === "como-funciona") setVista("historia");
          else if (!hash && datos.productos.length > 0 && !vioCoach(slug)) setVista("coach");
        }
      })
      .catch((e) => {
        if (vigente)
          setError(
            e instanceof CatalogoNoDisponible
              ? "Este catálogo se está tomando un descanso."
              : e instanceof Error
                ? e.message
                : "No pudimos abrir el catálogo.",
          );
      });
    return () => {
      vigente = false;
    };
  }, [slug, demo, inicial, intento]);
  useEffect(() => {
    const pop = () => {
      if (trasCerrar.current) {
        const accion = trasCerrar.current;
        trasCerrar.current = null;
        accion();
        return;
      }
      setVista(
        history.state?.catalogoVista ??
          (location.hash.startsWith("#planes")
            ? "planes"
            : location.hash === "#como-funciona"
              ? "historia"
              : null),
      );
    };
    window.addEventListener("popstate", pop);
    return () => window.removeEventListener("popstate", pop);
  }, []);
  useEffect(() => {
    if (!c) return;
    const html = document.documentElement;
    html.classList.add("catalogo-html");
    const anteriores = {
      padding: html.style.scrollPaddingTop,
      bottom: html.style.scrollPaddingBottom,
    };
    let raf = 0;
    let ancho = 0;
    let alto = 0;
    const layout = () => {
      const el = root.current;
      if (!el || document.activeElement?.matches("input,textarea")) return;
      const vw = html.clientWidth,
        vh = window.innerHeight;
      if (ancho === vw && Math.abs(vh - alto) < 160) return;
      ancho = vw;
      alto = vh;
      const tabs = el.querySelector<HTMLElement>(".htabs");
      const tb = 24 + (tabs?.offsetTop ?? 40) + (tabs?.offsetHeight ?? 30);
      const peek = vh < 700 ? 36 : 52;
      const top = Math.max(54, tb) + peek;
      const H = Math.max(260, Math.min(vw * 1.25, vh - top - peek, 760));
      const W = Math.min(vw, H / 1.25);
      const extra = Math.max(0, vh - top - peek - H);
      const pt = top + extra / 2,
        pb = peek + extra / 2;
      const vars = {
        "--W": W + "px",
        "--H": H + "px",
        "--pt": pt + 72 + "px",
        "--pb": pb + 160 + "px",
        "--vh": vh + "px",
        "--run": "72px",
        "--glowH": 72 + pt + H * 0.35 + "px",
        "--bagR": (vw - W) / 2 + (vw >= 900 ? -80 : 6) + "px",
        "--bagT": pt + H - 70 - (vw >= 900 ? 0 : 12) + "px",
      };
      Object.entries(vars).forEach(([k, v]) => el.style.setProperty(k, v));
      html.style.scrollPaddingTop = pt + "px";
      html.style.scrollPaddingBottom = pb + "px";
    };
    const scroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        if (vistaRef.current) return;
        const reels = [
          ...(root.current?.querySelectorAll<HTMLElement>("#reels .reel") ??
            []),
        ];
        const pt = parseFloat(html.style.scrollPaddingTop) || 0;
        let best = "",
          d = Infinity;
        for (const reel of reels) {
          const dist = Math.abs(reel.getBoundingClientRect().top - pt);
          if (dist < d) {
            d = dist;
            best = reel.dataset.id ?? "";
          }
        }
        if (best)
          setActual((prev) => {
            if (prev !== best) setBar(false);
            return best;
          });
      });
    };
    layout();
    window.addEventListener("resize", layout);
    window.addEventListener("scroll", scroll, { passive: true });
    const hash = decodeURIComponent(location.hash.slice(1));
    if (hash.startsWith("p/"))
      requestAnimationFrame(() =>
        document
          .getElementById("r-" + hash.slice(2))
          ?.scrollIntoView({ block: "start" }),
      );
    else window.scrollTo(0, 72);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", layout);
      window.removeEventListener("scroll", scroll);
      html.classList.remove("catalogo-html");
      html.style.scrollPaddingTop = anteriores.padding;
      html.style.scrollPaddingBottom = anteriores.bottom;
    };
  }, [c?.tienda.slug]); // Solo al montar la tienda, nunca por teclado/resize ni por una respuesta de likes.
  useEffect(() => {
    if (!c) return;
    const el = root.current;
    const t = temaDeTienda(c.tienda).tintes[actual];
    if (t) {
      el?.style.setProperty("--tint", t.c);
      return;
    }
    let vigente = true;
    const p = c.productos.find((p) => p.slug === actual);
    if (p)
      colorDePortada(portada(p)).then((t) => {
        if (t && vigente) { el?.style.setProperty("--tint", t.c);setTinteOscuro(t.dark); }
      });
    return () => { vigente = false; };
  }, [actual, c]);
  useLayoutEffect(() => {
    document.documentElement.classList.toggle("snap", !perfil);
    return () => document.documentElement.classList.remove("snap");
  }, [perfil]);
  useEffect(
    () => () => {
      if (barTimer.current) clearTimeout(barTimer.current);
      if (toastTimer.current) clearTimeout(toastTimer.current);
    },
    [],
  );
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      if(vista || perfil || (e.target as HTMLElement).closest("input,textarea,select,[contenteditable]")) return;
      if(e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        const reels = [...document.querySelectorAll<HTMLElement>("#reels [data-id]")];
        const i = reels.findIndex(el=>el.dataset.id === actual);
        reels[Math.max(0,Math.min(reels.length-1,i+(e.key === "ArrowDown" ? 1 : -1)))]?.scrollIntoView({block:"start",behavior:matchMedia("(prefers-reduced-motion:reduce)").matches?"auto":"smooth"});
      }
    };
    window.addEventListener("keydown",tecla);
    return ()=>window.removeEventListener("keydown",tecla);
  },[actual,vista,perfil]);
  if (!c)
    return (
      <div className="catalogo-publico catalogo-vacio">
        <h1>{error ? "Aaah… hacemos una pausa." : "Abriendo el catálogo…"}</h1>
        <p>{error}</p>
        {error && (
          <button
            className="btn primary"
            onClick={() => setIntento((i) => i + 1)}
          >
            Reintentar
          </button>
        )}
        <p>Hecho con Deslizapp</p>
      </div>
    );
  const t = c.tienda;
  // Búsqueda por tipo de producto: solo con más de un rubro (con uno, todo queda como antes).
  const tiposBusqueda = tiposDelCatalogo(c);
  const tiposEscritos = tiposEnConsulta(c, query).tipos;
  const tipoActivo = tipoBusqueda ?? (tiposEscritos.length === 1 ? tiposEscritos[0]! : null);
  const busqueda = buscarConPrecio(c, query, tipoBusqueda);
  const resultados = busqueda.productos;
  const tema = temaDeTienda(t);
  const secciones = t.personalizacion.secciones as
    Record<string, unknown> | undefined;
  const mensajes = t.personalizacion.mensajes as
    Record<string, string> | undefined;
  const nombres = NOMBRE_PRODUCTO[t.rubro];
  const catalogos = catalogosDe(c);
  const variosCatalogos = catalogos.length > 1;
  const activo = variosCatalogos && catalogos.some((x) => x.rubro === catalogoActivo) ? catalogoActivo : null;
  const cv = catalogoFiltrado(c, activo);
  const cols = coleccionesDe(cv);
  const filtro = filtroVigente(cols, filter);
  const lista = cols.find((col) => col.id === filtro)?.productos ?? cv.productos;
  const nombreLista = variosCatalogos ? "productos" : nombres.plural;
  const cambiarCatalogo = (nuevo: Rubro | null) => {
    const nuevaCols = coleccionesDe(catalogoFiltrado(c, nuevo));
    const nuevoFiltro = filtroVigente(nuevaCols, filter);
    setCatalogoActivo(nuevo);
    setFilter(nuevoFiltro);
    const primero = (nuevaCols.find((x) => x.id === nuevoFiltro)?.productos ?? [])[0];
    if (primero && actual !== "fin" && actual !== "deslizapp" && !(nuevaCols.find((x) => x.id === nuevoFiltro)?.productos ?? []).some((p) => p.slug === actual)) {
      setActual(primero.slug);
      requestAnimationFrame(() => document.getElementById("r-" + primero.slug)?.scrollIntoView({ block: "start" }));
    }
  };
  const index =
    actual === "fin"
      ? lista.length
      : actual === "deslizapp"
        ? lista.length + 1
        : lista.findIndex((p) => p.slug === actual);
  const producto = c.productos.find((p) => p.slug === elegido?.slug);
  const total = cart.reduce((s, l) => s + l.precioUnitario * l.cantidad, 0);
  const contacto =
    "https://wa.me/18297898061?text=" +
    encodeURIComponent(
      `¡Hola! Vi el catálogo de ${t.nombre} en Deslizapp y me dio un aaah. Quiero uno para mi tienda.`,
    );
  const estilo = {
    ...Object.fromEntries(
      Object.entries(tema.colores).map(([k, v]) => ["--" + k, v]),
    ),
    "--display": `"${tema.fuentes.display === "Figtree" ? "DZ Figtree" : tema.fuentes.display === "Fredoka" ? "DZ Fredoka" : tema.fuentes.display}",Georgia,serif`,
    "--body": `"${tema.fuentes.body === "Figtree" ? "DZ Figtree" : tema.fuentes.body}",system-ui,sans-serif`,
    "--iso": `url("${t.fotoPerfilUrl ?? t.logoUrl ?? ""}")`,
  } as CSSProperties;
  const compartir = async (slugProducto?: string) => {
    const p = c.productos.find((p) => p.slug === slugProducto);
    const url =
      location.origin +
      location.pathname +
      location.search +
      (p ? "#p/" + p.slug : "");
    const text = p
      ? `Mira este ${nombres.singular}: ${p.nombre} a ${dinero(p.precioPromo ?? p.precio)}`
      : `Mira los ${nombres.plural} de ${t.nombre}`;
    try {
      if (navigator.share) {
        await navigator.share({
          title: p ? p.nombre + " · " + t.nombre : t.nombre,
          text,
          url,
        });
      } else {
        await navigator.clipboard.writeText(text + "\n" + url);
        avisar("Enlace copiado");
      }
    } catch (e) {
      if (!(e instanceof Error && e.name === "AbortError"))
        avisar("No se pudo compartir. Copia el enlace de la barra.");
    }
  };
  const go = (slugProducto: string, desdeAtras = false) => {
    if (!desdeAtras && history.state?.catalogoVista) {
      trasCerrar.current = () => go(slugProducto, true);
      history.back();
      return;
    }
    setPerfil(false);
    setFilter("all");
    setVista(null);
    history.replaceState(
      null,
      "",
      location.pathname + location.search + "#p/" + slugProducto,
    );
    requestAnimationFrame(() =>
      document.getElementById("r-" + slugProducto)?.scrollIntoView({
        block: "start",
        behavior: matchMedia("(prefers-reduced-motion:reduce)").matches
          ? "auto"
          : "smooth",
      }),
    );
    setActual(slugProducto);
  };
  const guardar = (lineas: LineaLocal[]) => {
    setCart(lineas);
    guardarLocal("dz-carrito-" + slug, JSON.stringify(lineas));
  };
  const elegir = (
    productoSlug: string,
    varianteId: string | null,
    on?: boolean,
  ) => {
    const p = c.productos.find((p) => p.slug === productoSlug)!;
    const ya = cart.some(
      (l) => l.productoId === p.id && l.varianteId === varianteId,
    );
    const agregar = on ?? !ya;
    if (agregar && !ya) {
      guardar([...cart, lineaDe(p, varianteId)]);
      setBar(true);
      if (barTimer.current) clearTimeout(barTimer.current);
      barTimer.current = setTimeout(() => {
        void volarPedido().then(() => setBar(false));
      }, 4000);
    } else if (!agregar)
      guardar(
        cart.filter(
          (l) => l.productoId !== p.id || l.varianteId !== varianteId,
        ),
      );
    const teniaProducto = cart.some((l) => l.productoId === p.id);
    const tieneProducto =
      agregar ||
      cart.some((l) => l.productoId === p.id && l.varianteId !== varianteId);
    if (teniaProducto !== tieneProducto)
      fuente.current
        ?.registrarAaah(slug, p.slug, dispositivo(), tieneProducto)
        .then(likes=>{if(typeof likes === "number")setC(datos=>datos?.tienda.slug===slug ? {...datos,productos:datos.productos.map(x=>x.id===p.id?{...x,likes}:x)} : datos);})
        .catch(() => {
          /* El pedido local sigue disponible aunque falle el contador. */
        });
  };
  const enviar = async () => {
    if (envio.current || !cart.length || !t.whatsapp) return;
    envio.current = true;
    setEnviando(true);
    try {
      const f = fuente.current ?? (await fuentePublica(demo));
      const creada = await f.crearSolicitudPedido(
        slug,
        cart.map((l) => ({
          productoId: l.productoId,
          varianteId: l.varianteId,
          cantidad: l.cantidad,
        })),
        null,
        dispositivo(),
      );
      const confirmadas = cart.map((l) => {
        const item = creada.items.find(
          (i) => i.productoId === l.productoId && i.varianteId === l.varianteId,
        );
        return item ? { ...l, ...item } : l;
      });
      guardar(confirmadas);
      abrirWhatsApp(
        t.whatsapp,
        mensajePedido(t, creada.items, creada.total, {
          codigo: creada.codigo,
          origen: location.origin,
        }),
      );
    } catch (e) {
      if (e instanceof ProductoNoDisponible) {
        avisar(
          `Aaah… alguien se llevó ${e.producto ?? "ese producto"} antes que tú.`,
        );
        try {
          const datos = await fuente.current!.catalogoPublico(slug);
          setC(datos);
          guardar(
            cart.map((l) => {
              const p = datos.productos.find((p) => p.id === l.productoId);
              const v = p?.variantes.find((v) => v.id === l.varianteId);
              return {
                ...l,
                noDisponible:
                  !p ||
                  (v?.disponibilidad ?? p.disponibilidad) === "agotado" ||
                  (!!p.variantes.length && !v),
              };
            }),
          );
        } catch {
          avisar("Revisa la disponibilidad antes de enviar.");
        }
      } else if (e instanceof DemasiadosIntentos)
        avisar("Un momentito. Intenta enviar de nuevo más tarde.");
      else abrirWhatsApp(t.whatsapp, mensajePedido(t, cart, total));
    } finally {
      envio.current = false;
      setEnviando(false);
    }
  };
  const showPerfil = () => {
    posicion.current = window.scrollY;
    flushSync(() => setPerfil(true));
    void document.documentElement.offsetHeight;
    window.scrollTo(0, 0);
    requestAnimationFrame(() => window.scrollTo(0, 0));
  };
  const volverPerfil = () => {
    setPerfil(false);
    requestAnimationFrame(() => window.scrollTo(0, posicion.current));
  };
  const abrirTipo = (v: Vista, p: string, vid: string | null = null) => {
    setElegido({ slug: p, varianteId: vid });
    abrir(v);
  };
  const abrirPresentaciones = (productoSlug: string, modo: "a" | "b") => {
    setModoPres(modo);
    abrirTipo("presentaciones", productoSlug);
  };
  const seleccionarFiltro = (id: string, desdeAtras = false) => {
    if (!desdeAtras && history.state?.catalogoVista) {
      trasCerrar.current = () => seleccionarFiltro(id, true);
      history.back();
      return;
    }
    setFilter(id);
    setPerfil(false);
    setVista(null);
    history.replaceState(null, "", location.pathname + location.search);
    requestAnimationFrame(() => {
      const primero = (cols.find((c) => c.id === id)?.productos ??
        c.productos)[0];
      if (primero) {
        document
          .getElementById("r-" + primero.slug)
          ?.scrollIntoView({ block: "start" });
        setActual(primero.slug);
      }
    });
  };
  return (
    <div
      className={
        "catalogo-publico " + ((tema.tintes[actual]?.dark ?? tinteOscuro) ? "tint-dark " : "") +
        (perfil ? "view-grid" : "view-reels") +
        (vista === "colecciones" ? " co-open" : "") +
        (secciones?.como_funciona === false ? " sin-historia" : "")
      }
      ref={root}
      style={estilo}
    >
      <header className="hdr">
        <button
          className="hback"
          id="backBtn"
          aria-label={"Volver a los " + nombreLista}
          onClick={volverPerfil}
        >
          <Icono nombre="back" />
        </button>
        <button
          className="logo"
          id="logo"
          aria-label={t.nombre + ", ir al perfil"}
          onClick={showPerfil}
        >
          {tema.cabecera ? (
            <img
              className="wm"
              alt={t.nombre}
              src={
                "data:image/svg+xml;charset=utf-8," +
                encodeURIComponent(
                  tema.cabecera
                    .replace(
                      /var\(--logo1\)/g,
                      perfil ? tema.colores.ink : "#fff",
                    )
                    .replace(
                      /var\(--logo2\)/g,
                      perfil ? tema.colores.accent : "#fff",
                    )
                    .replace(/var\(--logod\)/g, "#E8C98F"),
                )
              }
            />
          ) : (
            <span className="nombre-cabecera">{t.nombre}</span>
          )}
        </button>
        <button
          className="help"
          id="helpBtn"
          aria-label="Cómo usar la página"
          onClick={() => abrir("coach")}
        >
          <Icono nombre="help" />
        </button>
        {secciones?.busqueda !== false && (
          <button
            className="hsearch"
            id="searchBtn"
            aria-label={"Buscar " + nombres.plural}
            onClick={() => abrir("buscar")}
          >
            <Icono nombre="search" />
          </button>
        )}
        {t.instagram && (
          <a
            className="hig"
            id="igBtn"
            aria-label={"Instagram de " + t.nombre}
            href={t.instagram}
            target="_blank"
            rel="noopener noreferrer"
            onPointerDown={(e) => {
              const el = e.currentTarget;
              el.dataset.hold = String(
                window.setTimeout(() => {
                  void navigator.clipboard
                    ?.writeText(t.instagram!)
                    .then(() => avisar("Instagram copiado"));
                  el.dataset.copiado = "1";
                }, 600),
              );
            }}
            onPointerUp={(e) =>
              clearTimeout(Number(e.currentTarget.dataset.hold))
            }
            onPointerCancel={(e) =>
              clearTimeout(Number(e.currentTarget.dataset.hold))
            }
            onClick={(e) => {
              if (e.currentTarget.dataset.copiado) {
                e.preventDefault();
                delete e.currentTarget.dataset.copiado;
              }
            }}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.9"
              aria-hidden="true"
            >
              <rect x="3.2" y="3.2" width="17.6" height="17.6" rx="5.2" />
              <circle cx="12" cy="12" r="4.1" />
              <circle
                cx="17.4"
                cy="6.6"
                r="1.1"
                fill="currentColor"
                stroke="none"
              />
            </svg>
          </a>
        )}
        <nav className="htabs" aria-label="Qué ver">
          <button
            className="htab"
            data-tab="new"
            aria-pressed={filtro === "all"}
            onClick={() => seleccionarFiltro("all")}
          >
            Novedades
          </button>
          {secciones?.colecciones !== false && (
            <button
              className="htab"
              data-tab="col"
              id="colTab"
              aria-pressed={filtro !== "all"}
              aria-haspopup="dialog"
              onClick={() =>
                vista === "colecciones" ? cerrar() : abrir("colecciones")
              }
            >
              <span>
                {filtro === "all"
                  ? "Colecciones"
                  : cols.find((c) => c.id === filtro)?.nombre}
              </span>
              <span className="hcov" aria-hidden="true">
                {cols
                  .filter((c) => c.id !== "all")
                  .slice(0, 3)
                  .map((col, n) => (
                    <span key={col.id} className={"hc " + ["hc-f", "hc-i", "hc-d"][n]}>
                      <img loading="lazy" src={portada(col.productos[0])} alt="" />
                    </span>
                  ))}
              </span>
            </button>
          )}
        </nav>
      </header>
      <main
        className="reels"
        id="reels"
        aria-label={nombreLista}
        hidden={perfil}
      >
        {lista.length > 0 && (
          <div className="glow" aria-hidden="true">
            <img loading="lazy" src={portada(lista[0])} alt="" />
          </div>
        )}
        {lista.map((p, i) => (
          <Reel
            key={p.id}
            p={p}
            t={t}
            i={i}
            n={lista.length}
            activo={actual === p.slug}
            anterior={i === index - 1}
            cantidadPedido={cart.length}
            siguiente={i === index + 1}
            seleccionado={(vid) =>
              cart.some((l) => l.productoId === p.id && l.varianteId === vid)
            }
            elegir={(vid, on) => elegir(p.slug, vid, on)}
            eleccion={elecciones[p.slug] ?? null}
            abrirPresentaciones={(modo) => abrirPresentaciones(p.slug, modo)}
            abrirFicha={() => abrirTipo("ficha", p.slug)}
            registrarBurst={(fn) => (fn ? bursts.current.set(p.slug, fn) : bursts.current.delete(p.slug))}
            perfil={showPerfil}
            opiniones={() =>
              secciones?.opiniones !== false && abrirTipo("opiniones", p.slug)
            }
            avisar={(vid) => abrirTipo("aviso", p.slug, vid)}
            compartir={() => void compartir(p.slug)}
          />
        ))}
        {!lista.length && (
          <p className="empty">Aaah… todavía no hay productos aquí.</p>
        )}
        <article
          className={
            "reel fin" +
            (actual === "fin"
              ? " on"
              : actual === "deslizapp"
                ? " prev"
                : index === lista.length - 1
                  ? " next"
                  : "")
          }
          id="r-fin"
          data-id="fin"
        >
          <div className="media">
            <div className="finbox">
              <div className="bigav">
                <span aria-hidden="true" />
              </div>
              <h2>
                ¡Ya viste{" "}
                {filtro === "all"
                  ? "todos mis " + nombreLista
                  : "esta colección"}
                !
              </h2>
              {cart.length > 0 ? (
                <>
                  <p>
                    Elegiste {cart.length}{" "}
                    {cart.length === 1 ? (variosCatalogos ? "producto" : nombres.singular) : nombreLista} ·{" "}
                    <b>{dinero(total)}</b>
                  </p>
                  <div className="finimgs">
                    {cart
                      .slice(0, 5)
                      .map(
                        (l) =>
                          l.foto && (
                            <img
                              key={l.productoId + (l.varianteId ?? "")}
                              src={l.foto}
                              alt=""
                            />
                          ),
                      )}
                  </div>
                  <button
                    className="btn primary"
                    onClick={() => void enviar()}
                    disabled={enviando}
                  >
                    Enviar mi pedido a {t.nombreVendedora ?? t.nombre}
                  </button>
                  <button className="btn soft" onClick={() => abrir("pedido")}>
                    Ver o cambiar mi pedido
                  </button>
                </>
              ) : (
                <>
                  <p>
                    Dale ♥ a los que te gustaron y me mandas tu pedido por
                    WhatsApp.
                  </p>
                  <button
                    className="btn soft"
                    onClick={() => go(lista[0]?.slug ?? "")}
                  >
                    Volver al primero
                  </button>
                </>
              )}
            </div>
          </div>
        </article>
        <div
          data-id="deslizapp"
          className="contenedor-reel-final"
          onClick={(e) => {
            if (
              secciones?.como_funciona !== false &&
              (e.target as HTMLElement).closest("[data-vv]")
            )
              abrir("historia", "#como-funciona");
          }}
        >
          <ArteFinal contacto={contacto} activo={actual === "deslizapp"} />
        </div>
      </main>
      {!perfil && <div className="navbtns">
        {[-1,1].map(d=><button key={d} aria-label={nombres.singular+(d<0?" anterior":" siguiente")} disabled={d<0?index<=0:index>=lista.length+1} onClick={()=>window.dispatchEvent(new KeyboardEvent("keydown",{key:d<0?"ArrowUp":"ArrowDown"}))}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d={d<0?"M6 15l6-6 6 6":"M6 9l6 6 6-6"}/></svg>
        </button>)}
      </div>}
      <div
        className={
          "acts" + (actual === "fin" || actual === "deslizapp" ? " off" : "")
        }
        id="bagDock"
      >
        <button
          className="act send"
          data-order
          aria-label="Ver mi pedido"
          onClick={() => abrir("pedido")}
        >
          <Icono nombre="bag" />
          <span>Pedido</span>
          <i className="cnt">{cart.length || ""}</i>
        </button>
      </div>
      <section
        className="profile"
        id="profile"
        hidden={!perfil}
        aria-label={"Perfil de " + t.nombre}
      >
        <div className="phead">
          <div className="bigav">
            <span aria-hidden="true" />
          </div>
          <div className="pstats">
            <div>
              <b id="statCount">{cv.productos.length}</b>
              {nombreLista}
            </div>
            <div>
              <b id="statSales">{t.ventas ?? "Nueva"}</b>
              <span>{t.ventas ? "ventas" : "tienda"}</span>
            </div>
            <div>
              <b>
                {Math.max(
                  1,
                  Math.floor((ahora - Date.parse(t.desde)) / 2592000000),
                )}{" "}
                meses
              </b>
              en Deslizapp
            </div>
          </div>
        </div>
        <h1 className="pname">
          {t.nombreVendedora && t.nombre.endsWith(t.nombreVendedora) ? (
            <>
              {t.nombre.slice(0, -t.nombreVendedora.length)}
              <em>{t.nombreVendedora}</em>
            </>
          ) : (
            t.nombre
          )}
        </h1>
        <p className="pbio">{t.descripcion}</p>
        <div className="pbtns">
          <a
            className="btn primary"
            id="waHello"
            href={
              t.whatsapp
                ? "https://wa.me/" +
                  t.whatsapp.replace(/\D/g, "") +
                  "?text=" +
                  encodeURIComponent(
                    `¡Hola ${t.nombreVendedora ?? t.nombre}! Vi tu catálogo de ${nombres.plural}.`,
                  )
                : undefined
            }
          >
            <Icono nombre="wa" />
            Contactar
          </a>
          <button
            className="btn soft"
            id="shareStore"
            onClick={() => void compartir()}
          >
            <Icono nombre="share" />
            Compartir
          </button>
        </div>
        {secciones?.colecciones !== false && (
          <div
            className="hls"
            id="hls"
            role="group"
            aria-label={"Filtrar " + nombreLista}
          >
            {cols.map((col) => (
              <button
                className="hl"
                key={col.id}
                aria-pressed={filtro === col.id}
                onClick={() => setFilter(col.id)}
              >
                <span className="ring">
                  <img loading="lazy" src={portada(col.productos[0])} alt="" />
                </span>
                {col.nombre}
              </button>
            ))}
          </div>
        )}
        {variosCatalogos ? (
          <div className="gridtabs gridtabs-tabs" role="tablist" aria-label="Ver por catálogo"
            onKeyDown={(e) => {
              const i = [null, ...catalogos.map((x) => x.rubro)].indexOf(activo);
              const op = [null, ...catalogos.map((x) => x.rubro)];
              const d = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
              if (!d) return;
              e.preventDefault();
              const n = (i + d + op.length) % op.length;
              cambiarCatalogo(op[n]!);
              const barra = e.currentTarget;
              requestAnimationFrame(() => barra.querySelectorAll<HTMLElement>('[role="tab"]')[n]?.focus());
            }}>
            {[{ rubro: null as Rubro | null, nombre: "Todo" }, ...catalogos.map((x) => ({ rubro: x.rubro as Rubro | null, nombre: NOMBRE_TIPO[x.rubro] }))].map((o) => (
              <button key={o.rubro ?? "todo"} type="button" role="tab" className="gt-tab"
                aria-selected={activo === o.rubro} tabIndex={activo === o.rubro ? 0 : -1}
                onClick={() => cambiarCatalogo(o.rubro)}>
                <span>{o.nombre}</span>
              </button>
            ))}
          </div>
        ) : (
          <div className="gridtabs"><svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>{nombres.plural}</div>
        )}
        <div className="grid" id="grid">
          {lista.map((p) => (
            <article
              key={p.id}
              className={
                "tile" + (p.disponibilidad === "agotado" ? " sold" : "")
              }
            >
              <div
                className="tmedia"
                role="button"
                tabIndex={0}
                aria-label={"Ver " + p.nombre}
                onClick={() => go(p.slug)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    go(p.slug);
                  }
                }}
              >
                <img src={portada(p)} alt="" loading="lazy" />
                {p.disponibilidad === "agotado" ? (
                  <SelloAgotado />
                ) : (
                  <span className="tprice">
                    {tienePresentaciones(p) && desde(p)?.varia
                      ? "Desde " + dinero(desde(p)!.precio)
                      : dinero(p.precioPromo ?? p.precio)}
                  </span>
                )}
              </div>
              {p.disponibilidad !== "agotado" && (
                <button
                  className="tlike"
                  aria-label={"Lo quiero: " + p.nombre}
                  aria-pressed={cart.some((l) => l.productoId === p.id)}
                  onClick={() =>
                    tienePresentaciones(p)
                      ? abrirPresentaciones(p.slug, "a")
                      : elegir(p.slug, p.variantes[0]?.id ?? null)
                  }
                >
                  <Icono nombre="heart" />
                </button>
              )}
              <div className="tname">{p.nombre}</div>
              <div className="tsub">
                {mostrarDetalle(p.detalles.familia ?? p.categoria)}
              </div>
            </article>
          ))}
        </div>
        <footer className="made" id="gridMade">
          <span className="sig">
            Hecho con <MarcaDeslizapp />
          </span>
          <div className="mrow">
            <button
              className="mhow"
              onClick={() => abrir("historia", "#como-funciona")}
            >
              ¿Cómo funciona?
            </button>
            <a className="mwa" href={contacto}>
              <Icono nombre="wa" />
              Quiero uno para mi tienda
            </a>
          </div>
        </footer>
      </section>
      {bar && cart.length > 0 && (
        <div className="cartbar in" id="cartbar">
          {secciones?.chat !== false && (
            <div className="chat">
              <span className="av" aria-hidden="true" />
              <div className="bubble">
                <span className="who2">{t.nombreVendedora ?? t.nombre}</span>
                <p>
                  {(Array.isArray(mensajes?.al_agregar)
                    ? mensajes.al_agregar[
                        Math.min(
                          cart.length - 1,
                          mensajes.al_agregar.length - 1,
                        )
                      ]
                    : null) ??
                    (cart.length === 1
                      ? "¡Ay, qué buena elección! ¿Le agregas otro? Uno pa’ ti y otro pa’ regalar 😉"
                      : cart.length === 2
                        ? "Tu pedido se ve precioso 💕 Dale una vueltita más, que todavía hay perfumes lindos esperándote."
                        : "¡Mi amor, tienes un gustazo! 😍 Si viste otro que te gustó, agrégalo y me lo mandas todo en un solo mensaje.")}
                </p>
                <button
                  className="bclose"
                  aria-label="Cerrar mensaje"
                  onClick={() => setBar(false)}
                >
                  ×
                </button>
              </div>
            </div>
          )}
          <div className="inner">
            <button className="sum" onClick={() => abrir("pedido")}>
              <b>
                {cart.length}{" "}
                {cart.length === 1 ? (variosCatalogos ? "producto" : nombres.singular) : nombreLista} ·{" "}
                {dinero(total)}
              </b>
              <small>Ver o cambiar mi pedido</small>
            </button>
            <button
              className="btn primary"
              id="barSend"
              disabled={enviando}
              onClick={() => void enviar()}
            >
              <Icono nombre="wa" />
              Enviar
            </button>
          </div>
        </div>
      )}
      {vista === "colecciones" && (
        <DialogoCatalogo
          id="coBg"
          nombre="Colecciones"
          clase="coov"
          cerrar={cerrar}
        >
          <button
            className="coX"
            aria-label="Cerrar colecciones"
            onClick={cerrar}
          >
            ×
          </button>
          {variosCatalogos && (
            <MenuCatalogo catalogos={catalogos.map((x) => x.rubro)} activo={activo} alElegir={cambiarCatalogo} />
          )}
          <ul className="colist" id="coGrid">
            {cols
              .filter((c) => c.id !== "all")
              .map((col) => (
                <li key={col.id}>
                  <button
                    className="coitem"
                    aria-pressed={filtro === col.id}
                    onClick={() => seleccionarFiltro(col.id)}
                  >
                    <span className="cc">
                      <img loading="lazy" src={portada(col.productos[0])} alt="" />
                      <span className="ck" aria-hidden="true">
                        ✓
                      </span>
                    </span>
                    <b>{col.nombre}</b>
                    <small>
                      {col.productos.length}{" "}
                      {col.productos.length === 1
                        ? (variosCatalogos ? "producto" : nombres.singular)
                        : nombreLista}
                    </small>
                  </button>
                </li>
              ))}
          </ul>
        </DialogoCatalogo>
      )}
      {vista === "buscar" && (
        <DialogoCatalogo
          id="srBg"
          nombre={"Buscar " + nombres.plural}
          clase="srov"
          cerrar={cerrar}
        >
          <div className="srtop">
            <label className="srbox">
              <Icono nombre="search" />
              <span className="sr">Buscar</span>
              <input
                type="search"
                id="srIn"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                autoComplete="off"
                enterKeyHint="search"
                placeholder={
                  t.rubro === "perfumes"
                    ? "Nombre, olor, ocasión o precio"
                    : "Nombre, marca o detalle"
                }
              />
              {query && (
                <button
                  className="srclr"
                  aria-label="Borrar búsqueda"
                  onClick={() => {
                    setQuery("");
                    document.getElementById("srIn")?.focus();
                  }}
                >
                  ×
                </button>
              )}
            </label>
            <button className="srcancel" onClick={cerrar}>
              Cancelar
            </button>
          </div>
          {tiposBusqueda.length > 1 && (
            <div className="srtipos" role="group" aria-label="Tipo de producto">
              <button type="button" aria-pressed={!tipoActivo} onClick={() => setTipoBusqueda(null)}>Todo</button>
              {tiposBusqueda.map((r) => (
                <button key={r} type="button" aria-pressed={tipoActivo === r} onClick={() => setTipoBusqueda(tipoActivo === r ? null : r)}>{NOMBRE_TIPO[r]}</button>
              ))}
            </div>
          )}
          <div className="srbody" id="srOut" aria-live="polite">
            {!query && (
              <>
                <p className="srsec">Ideas para buscar</p>
                <div className="srchips">
                  {(t.rubro === "perfumes"
                    ? CHIPS_PERFUME
                    : cols.map((c) => c.nombre)
                  ).map((chip) => (
                    <button key={chip} onClick={() => setQuery(chip)}>
                      {chip}
                    </button>
                  ))}
                </div>
                <p className="srsec">Todo el catálogo</p>
              </>
            )}
            {query && (
              <p className="srhead">
                <b>{busqueda.cercanos ? 0 : resultados.length}</b> resultados para «
                {query}»
              </p>
            )}
            {query && busqueda.etiqueta && (
              <p className="srprecio">
                <span>{busqueda.etiqueta}</span>
                <button type="button" aria-label={"Quitar «" + busqueda.etiqueta + "»"} onClick={() => setQuery(busqueda.sinPrecio)}>
                  <span aria-hidden="true">✕</span>
                </button>
              </p>
            )}
            {query && busqueda.cercanos && busqueda.precio && (
              <p className="srcerca">{avisoSinPrecio(busqueda.precio)}</p>
            )}
            <div className="srlist">
              {resultados.map((p) => (
                <button
                  className="sritem"
                  data-go={p.slug}
                  key={p.id}
                  onClick={() => go(p.slug)}
                >
                  <img src={portada(p)} alt="" />
                  <span>
                    <b>{p.nombre}</b>
                    <small>
                      {mostrarDetalle(p.detalles.marca)} ·{" "}
                      {mostrarDetalle(p.detalles.familia ?? p.categoria)}
                    </small>
                  </span>
                  <span className="sp">
                    {p.disponibilidad === "agotado"
                      ? "Agotado"
                      : tienePresentaciones(p) && desde(p)?.varia
                        ? "Desde " + dinero(desde(p)!.precio)
                        : dinero(p.precioPromo ?? p.precio)}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </DialogoCatalogo>
      )}
      {vista === "pedido" && (
        <HojaPedido
          t={t}
          lineas={cart}
          cerrar={cerrar}
          quitar={(l) => elegir(l.slug, l.varianteId ?? null, false)}
          ver={go}
          enviar={() => void enviar()}
          enviando={enviando}
        />
      )}
      {vista === "presentaciones" && producto && tienePresentaciones(producto) && (
        <HojaPresentaciones
          p={producto}
          modo={modoPres}
          eleccion={elecciones[producto.slug] ?? null}
          enPedido={(vid) => cart.some((l) => l.productoId === producto.id && l.varianteId === vid)}
          alElegir={(e) => setElecciones((x) => ({ ...x, [producto.slug]: e }))}
          alAgregar={(e) => {
            const v = varianteDe(producto, e);
            if (!v) return;
            setElecciones((x) => ({ ...x, [producto.slug]: e }));
            elegir(producto.slug, v.id, true);
            cerrar();
            // El «aaah» de siempre, en el reel de este producto.
            setTimeout(() => bursts.current.get(producto.slug)?.(), 60);
          }}
          alQuitar={(vid) => {
            elegir(producto.slug, vid, false);
            cerrar();
          }}
          alAvisar={(vid) => abrirTipo("aviso", producto.slug, vid)}
          cerrar={cerrar}
        />
      )}
      {vista === "ficha" && producto?.fichaUrl && <VisorFicha p={producto} cerrar={cerrar} />}
      {vista === "opiniones" && producto && (
        <HojaOpiniones t={t} p={producto} cerrar={cerrar} />
      )}
      {vista === "aviso" && producto && (
        <HojaAviso
          p={producto}
          varianteId={elegido?.varianteId ?? null}
          cerrar={cerrar}
          guardar={async (tel) => {
            const telefono = normalizarTelefonoDO(tel);
            if (!telefono)
              throw new Error("Escribe un WhatsApp dominicano de 10 dígitos.");
            await fuente.current!.pedirAviso(
              slug,
              producto.slug,
              elegido?.varianteId ?? null,
              telefono.replace(/\D/g, ""),
              null,
              dispositivo(),
            );
            avisar("Listo. Te aviso cuando llegue.");
            cerrar();
          }}
        />
      )}
      {vista === "coach" && (
        <Coach
          cerrar={cerrar}
          siguienteProducto={(t.rubro === "ropa" ? "la siguiente " : "el siguiente ")+nombres.singular}
          productos={(t.slug === "esencias-michel" ? ["mayar","majestic","wildflower"].map(slug=>c.productos.find(p=>p.slug===slug)).filter((p): p is CatalogoPublico["productos"][number]=>!!p) : c.productos.slice(0,3)).map((p) => ({ foto: portada(p), nombre: p.nombre }))}
        />
      )}
      {vista === "historia" && secciones?.como_funciona !== false && (
        <Historias
          cerrar={cerrar}
          planes={() => abrir("planes", "#planes")}
          contacto={contacto}
        />
      )}
      {vista === "planes" && (
        <Planes
          cerrar={cerrar}
          tienda={t.nombre}
          inicial={
            typeof window !== "undefined"
              ? (new URLSearchParams(location.hash.split("?")[1] ?? "").get(
                  "plan",
                ) ?? "pro")
              : "pro"
          }
        />
      )}
      {toast && (
        <div className="dztoast on" id="dzToast" role="status">
          {toast}
        </div>
      )}
    </div>
  );
}
