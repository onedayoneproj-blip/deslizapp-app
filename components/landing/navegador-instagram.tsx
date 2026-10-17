import type { ReactNode } from "react";
import "./navegador-instagram.css";

/**
 * La hoja del navegador que abre una red social al tocar un enlace (referencias/planes/instagram-perfil-a-catalogo/): arriba la X, el
 * candado con el dominio y «Instagram» debajo, y «···»; la barra de progreso; el contenido (`children`, blanco mientras no carga) y,
 * abajo, la barra del navegador. Sin el logo de ninguna red. Es la pantalla `navegador` de «Cómo funciona»
 * (docs/prompts/conoce-portada-narrativa.md) y parte de la vista previa de «Tu catálogo en el link de tu bio» en /planes.
 * En cqw y sin escalar en un eje, como el perfil. Decoración: quien la usa la esconde a los lectores de pantalla.
 */
export function NavegadorInstagram({ dominio = "deslizapp.com/tutienda", origen = "Instagram", children }: { dominio?: string; origen?: string; children: ReactNode }) {
  return (
    <div className="nv">
      <div className="nv-arriba">
        <span className="nv-boton">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </span>
        <span className="nv-url">
          <b>
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M7 10V8a5 5 0 0 1 10 0v2h1a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1zm2 0h6V8a3 3 0 0 0-6 0z" />
            </svg>
            {dominio}
          </b>
          <span>{origen}</span>
        </span>
        <span className="nv-boton nv-mas">···</span>
      </div>
      <div className="nv-progreso">
        <i />
      </div>
      <div className="nv-cuerpo">{children}</div>
      <div className="nv-abajo">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="nv-quieto">
          <path d="M15 5l-7 7 7 7" />
        </svg>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="nv-quieto">
          <path d="M9 5l7 7-7 7" />
        </svg>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 12a8 8 0 1 1-2.4-5.7M20 4v4.5h-4.5" />
        </svg>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 3L3 10.5l7 3 3 7z" />
        </svg>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3.5 12a8.5 8.5 0 1 0 2.6-6.1M3.5 4v4.5H8M12 7.5V12l3 2" />
        </svg>
      </div>
    </div>
  );
}
