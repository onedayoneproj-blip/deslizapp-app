/**
 * ¿Se muestra «Ya estás al día» (el reel de cierre con la marca de la tienda) entre el último producto y el reel de Deslizapp?
 *
 * Apagado por decisión de Lewis (16 oct 2026): al llegar a ese reel la gente vuelve arriba y nunca ve el de Deslizapp, y eso
 * cuesta conversiones a tienda. Se enciende más adelante, cuando haya base de clientes. El código del reel (components/tienda/
 * finales-reel.tsx, `ReelFin`) y sus pruebas (scripts/probar-finales-catalogo.mjs) se conservan.
 */
export const MOSTRAR_FIN_CATALOGO = false;
