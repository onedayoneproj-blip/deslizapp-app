"use client";

import { useMemo, useState, type RefObject } from "react";
import { buscarProductos, cantidadMaxima, claveLinea, deClaveLinea, esEncargo, precioDeLinea, sePuedeAgregar, textoEncargo, variantesActivas } from "@/lib/buscar-productos";
import { textoVariante } from "@/lib/data/productos";
import { formatearPesos } from "@/lib/formato";
import { resaltar } from "@/lib/texto";
import type { Producto, Promo, Variante } from "@/lib/types";
import { TextoResaltado } from "../clientes/texto-resaltado";
import { Foto } from "../foto";
import { FilaLista, ListaSeleccion, PildoraSeleccion, SelectorBusqueda } from "../selector-busqueda";
import { Boton, BotonCantidad, Cantidad, Etiqueta, FilaPastillas, GrupoOpciones } from "../ui";

const TODAS = "__todas";

/**
 * Selector de productos de "+ Pedido", dentro de la misma hoja: buscador (nombre o colección), pastillas de
 * colección, y en cada fila − cantidad + para agregar sin salir de la lista. Abajo, flotando: el resumen y "Listo".
 * Sin texto: los más vendidos primero. Agotados y ocultos, atenuados y sin poder agregarse (ocultos al final).
 * Un producto con opciones se abre en su fila: se elige cada eje (las agotadas, apagadas) y la cantidad de esa variante.
 * Con "Por encargo" encendido, lo agotado no se apaga: dice "Por encargo" y entra al pedido así (no toca el stock).
 */
export function SelectorProducto({
  productos,
  promos,
  vendidas,
  cantidades,
  encargos,
  alCambiar,
  entrada,
  alTerminar,
}: {
  productos: Producto[];
  promos: Promo[];
  vendidas: Map<string, number>;
  /** Por llave de línea (`claveLinea`): el producto, o el producto y su variante. */
  cantidades: Record<string, number>;
  /** Las líneas que llegaron por encargo desde el catálogo (al editar): no miran el stock. */
  encargos: Set<string>;
  /** Cambia la cantidad de un producto (o de una variante) en `delta` (el formulario respeta el stock). */
  alCambiar: (producto: Producto, variante: Variante | null, delta: number) => void;
  entrada: RefObject<HTMLInputElement | null>;
  alTerminar: () => void;
}) {
  const [consulta, setConsulta] = useState("");
  const [coleccion, setColeccion] = useState<string>(TODAS);
  const q = consulta.trim();

  const colecciones = useMemo(
    () => [...new Set(productos.map((p) => p.categoria).filter((c): c is string => Boolean(c)))].sort((a, b) => a.localeCompare(b, "es")),
    [productos],
  );
  const resultados = useMemo(
    () => buscarProductos(productos, q, coleccion === TODAS ? null : coleccion, vendidas),
    [productos, q, coleccion, vendidas],
  );

  let unidades = 0;
  let total = 0;
  for (const [clave, n] of Object.entries(cantidades)) {
    const l = n > 0 ? deClaveLinea(productos, clave) : null;
    if (!l) continue;
    unidades += n;
    total += n * precioDeLinea(l.producto, l.variante, promos).precio;
  }

  const fijo =
    colecciones.length > 0 ? (
      <FilaPastillas
        etiqueta="Colección"
        valor={coleccion}
        alCambiar={setColeccion}
        opciones={[{ id: TODAS, texto: "Todas" }, ...colecciones.map((c) => ({ id: c, texto: c }))]}
      />
    ) : undefined;
  // Solo con algo elegido: la píldora flotante con el resumen y "Listo"
  const pildora =
    unidades > 0 ? (
      <PildoraSeleccion detalle={`${unidades} ${unidades === 1 ? "producto" : "productos"}`} total={formatearPesos(total)} alListo={alTerminar} />
    ) : undefined;

  return (
    <SelectorBusqueda
      entrada={entrada}
      consulta={consulta}
      alCambiarConsulta={setConsulta}
      placeholder="Busca un producto"
      etiqueta="Buscar producto"
      alVolver={alTerminar}
      fijo={fijo}
      abajo={pildora}
    >
      {resultados.length === 0 ? (
        <p className="rounded-radio-m bg-superficie-hundida p-4 text-center font-bold text-texto-secundario">
          {productos.length === 0 ? "Aún no tienes productos. Publica uno en el Catálogo." : "Ni un suspiro con ese nombre. Prueba con otra palabra u otra colección."}
        </p>
      ) : (
        <ListaSeleccion>
          {resultados.map((p) => (
            <FilaLista key={p.id}>
              {variantesActivas(p).length > 0 ? (
                <FilaConVariantes producto={p} promos={promos} cantidades={cantidades} encargos={encargos} consulta={q} alCambiar={alCambiar} />
              ) : (
                <FilaProducto producto={p} promos={promos} cantidad={cantidades[p.id] ?? 0} encargo={encargos.has(p.id)} consulta={q} alCambiar={alCambiar} />
              )}
            </FilaLista>
          ))}
        </ListaSeleccion>
      )}
    </SelectorBusqueda>
  );
}

