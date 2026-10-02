# Fotografías de la demo

26 imágenes de aspecto fotográfico generadas con IA el 2 de octubre de 2026:
16 productos, 2 perfiles de tienda y 8 contactos ficticios. Todas tienen fondo de color,
son opacas y están versionadas en public/seed/. Son assets de demostración; no son
fotografías de clientes reales ni una garantía del aspecto de productos comerciales.

## Archivos y uso

- Productos: public/seed/productos/*.webp, máximo 960 px, calidad 82.
- Tiendas: public/seed/tiendas/*.webp, 512 px.
- Contactos: public/seed/clientes/*.webp, 384 px. lib/fotos-demo.ts vincula únicamente
  los ocho UUID originales del seed. Los demás clientes conservan sus iniciales.
- Avatar usa los retratos solo con modo demo y clienteId conocido. En modo real,
  contactos creados y fallos de carga conserva las iniciales y el tamaño circular.
- Los JSON del seed apuntan a WebP. scripts/generar-seed.mjs reutiliza estas fotos;
  no genera ni sobrescribe los assets fotográficos.
- migrar() reemplaza solo las 18 rutas SVG originales por sus equivalentes WebP.
  No reinicia la demo, no cambia stock/pedidos/ajustes y no sobrescribe fotos o logos
  personalizados. Los SVG anteriores se conservan por compatibilidad.
- El catálogo HTML de producción permanece separado. Las rutas públicas podrán
  reutilizarse cuando se conecte su demo; esa conexión no se implementa aquí.

## Coordinación

Rama feature/demo-fotos-color, basada en main 8f82222d058531dcc7463fa647a86a35f8b70853.
Actualizada con main cbc4a9191fc3f017aa38f99136da6eee6b1de5b3 (PR #22).
Conserva su inventario compacto e historial interno; las fotos usan novedades 0.31.7.
No modifica hojas, controles ni operaciones de inventario. Antes de integrar una
rama concurrente, conservar ambas novedades y asignar números distintos si coinciden.
Sin cambios en Supabase, Storage, migraciones o datos reales.

## Comprobaciones realizadas

- TypeScript (next typegen y tsc --noEmit): aprobado.
- Lint: aprobado.
- 14 archivos de pruebas existentes: aprobados.
- Comprobación directa de rutas originales, conservación de fotos personalizadas y
  separación demo/real: aprobada.
- Build local con Webpack: bloqueado al analizar la salida del CLI de TypeScript.
  TypeScript por separado sí pasó; no se presenta el build local como aprobado.
- Navegador local: no ejecutado; el servidor rechazó abrir el puerto (listen EPERM).
  iPhone físico y recorrido visual autenticado quedan pendientes.

## Validación manual

1. Entrar a Demo y revisar fotos en Catálogo y vista previa del producto.
2. Cambiar de tienda y comprobar perfumes, bisutería y ambos perfiles circulares.
3. Buscar Carolina Peña, Luis Marte o Ana Lucía Ferreira; comprobar retratos en
   Clientes, su ficha y selector de cliente de Crear pedido.
4. Confirmar que un contacto nuevo sigue mostrando iniciales.
5. Si hay una demo guardada, comprobar que conserva cantidades, pedidos y ajustes.
6. Revisar 360/390/430 px y un iPhone físico. No probar escrituras reales para esta tarea.
