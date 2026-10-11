"use client";

import { useState } from "react";
import type { TrabajoRetoque } from "@/lib/admin/tipos";
import { bienvenidaVista, marcarBienvenidaVista } from "@/lib/bienvenida-retoque";
import { useTiendaActiva } from "@/lib/data/consulta";
import { mensajeDeError } from "@/lib/data/errores";
import { useData } from "@/lib/data/provider";
import { fichaCambiada, type BorradorFicha } from "@/lib/ficha-tecnica";
import { DURACION } from "@/lib/movimiento";
import { claveVariante, ejeDeFoto, type EstadoPresentaciones } from "@/lib/presentaciones";
import { mandarMarcadas, urlsGuardadasMarcadas } from "@/lib/retoque-al-subir";
import { avisoGuardadoConRetoques, AVISO_SIN_MARCA_AL_GUARDAR } from "@/lib/retoque-textos";
import type { Detalles, Rubro } from "@/lib/rubros";
import type { Producto, Variante } from "@/lib/types";
import { useToast } from "../toast";
import { BienvenidaRetoque, type DatosBienvenida } from "./bienvenida-retoque";
import { conEntregadas, mediosParaGuardar, type MedioBorrador } from "./ficha-medios";
import type { Taller } from "./taller";

/** Lo que hace falta para crear un producto (lo arman la hoja de producto y la historia de crear producto). */
export type BorradorNuevoProducto = {
  nombre: string;
  /** Dígitos del precio, como los entrega el campo. */
  precio: string;
  medios: MedioBorrador[];
  stock: number;
  presentaciones: EstadoPresentaciones;
  detalles: Detalles;
  ficha: BorradorFicha;
  coleccion: string | null;
  porEncargo: boolean;
  encargoTexto: string;
  /** El tipo de producto: solo con más de un rubro (con uno no se manda nada, como siempre). */
  rubro: Rubro | null;
  /** Visible en el catálogo (con el plan lleno, quien llama ya lo apaga). */
  activo: boolean;
};

export const MENSAJE_PUBLICADO = "Publicado. Ya se está deslizando.";
export const MENSAJE_OCULTO = "Guardado como oculto. Nadie lo ve hasta que lo prendas.";

/** Las variantes que se guardan: las que ya existían conservan su stock aquí (su cambio va después como ajuste con motivo). */
export function variantesParaGuardar(estado: EstadoPresentaciones, base: Map<string, Variante>) {
  return estado.pres.map((p) => {
    const b = base.get(claveVariante(p.valores));
    // Una oculta no admite ajuste aparte (la base solo ajusta activas): su stock va directo en el guardado.
    return { valores: p.valores, stock: b && p.activa ? b.stock : (p.stock ?? 0), precio: p.precio, activa: p.activa };
  });
}

/**
 * El guardado de un producto, compartido por la hoja de producto (crear y editar) y la historia de crear producto: las reglas de
 * siempre antes de guardar, la bienvenida del retoque, crear en una sola llamada, la foto de cada color, la ficha técnica y las
 * fotos marcadas para el taller. Nada de esto se duplica entre las dos pantallas.
 */