/** Foto, nombre resaltado y la línea de precio y stock de un producto en el selector. */
function Cabeza({ producto: p, consulta, precio, precioAntes, detalle }: { producto: Producto; consulta: string; precio: string; precioAntes?: string | null; detalle: string }) {
  return (
    <>
      <span className={`size-11 shrink-0 overflow-hidden rounded-radio-s bg-superficie-hundida ${p.stock === 0 && !p.porEncargo ? "grayscale" : ""}`}>
        {p.fotos[0] ? <Foto src={p.fotos[0]} alt="" className="h-full w-full" sizes="44px" /> : null}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-cuerpo leading-tight font-extrabold text-texto">
          <TextoResaltado trozos={resaltar(p.nombre, consulta)} />
        </p>
        <p className="mt-0.5 truncate text-etiqueta font-normal text-texto-secundario">
          <span className="font-bold text-texto">{precio}</span>
          {precioAntes && <s className="ml-1">{precioAntes}</s>}
          {" · "}
          {detalle}
        </p>
      </div>
    </>
  );
}

const textoStock = (stock: number | null) => (stock === null ? "Sin cantidad guardada" : stock === 0 ? "Sin stock" : `${stock} en stock`);

function FilaProducto({
  producto: p,
  promos,
  cantidad,
  encargo,
  consulta,
  alCambiar,
}: {
  producto: Producto;
  promos: Promo[];
  cantidad: number;
  encargo: boolean;
  consulta: string;
  alCambiar: (producto: Producto, variante: Variante | null, delta: number) => void;
}) {
  const precio = precioDeLinea(p, null, promos);
  const porEncargo = encargo || esEncargo(p);
  const bloqueado = !sePuedeAgregar(p) && !(encargo && cantidad > 0);
  const etiqueta = !p.activo ? "Oculto" : bloqueado ? "Agotado" : null;
  const tope = cantidadMaxima(p, null, porEncargo);
  const enTope = cantidad >= tope;
  return (
    <div className={`flex items-center gap-3 py-2.5 ${bloqueado ? "opacity-55" : ""}`}>
      <Cabeza
        producto={p}
        consulta={consulta}
        precio={formatearPesos(precio.precio)}
        precioAntes={precio.precioAntes ? formatearPesos(precio.precioAntes) : null}
        detalle={porEncargo ? textoEncargo(p) : textoStock(p.stock)}
      />
      {etiqueta ? (
        <Etiqueta tono="fuerte">{etiqueta}</Etiqueta>
      ) : cantidad > 0 ? (
        <Cantidad valor={cantidad} max={enTope ? cantidad : undefined} alCambiar={(v) => alCambiar(p, null, v - cantidad)} etiquetaQuitar={`Quitar uno de ${p.nombre}`} etiquetaAgregar={`Agregar ${p.nombre}`} />
      ) : (
        <BotonCantidad tipo="mas" etiqueta={`Agregar ${p.nombre}`} onClick={() => alCambiar(p, null, 1)} deshabilitado={enTope} />
      )}
    </div>
  );
}

const coincide = (v: Variante, valores: Record<string, string>) => Object.entries(valores).every(([eje, valor]) => v.valores[eje] === valor);

