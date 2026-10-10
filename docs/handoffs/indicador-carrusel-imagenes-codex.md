# Indicador de imágenes · entrega de Coding

10 oct 2026. [Tarea de Planning](https://app.notion.com/p/3f5ed62010cb81fbb5a3eaa6d9ac94a5). Nueva rama `fix/indicador-carrusel-imagenes` desde main actualizado `a27da202904567f3344ee798a7accd074bc01021`, que incluye PR #100. Sin continuar ni repetir la implementación del selector.

Se elimina por completo el progreso global de productos de Reel. Los puntos independientes del carrusel se ubican en un pie reservado dentro del marco, bajo la foto: solo con varios medios, siguiendo swipe, toque y selección de foto por color. Una imagen conserva todo el espacio. Reutiliza componentes, estilos y movimiento reducido existentes. Likes, opiniones, bolsa y contadores de gestión permanecen.

[Especificación](../04-pantallas.md), [validación y límites](../validacion-carrusel-imagenes.md), [capturas](../capturas/carrusel-imagenes/README.md). Las pruebas usan Demo y fixtures locales; no hay cambios en datos reales ni migraciones. Safari/iPhone real pendiente de Lewis.

Entrega en un único push: PR abierto contra main, sin merge ni producción. El commit exacto, checks, preview READY y alias estable se informan en el PR, la tarea y el mensaje manual a Planning, para evitar otro push por actualizar referencias del mismo despliegue. No se prometen avisos automáticos ni se usan sesiones anteriores.
