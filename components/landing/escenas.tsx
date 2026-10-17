import type { CSSProperties, ReactNode } from "react";
import { Foto } from "../foto";
import { PerfilTienda } from "./perfil-tienda";
import "./escenas.css";

/**
 * Las pantallas de la historia de «Cómo funciona» que no son la app (docs/prompts/conoce-portada-narrativa.md): el dolor de quien vende
 * (un mensaje directo y la lista de chats) y el post de la tienda. Se dibujan dentro del hueco del teléfono de la compradora
 * (landing.tsx) y el controlador muestra una según el paso (data-escena). Del perfil al catálogo se encarga `PerfilACatalogo`, que tiene
 * su propio teléfono (paso `enlace`). Redes sociales genéricas, sin logos ni la
 * interfaz exacta de Instagram. Todo en cqw (1 % del ancho de la pantalla), igual que perfil-tienda y navegador-instagram. Son
 * decoración: se esconden a los lectores de pantalla y la burbuja de cada paso dice lo mismo.
 */
export function Escenas() {
  return (
    <div className="esc-capas" aria-hidden="true">
      <Capa id="dolor-dm">
        <MensajeDirecto />
      </Capa>
      <Capa id="dolor-chats">
        <ListaDeChats />
      </Capa>
      <Capa id="post">
        <PostDeLaTienda />
      </Capa>
    </div>
  );
}

/** Una escena suelta, para la versión sin JavaScript (`enlace`: el perfil con su enlace, de donde parte la animación). */
export function EscenaQuieta({ id }: { id: "dolor-dm" | "dolor-chats" | "post" | "enlace" }) {
  if (id === "dolor-dm") return <MensajeDirecto />;
  if (id === "dolor-chats") return <ListaDeChats />;
  if (id === "post") return <PostDeLaTienda />;
  return <PerfilTienda />;
}

function Capa({ id, children }: { id: string; children: ReactNode }) {
  return (
    <div className="esc-capa" data-escena={id}>
      {children}
    </div>
  );
}

/** El mensaje directo: una captura del producto, «¿precio?», «¿lo tienes en negro?» y la tienda contestando «escríbeme al WhatsApp». */
function MensajeDirecto() {
  return (
    <div className="esc esc-dm">
      <div className="esc-dm-cabeza">
        <span className="esc-dm-avatar" />
        <span className="esc-dm-quien">
          <b>ana.compra</b>
          <span>Mensaje directo</span>
        </span>
      </div>
      <div className="esc-dm-hilo">
        <span className="esc-msg esc-msg-foto" style={{ "--n": 0 } as CSSProperties}>
          <Foto src="/landing/feed-termo.webp" alt="" className="esc-msg-img" sizes="120px" />
        </span>
        <span className="esc-msg esc-msg-ellos" style={{ "--n": 1 } as CSSProperties}>
          Holaa, ¿precio de este? 👀
        </span>
        <span className="esc-msg esc-msg-ellos" style={{ "--n": 2 } as CSSProperties}>
          ¿Y lo tienes en negro?
        </span>
        <span className="esc-msg esc-msg-yo" style={{ "--n": 3 } as CSSProperties}>
          Hola! Escríbeme al WhatsApp por fa 🙏
        </span>
        <span className="esc-msg esc-msg-ellos" style={{ "--n": 4 } as CSSProperties}>
          ¿Cuál es el número? 😅
        </span>
      </div>
    </div>
  );
}

const CHATS = [
  { nombre: "Ana", texto: "¿precio? 👀", n: 3, color: "#f5c9d6" },
  { nombre: "Luis", texto: "📷 Foto", n: 2, color: "#ffd9a8" },
  { nombre: "Carla", texto: "¿en qué va mi pedido?", n: 5, color: "#cfe3d6" },
  { nombre: "Pedro", texto: "¿lo tienes en negro?", n: 1, color: "#d9d4f3" },
  { nombre: "Marisol", texto: "📷 Foto", n: 4, color: "#f5c9d6" },
  { nombre: "Juan", texto: "¿cuánto es el envío?", n: 2, color: "#ffd9a8" },
  { nombre: "Yaritza", texto: "mándame el precio otra vez", n: 6, color: "#cfe3d6" },
  { nombre: "Rafael", texto: "¿2 gorras? 👀", n: 1, color: "#d9d4f3" },
];

/** Una lista de chats con muchos sin leer y, encima, una nota de libreta con un nombre tachado. */
function ListaDeChats() {
  return (
    <div className="esc esc-chats">
      <div className="esc-chats-titulo">Chats</div>
      {CHATS.map((c, i) => (
        <div key={c.nombre} className="esc-chat" style={{ "--n": i } as CSSProperties}>
          <span className="esc-chat-avatar" style={{ background: c.color }} />
          <span className="esc-chat-quien">
            <b>{c.nombre}</b>
            <span>{c.texto}</span>
          </span>
          <span className="esc-chat-n">{c.n}</span>
        </div>
      ))}
      <p className="esc-nota">
        Ana: termo negro
        <br />
        Luis: ¿2 gorras?
        <br />
        Carla: abonó 500
        <br />
        <s>Pedro: tote</s> ¿o era Juan?
      </p>
    </div>
  );
}

/** El post de la tienda en una red social genérica: «Pídela desde el enlace de mi perfil». */
function PostDeLaTienda() {
  return (
    <div className="esc esc-post">
      <div className="esc-post-cabeza">
        <span className="esc-post-avatar">
          <span>TT</span>
        </span>
        <b>tutienda.rd</b>
      </div>
      <Foto src="/landing/feed-gorra.webp" alt="" className="esc-post-foto" sizes="260px" />
      <div className="esc-post-acciones">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
          <path d="M12 20.5s-7.5-4.6-7.5-10.1A4.4 4.4 0 0 1 12 7.6a4.4 4.4 0 0 1 7.5 2.8c0 5.5-7.5 10.1-7.5 10.1z" />
        </svg>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
          <path d="M20.5 11.6a8.4 8.4 0 0 1-12.4 7.4L3.5 20.5l1.6-4.5A8.4 8.4 0 1 1 20.5 11.6z" />
        </svg>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
          <path d="M21 3L10 14M21 3l-7 18-4-7-7-4z" />
        </svg>
      </div>
      <p className="esc-post-texto">
        <b>tutienda.rd</b> Llegaron las gorras bordadas 🧢 Pídela desde <b className="esc-post-enlace">el enlace de mi perfil</b> 👆
      </p>
    </div>
  );
}