/** ¿Hay alguna variante que se pueda pedir con estos valores (los ejes que faltan, cualquiera)? Por encargo también cuenta. */
const hayCon = (p: Producto, activas: Variante[], valores: Record<string, string>) =>
  activas.some((v) => coincide(v, valores) && cantidadMaxima(p, v) > 0);

/** ¿Y con stock de verdad (no por encargo)? */
const hayConStock = (p: Producto, activas: Variante[], valores: Record<string, string>) =>
  activas.some((v) => coincide(v, valores) && cantidadMaxima(p, v, false) > 0);

/**
 * Un producto con opciones: al tocar "+" se abre debajo la elección de cada eje (`GrupoOpciones`, docs/09 §6). Un valor sin
 * ninguna variante que se pueda pedir (con lo ya elegido en los otros ejes) queda apagado con "Agotado"; si el producto va por
 * encargo, sigue elegible y dice "Por encargo". Con todo elegido, la
 * cantidad de esa variante, a su precio. Lo que ya está en el pedido se lista debajo, cada variante con su cantidad.
 */
function FilaConVariantes({
  producto: p,
  promos,
  cantidades,
  encargos,
  consulta,
  alCambiar,
}: {
  producto: Producto;
  promos: Promo[];
  cantidades: Record<string, number>;
  encargos: Set<string>;
  consulta: string;
  alCambiar: (producto: Producto, variante: Variante | null, delta: number) => void;
}) {
  const activas = variantesActivas(p);
  const ejes = p.opciones.filter((o) => activas.some((v) => o.nombre in v.valores));
  const [abierta, setAbierta] = useState(false);
  const [elegidos, setElegidos] = useState<Record<string, string>>({});
  const bloqueado = !sePuedeAgregar(p);
  const precios = activas.map((v) => precioDeLinea(p, v, promos).precio);
  const desde = Math.min(...precios);
  const distintos = new Set(precios).size > 1;
  const enPedido = activas.filter((v) => (cantidades[claveLinea(p.id, v.id)] ?? 0) > 0);
  const unidades = enPedido.reduce((s, v) => s + (cantidades[claveLinea(p.id, v.id)] ?? 0), 0);
  const elegida = ejes.every((e) => elegidos[e.nombre]) ? activas.find((v) => ejes.every((e) => v.valores[e.nombre] === elegidos[e.nombre])) ?? null : null;
  const stockTotal = activas.every((v) => v.stock === null) ? null : activas.reduce((s, v) => s + (v.stock ?? 0), 0);

  const elegir = (eje: string, valor: string) => {
    const nuevos = { ...elegidos, [eje]: valor };
    // Si lo elegido en otro eje ya no combina, se suelta.
    for (const otro of ejes) {
      if (otro.nombre === eje || !nuevos[otro.nombre]) continue;
      if (!hayCon(p, activas, { [eje]: valor, [otro.nombre]: nuevos[otro.nombre]! })) delete nuevos[otro.nombre];
    }
    setElegidos(nuevos);
  };

  return (
    <div className={`py-2.5 ${bloqueado ? "opacity-55" : ""}`}>
      <div className="flex items-center gap-3">
        <Cabeza
          producto={p}
          consulta={consulta}
          precio={`${distintos ? "Desde " : ""}${formatearPesos(desde)}`}
          detalle={bloqueado ? "Sin stock" : stockTotal === 0 && p.porEncargo ? textoEncargo(p) : textoStock(stockTotal)}
        />
        {!p.activo ? (
          <Etiqueta tono="fuerte">Oculto</Etiqueta>
        ) : bloqueado ? (
          <Etiqueta tono="fuerte">Agotado</Etiqueta>
        ) : abierta ? (
          <Boton jerarquia="terciario" tamano="compacto" aria-expanded onClick={() => setAbierta(false)}>
            Listo
          </Boton>
        ) : (
          <span className="flex shrink-0 items-center gap-2">
            {unidades > 0 && <Etiqueta tono="exito">{unidades}</Etiqueta>}
            <BotonCantidad tipo="mas" etiqueta={`Elegir ${ejes.map((e) => e.nombre.toLocaleLowerCase("es")).join(" y ")} de ${p.nombre}`} onClick={() => setAbierta(true)} />
          </span>
        )}
      </div>

      {abierta && (
        <div className="mt-3 flex flex-col gap-3 rounded-radio-m bg-superficie-hundida p-3">
          {ejes.map((eje) => (
            <GrupoOpciones
              key={eje.nombre}
              titulo={eje.nombre}
              compacta
              valor={elegidos[eje.nombre] ?? null}
              alCambiar={(v) => elegir(eje.nombre, v)}
              opciones={eje.valores
                .filter((valor) => activas.some((v) => v.valores[eje.nombre] === valor))
                .map((valor) => {
                  const otros = Object.fromEntries(Object.entries(elegidos).filter(([k]) => k !== eje.nombre));
                  const puede = hayCon(p, activas, { ...otros, [eje.nombre]: valor });
                  const conStock = puede && hayConStock(p, activas, { ...otros, [eje.nombre]: valor });
                  return {
                    id: valor,
                    deshabilitada: !puede,
                    texto: conStock ? valor : (
                      <>
                        {valor}
                        <span className={`text-etiqueta font-bold ${puede ? "text-atencion-texto" : "text-texto-secundario"}`}>{puede ? "Por encargo" : "Agotado"}</span>
                      </>
                    ),
                  };
                })}
            />
          ))}
          {elegida ? (
            <LineaVariante producto={p} variante={elegida} promos={promos} cantidad={cantidades[claveLinea(p.id, elegida.id)] ?? 0} encargo={encargos.has(claveLinea(p.id, elegida.id))} alCambiar={alCambiar} />
          ) : (
            <p className="text-secundario text-texto-secundario">Elige {ejes.filter((e) => !elegidos[e.nombre]).map((e) => e.nombre.toLocaleLowerCase("es")).join(" y ")}.</p>
          )}
        </div>
      )}

      {enPedido.filter((v) => !abierta || v.id !== elegida?.id).length > 0 && (
        <ul className="mt-2 flex flex-col gap-1 pl-14">
          {enPedido
            .filter((v) => !abierta || v.id !== elegida?.id)
            .map((v) => (
              <li key={v.id}>
                <LineaVariante producto={p} variante={v} promos={promos} cantidad={cantidades[claveLinea(p.id, v.id)] ?? 0} encargo={encargos.has(claveLinea(p.id, v.id))} alCambiar={alCambiar} />
              </li>
            ))}
        </ul>
      )}
    </div>
  );
}

