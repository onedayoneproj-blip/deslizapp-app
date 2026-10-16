import { crearAlmacenDemo } from "./demo";
import { construirDesdeSeed } from "./db";

export const demoInterna = crearAlmacenDemo({ clave: "deslizapp-demo-v5", construir: construirDesdeSeed });
