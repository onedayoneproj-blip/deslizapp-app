// Componentes base del sistema de diseño (docs/09-sistema-de-diseno.md). Fuente de verdad para todo lo nuevo; la guía viva
// está en /diseno. Solo usan tokens por función (app/globals.css): funcionan igual en claro y en oscuro.
export { Alerta } from "./alerta";
export { Avatar } from "./avatar";
export { Aviso, type TonoAviso } from "./aviso";
export { Boton, BotonIcono, type JerarquiaBoton, type TamanoBoton } from "./boton";
export { BotonCantidad, Cantidad } from "./cantidad";
export { Buscador, Campo, CampoMonto, soloDigitos } from "./campo";
export { ControlSegmentado } from "./control-segmentado";
export { Contador, Etiqueta, type TonoEtiqueta } from "./etiqueta";
export { FilaAgregar } from "./fila-agregar";
export { FilaLista, ListaAgrupada } from "./lista";
export { GrupoOpciones, Opcion } from "./opcion";
export { FilaPastillas, type OpcionFiltro } from "./pastilla";
export { TarjetaDocumento } from "./tarjeta-documento";
export { Tarjeta, type TonoTarjeta } from "./tarjeta";
export { ProveedorToast, useToastUI, VistaToast, type OpcionesToast } from "./toast";
