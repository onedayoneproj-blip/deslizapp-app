// Búsqueda de clientes: UNA sola lógica para el buscador de Clientes y el selector de "+ Pedido".
// Encuentra por nombre, por teléfono y por nota; sin distinguir acentos ni mayúsculas.

import { contieneTodas, palabras, sinAcentos } from "./texto";
import { digitosDeBusqueda, telefonoNacional } from "./telefono";
import type { ClienteConResumen } from "./types";

export type DondeCoincide = "nombre" | "telefono" | "nota";

export type ResultadoCliente = {
  cliente: ClienteConResumen;
  /** Por qué salió: primero se mira el nombre, luego el teléfono y al final la nota. */
  coincide: DondeCoincide;
};

/**
 * Clientes que coinciden con lo escrito. Con la consulta vacía devuelve todos (`coincide: "nombre"`).
 * Orden: coincidencias por nombre primero (las que empiezan con lo escrito, antes), luego teléfono, luego nota.
 */
export function buscarClientes(clientes: ClienteConResumen[], consulta: string): ResultadoCliente[] {
  const q = palabras(consulta);
  if (q.length === 0) return clientes.map((cliente) => ({ cliente, coincide: "nombre" }));
  const digitos = digitosDeBusqueda(consulta);
  const resultados: (ResultadoCliente & { rango: number })[] = [];
  for (const cliente of clientes) {
    if (contieneTodas(cliente.nombre, q)) {
      resultados.push({ cliente, coincide: "nombre", rango: sinAcentos(cliente.nombre).startsWith(q[0]!) ? 0 : 1 });
    } else if (cliente.telefono && digitos.some((d) => telefonoNacional(cliente.telefono!).includes(d))) {
      resultados.push({ cliente, coincide: "telefono", rango: 2 });
    } else if (cliente.nota && contieneTodas(cliente.nota, q)) {
      resultados.push({ cliente, coincide: "nota", rango: 3 });
    }
  }
  return resultados.sort((a, b) => a.rango - b.rango || a.cliente.nombre.localeCompare(b.cliente.nombre, "es"));
}

/** Los clientes con pedidos más recientes primero (los que aún no piden, al final, del más nuevo al más viejo). */
export function recientes(clientes: ClienteConResumen[], max = 8): ClienteConResumen[] {
  return [...clientes]
    .sort((a, b) => (b.ultimaCompra ?? "").localeCompare(a.ultimaCompra ?? "") || b.primerPedidoEn.localeCompare(a.primerPedidoEn))
    .slice(0, max);
}