/** Una variante con su precio, su stock (o "Por encargo", con el tiempo de llegada si lo hay) y la cantidad en el pedido. */
function LineaVariante({
  producto: p,
  variante: v,
  promos,
  cantidad,
  encargo,
  alCambiar,
}: {
  producto: Producto;
  variante: Variante;
  promos: Promo[];
  cantidad: number;
  encargo: boolean;
  alCambiar: (producto: Producto, variante: Variante | null, delta: number) => void;
}) {
  const texto = textoVariante(p.opciones, v.valores);
  const precio = precioDeLinea(p, v, promos);
  const porEncargo = encargo || esEncargo(p, v);
  const tope = cantidadMaxima(p, v, porEncargo);
  const nombre = `${p.nombre} ${texto}`;
  return (
    <div className="flex items-center gap-3">
      <div className="min-w-0 flex-1">
        <p className="truncate text-destacado text-texto">{texto}</p>
        <p className="flex items-center gap-1.5 text-etiqueta text-texto-secundario">
          <span className="font-bold text-texto">{formatearPesos(precio.precio)}</span>
          {!porEncargo && v.stock !== null && <span>· {v.stock === 1 ? "Queda 1" : `Quedan ${v.stock}`}</span>}
        </p>
        {porEncargo && <p className="truncate text-etiqueta font-bold text-atencion-texto">{textoEncargo(p)}</p>}
      </div>
      {cantidad > 0 ? (
        <Cantidad valor={cantidad} max={cantidad >= tope ? cantidad : undefined} alCambiar={(n) => alCambiar(p, v, n - cantidad)} etiquetaQuitar={`Quitar uno de ${nombre}`} etiquetaAgregar={`Agregar ${nombre}`} />
      ) : (
        <BotonCantidad tipo="mas" etiqueta={`Agregar ${nombre}`} onClick={() => alCambiar(p, v, 1)} deshabilitado={tope === 0} />
      )}
    </div>
  );
}
