import { readFileSync } from "node:fs";
import { isDeepStrictEqual } from "node:util";

// Solo ignora comentarios, espacios y mayúsculas fuera de literales SQL.
function tokens(sql) {
  const pattern = /--[^\n]*|\/\*[\s\S]*?\*\/|'(?:''|[^'])*'|"(?:""|[^"])*"|\$([a-zA-Z_][\w]*|)\$[\s\S]*?\$\1\$|[a-zA-Z_][\w$]*|\s+|./g;
  return [...sql.matchAll(pattern)]
    .map(([token]) => token)
    .filter((token) => !/^\s|^--|^\/\*/.test(token))
    .map((token) => /^[a-zA-Z_]/.test(token) ? token.toLowerCase() : token);
}

const [localPath, productionPath] = process.argv.slice(2);
if (!localPath || !productionPath) throw new Error("Uso: node comparar-esquema.mjs local.json produccion.json");
const load = (path) => new Map(JSON.parse(readFileSync(path, "utf8")).map((row) => {
  if (row.clase === "funcion") row.definicion.cuerpo = tokens(row.definicion.cuerpo);
  return [`${row.clase}:${row.clave}`, row.definicion];
}));
const local = load(localPath);
const production = load(productionPath);
const differences = [...new Set([...local.keys(), ...production.keys()])].sort()
  .filter((key) => !isDeepStrictEqual(local.get(key), production.get(key)));
console.log(JSON.stringify({ local: local.size, produccion: production.size, diferencias: differences }, null, 2));
if (differences.length) process.exitCode = 1;
