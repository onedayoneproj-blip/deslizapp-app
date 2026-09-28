# Deslizapp — Panel de tienda

Panel de administración para dueños de tienda en Deslizapp: catálogo,
pedidos, clientes, promos y resumen.

👉 **Empieza por [`HANDOFF.md`](./HANDOFF.md)** — ahí está todo el contexto,
el alcance, el modelo de datos y el orden de construcción sugerido.

## Getting Started

```bash
npm install
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

## Publicación

El repositorio está conectado a Vercel: **https://deslizapp-app.vercel.app**.
Cada push a `main` publica solo; no hay que hacer nada más.

Hoy la app no necesita variables de entorno (los datos de prueba viven en el
navegador). Cuando se conecte Supabase, sus variables (URL y llave pública
del proyecto) se agregarán en Vercel, en *Settings → Environment Variables*.

## Notas

Este proyecto usa Next.js 16 (App Router) + TypeScript + Tailwind v4. Antes de
escribir rutas o layouts, revisa `node_modules/next/dist/docs/01-app/` — esta
versión tiene cambios respecto a versiones anteriores de Next.js.