export function useGuardarProducto(producto: Producto | null, taller: Taller) {
  const { crearProducto, guardarFotoValor, guardarFicha, trabajosRetoque, getProducto } = useData();
  const { tiendaId } = useTiendaActiva();
  const toast = useToast();
  // La bienvenida del retoque, antes de guardar un producto con fotos marcadas por primera vez en esta tienda.
  const [bienvenida, setBienvenida] = useState<{ datos: DatosBienvenida; resolver: (ok: boolean) => void } | null>(null);

  /** Las reglas de siempre: nombre y precio, sin videos a medio preparar y con foto (salvo que quien llama permita seguir sin ella). */
  const validar = (d: { nombre: string; precio: string; medios: MedioBorrador[]; sinFoto?: boolean }): boolean => {
    if (!d.nombre.trim() || !Number(d.precio)) {
      toast("Ponle nombre y precio. Lo demás lo hacemos nosotros.");
      return false;
    }
    if (d.medios.some((m) => m.tipo === "video" && typeof m.progreso === "number")) {
      toast("Espera a que el video termine de prepararse.");
      return false;
    }
    if (!d.sinFoto && mediosParaGuardar(d.medios).every((m) => m.tipo !== "foto")) {
      toast("Falta la foto. El producto es la estrella.");
      return false;
    }
    return true;
  };

  /** Fotos nuevas marcadas «Retocar esta foto»: la primera vez, la bienvenida va ANTES de guardar. false = canceló. */
  const pasarBienvenida = async (medios: MedioBorrador[]): Promise<boolean> => {
    const marcadas = medios.filter((m) => m.tipo === "foto" && m.retocar && !taller.guardada(m.url));
    if (marcadas.length === 0 || taller.marcaLista !== true || bienvenidaVista(tiendaId)) return true;
    const primera = marcadas[0]!;
    const sigue = await new Promise<boolean>((resolver) =>
      setBienvenida({ datos: { n: Date.now(), foto: primera.tipo === "foto" ? primera.url : null, referencias: (taller.marca?.referencias ?? []).slice(0, 3).map((r) => r.url) }, resolver }),
    );
    // Cancelar vuelve al formulario: no se guarda nada y las fotos siguen marcadas por si quiere apagarlas.
    if (!sigue) return false;
    // La bienvenida es una hoja apilada: se espera a que termine de salir (y de devolver su entrada del historial) antes de
    // guardar, porque al guardar se cierra la hoja de abajo y las dos salidas a la vez dejarían la dirección en la pantalla de antes.
    await new Promise((r) => setTimeout(r, DURACION.entrada + 150));
    return true;
  };

  /** Si el taller entregó una foto mientras la ficha estaba abierta, se guarda la retocada (nunca se vuelve a la original). */
  const entregadasAlGuardar = async (): Promise<TrabajoRetoque[]> => {
    if (!producto) return taller.entregadas;
    try {
      return (await trabajosRetoque(tiendaId)).filter((t) => t.productoId === producto.id && t.estado === "entregado" && t.medioUrlRetocado);
    } catch {
      // Sin conexión para mirar el taller: se usa lo último leído.
      return taller.entregadas;
    }
  };

  /** Fotos nuevas marcadas «Retocar esta foto», en el orden de las fotos que se guardan. */
  const marcadasPorFoto = (medios: MedioBorrador[], entregadas: TrabajoRetoque[]) =>
    conEntregadas(medios, entregadas).flatMap((m) => (m.tipo === "foto" ? [!!m.retocar && !taller.guardada(m.url)] : []));

  /** Ya guardado el producto, manda al taller cada foto marcada con su URL guardada. Nunca deshace el guardado. */
  const mandarAlTaller = async (medios: MedioBorrador[], entregadas: TrabajoRetoque[], guardado: Producto | null, base: string) => {
    const porFoto = marcadasPorFoto(medios, entregadas);
    const total = porFoto.filter(Boolean).length;
    if (total === 0) return base;
    // Sin Mi marca lista no se manda nada al taller: el producto ya quedó guardado.
    if (taller.marcaLista !== true) return AVISO_SIN_MARCA_AL_GUARDAR;
    const urls = urlsGuardadasMarcadas(porFoto, (guardado?.medios ?? []).flatMap((m) => (m.tipo === "foto" ? [m.url] : [])));
    const r = await mandarMarcadas(urls, total, (url) => taller.pedirDe(guardado!.id, url, { silencioso: true }));
    return avisoGuardadoConRetoques(base, r.marcadas, r.enviadas);
  };
  const hayMarcadas = (medios: MedioBorrador[], entregadas: TrabajoRetoque[]) => marcadasPorFoto(medios, entregadas).some(Boolean);

  /** La foto de cada color se guarda al final, con las fotos ya guardadas: el borrador la lleva por id y aquí se busca su url. */
  const guardarFotosDeColor = async (medios: MedioBorrador[], entregadas: TrabajoRetoque[], estado: EstadoPresentaciones, guardado: Producto) => {
    const conOpciones = estado.opciones.length > 0 && estado.pres.length > 0;
    const eje = ejeDeFoto(conOpciones ? estado.opciones : []);
    if (!eje) return;
    const vivo = (await getProducto(tiendaId, guardado.id).catch(() => null)) ?? guardado;
    // Los medios guardados van en el mismo orden que los del borrador.
    const idsEnOrden = conEntregadas(medios, entregadas).filter((m) => m.tipo === "foto" || m.url).map((m) => m.id);
    const urlDeId = (id: string) => {
      const i = idsEnOrden.indexOf(id);
      const m = i >= 0 ? vivo.medios[i] : undefined;
      return m && m.tipo === "foto" ? m.url : null;
    };
    const guardadas = vivo.fotosPorValor?.[eje.nombre] ?? {};
    for (const valor of eje.valores) {
      const quiere = estado.fotosColor[valor] ? urlDeId(estado.fotosColor[valor]) : null;
      const hay = guardadas[valor] ?? null;
      if (quiere === hay) continue;
      await guardarFotoValor(tiendaId, guardado.id, eje.nombre, valor, quiere);
    }
  };

  /** La ficha técnica se sube al final, con el producto ya guardado (es su propia llamada; si falla, el producto ya quedó). */
  const guardarLaFicha = async (ficha: BorradorFicha, guardado: Producto): Promise<string | null> => {
    if (!fichaCambiada(ficha)) return null;
    try {
      await guardarFicha(tiendaId, guardado.id, ficha.tipo === "nueva" ? ficha.foto : null);
    } catch (e) {
      // El producto ya quedó guardado: no se repite (crearía otro). Se avisa y la ficha se vuelve a subir desde el producto.
      return `El producto quedó guardado, pero la ficha no. ${mensajeDeError(e, "Ábrelo y súbela otra vez.")}`;
    }
    return null;
  };

  /**
   * Crea el producto en una sola llamada (la ficha y las variantes: si algo falla, no queda nada a medias) y después la foto de
   * cada color, la ficha técnica y el taller. Devuelve el producto y el aviso de cómo quedó; null si no se guardó (ya avisó).
   * `comun` dice si el aviso es el de siempre (publicado u oculto) o trae algo más (taller, ficha).
   */
  const crear = async (b: BorradorNuevoProducto, opciones: { sinFoto?: boolean } = {}): Promise<{ producto: Producto; mensaje: string; comun: boolean } | null> => {
    if (!validar({ nombre: b.nombre, precio: b.precio, medios: b.medios, sinFoto: opciones.sinFoto })) return null;
    if (!(await pasarBienvenida(b.medios))) return null;
    const entregadas = taller.entregadas;
    const final = mediosParaGuardar(conEntregadas(b.medios, entregadas));
    const fotos = final.flatMap((m) => (m.tipo === "foto" ? [m.url] : []));
    const primera = final.find((m) => m.tipo === "foto");
    const conOpciones = b.presentaciones.opciones.length > 0 && b.presentaciones.pres.length > 0;
    try {
      const creado = await crearProducto(
        tiendaId,
        {
          nombre: b.nombre.trim(), precio: Number(b.precio), fotos, fotoRetocada: primera?.tipo === "foto" ? primera.retocada : false,
          stock: conOpciones ? 0 : b.stock, categoria: b.coleccion, activo: b.activo, destacado: false, likes: 0,
          medios: final, detalles: b.detalles, porEncargo: b.porEncargo, encargoTexto: b.porEncargo ? b.encargoTexto.trim() || null : null,
          ...(b.rubro ? { rubro: b.rubro } : {}),
        },
        { retoques: 0, ...(conOpciones ? { opciones: b.presentaciones.opciones, variantes: variantesParaGuardar(b.presentaciones, new Map()) } : {}) },
      );
      await guardarFotosDeColor(b.medios, entregadas, b.presentaciones, creado);
      const falloFicha = await guardarLaFicha(b.ficha, creado);
      const base = falloFicha ?? (b.activo ? MENSAJE_PUBLICADO : MENSAJE_OCULTO);
      const mensaje = await mandarAlTaller(b.medios, entregadas, creado, base);
      return { producto: creado, mensaje, comun: mensaje === MENSAJE_PUBLICADO || mensaje === MENSAJE_OCULTO };
    } catch (e) {
      toast(mensajeDeError(e, "No se pudo guardar. Inténtalo otra vez."));
      return null;
    }
  };

  const bienvenidaRetoque = (
    <BienvenidaRetoque
      datos={bienvenida?.datos ?? null}
      alCancelar={() => {
        bienvenida?.resolver(false);
        setBienvenida(null);
      }}
      alConfirmar={() => {
        marcarBienvenidaVista(tiendaId);
        bienvenida?.resolver(true);
        setBienvenida(null);
      }}
    />
  );

  return { validar, pasarBienvenida, entregadasAlGuardar, mandarAlTaller, hayMarcadas, guardarFotosDeColor, guardarLaFicha, crear, bienvenidaRetoque };
}
