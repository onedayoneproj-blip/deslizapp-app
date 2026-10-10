# Onboarding 2 · checklist en Inicio

Coding Codex, 10 oct 2026. Rama `feat/onboarding-checklist-codex`, desde main `cd804c8a617725d3f0c50a200402d254f61a674c` (#95 incluido). Planning no editó código de app. No existía trabajo remoto de checklist al comenzar; una copia local sin push de Claude es desconocida. No sobrescribir esta rama con una copia antigua.

## Alcance

Checklist de siete pasos para dueñas, con tarjetas pendientes en carrusel y Hecho plegado. Visibles **con foto** para el paso 3 (docs/17), nunca un mínimo para publicar. Publicar y Ver cómo queda usan las hojas existentes, también vacío. Mi marca abre logo/colores; guardar colores marca el paso. Perfil corto con descripción ≤160 e Instagram válido; instalación con instrucciones y Ya lo hice; Tu equipo y Lo hago sola.

`Tienda.onboarding` pasa por el adaptador existente. `marcarOnboarding` llama la RPC publicada `marcar_onboarding`; demo persistente e idempotente, protegida por dueña. `guardarPerfilCatalogo` guarda solo descripción/Instagram y deja intactos marca, inventario y pedidos. Ambos métodos bloqueados en soloMirar.

El cierre automático se intenta una vez por montaje. Solo el éxito confirmado persiste el cierre y muestra celebración breve (toast); error deja guía y Reintentar. Cerrar manualmente requiere confirmar. No se muestra a colaboradoras, Ver como, pausadas/eliminadas, ni tiendas ya marcadas. Datos por tienda, una consulta agregada de productos/equipo; actualización al volver/foco mediante provider existente. Error de lectura deja disponible Inicio. Perfil conserva borrador y usa protección de salida dentro del contexto Hoja.

## Coordinación

Un único push de la ronda. PR abierto sin merge ni publicación. No se incorporó #45 ni se hicieron migraciones/escrituras reales. Esencias Michel, Soft Era y Tienda de ensayo intactas. Las herramientas remotas Claude `send_message`/`create_trigger` no están disponibles: el aviso se entrega al Planning de esta sesión, sin afirmar que se envió a la sesión Claude.

## Validación

Ver `docs/validacion-onboarding-2.md` y `docs/capturas/onboarding-2/README.md`. Los primeros errores ambientales/test actualizado se conservan como antecedentes. Los resultados de Chromium son con fixtures demo; no sustituyen Safari físico ni una cuenta dueña real.

## Lewis · pruebas en Safari

1. Abre la preview exacta del PR. En Demo, usa una tienda con guía disponible; no pruebes escrituras en Michel o Soft Era.
2. Revisa la barra y desliza las tarjetas. Logo/colores abren Mi marca en la sección correcta. Guardar colores debe completar el paso.
3. Abre Agregar producto y vuelve a Inicio: solo los visibles con foto cuentan. Publicar funciona incluso vacío, con confirmación suave; Ver cómo queda abre la vista previa existente.
4. Cuéntales quién eres: descripción e Instagram. Escribe, intenta cerrar, elige Seguir aquí y comprueba el borrador. Guarda.
5. Cómo se hace → Ya lo hice; equipo → Lo hago sola. Recarga y confirma persistencia.
6. Si decides ocultar la guía, cancela primero; confirmar debe ocultarla definitivamente en esa tienda. Siete de siete debe cerrarse una sola vez.
7. Verifica que como colaboradora o en Ver como no aparece. Las acciones reales de una tienda nueva requieren cuenta de prueba acordada, no las tiendas de otras personas.
