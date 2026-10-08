import { useId } from "react";
export type NombreIcono =
  | "heart"
  | "bag"
  | "comment"
  | "share"
  | "send"
  | "search"
  | "back"
  | "help"
  | "wa"
  | "trash"
  | "sound"
  | "mute"
  | "ficha";
export function Icono({ nombre }: { nombre: NombreIcono }) {
  const paths: Partial<Record<NombreIcono, string>> = {
    heart:
      "M12 20.3s-7.3-4.4-9.2-8.9C1.3 7.9 3.4 4.6 6.8 4.6c2.1 0 3.5 1.1 5.2 3 1.7-1.9 3.1-3 5.2-3 3.4 0 5.5 3.3 4 6.8-1.9 4.5-9.2 8.9-9.2 8.9z",
    bag: "M5 8h14l-1.1 12.1a1 1 0 0 1-1 .9H7.1a1 1 0 0 1-1-.9z M9 10.5V7a3 3 0 0 1 6 0v3.5",
    comment:
      "M20.7 11.6a8.6 8.6 0 0 1-12.4 7.7L3.4 20.6l1.3-4.6a8.6 8.6 0 1 1 16-4.4z",
    share:
      "M21.5 2.5 10.2 13.8 M21.5 2.5 14.6 21.2a.5.5 0 0 1-.93.03L10.2 13.8 2.77 10.33a.5.5 0 0 1 .03-.93z",
    send: "M21.5 3 9.9 11.3M21.5 3l-6.8 18.1-4.8-9.8L3 7.4z",
    back: "M15 5l-7 7 7 7",
    trash:
      "M4 7h16M9.5 7V5.2c0-.7.5-1.2 1.2-1.2h2.6c.7 0 1.2.5 1.2 1.2V7M6.2 7l.9 12.1c.1 1 .9 1.9 2 1.9h5.8c1.1 0 1.9-.9 2-1.9L17.8 7M10.2 11v6M13.8 11v6",
    sound: "M11 4 6 8H3v8h3l5 4z M15 8a6 6 0 0 1 0 8M18 5a10 10 0 0 1 0 14",
    mute: "M11 4 6 8H3v8h3l5 4z M16 9l5 6 M21 9l-5 6",
    ficha: "M7 3h7l5 5v12a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z M14 3v5h5 M9 13h6 M9 17h6",
  };
  if (nombre === "wa")
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
        <path d="M20.5 3.5A11.8 11.8 0 0 0 2 17.7L.4 23.5l6-1.6A11.8 11.8 0 0 0 20.5 3.5ZM12 21.6a9.8 9.8 0 0 1-5-1.4l-.4-.2-3.5.9 1-3.4-.3-.5a9.8 9.8 0 1 1 8.2 4.6Zm5.4-7.4c-.3-.1-1.7-.8-2-.9-.2-.1-.4-.1-.6.2-.2.3-.7.9-.9 1-.2.2-.3.2-.6.1-.3-.2-1.2-.4-2.2-1.4-.9-.7-1.4-1.6-1.6-1.8-.1-.3 0-.4.1-.5l.4-.5.3-.5c.1-.2 0-.4 0-.5L8.9 7c-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.7.3-.3.3-1 1-1 2.4s1 2.7 1.2 2.9c.1.2 2 3.1 4.8 4.3.7.3 1.2.5 1.6.6.7.2 1.3.2 1.8.1.5-.1 1.7-.7 1.9-1.3.2-.6.2-1.1.2-1.3-.1-.1-.3-.2-.6-.3Z" />
      </svg>
    );
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinejoin="round"
      strokeLinecap="round"
    >
      {paths[nombre] ? (
        <path d={paths[nombre]} />
      ) : nombre === "search" ? (
        <>
          <circle cx="10.8" cy="10.8" r="6.3" />
          <path d="M15.5 15.5 20 20" />
        </>
      ) : (
        <>
          <circle cx="12" cy="12" r="9" />
          <path d="M9.6 9.3a2.5 2.5 0 0 1 4.8.9c0 1.7-2.4 2.2-2.4 3.6" />
          <circle cx="12" cy="17" r=".6" fill="currentColor" />
        </>
      )}
    </svg>
  );
}
export function SelloAgotado() {
  const id = useId();
  return (
    <span className="soldtag">
      <svg className="inkstamp" viewBox="0 0 280 120" aria-hidden="true">
        <defs>
          <filter id={id} x="-5%" y="-5%" width="110%" height="110%">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.75"
              numOctaves="2"
              seed="4"
              result="grain"
            />
            <feColorMatrix
              in="grain"
              type="matrix"
              values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -3 2.3"
              result="holes"
            />
            <feComposite
              in="SourceGraphic"
              in2="holes"
              operator="in"
              result="speckled"
            />
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.035"
              numOctaves="2"
              seed="11"
              result="warp"
            />
            <feDisplacementMap
              in="speckled"
              in2="warp"
              scale="4"
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
        </defs>
        <g filter={"url(#" + id + ")"} fill="none" stroke="#FF834F">
          <rect x="7" y="7" width="266" height="106" rx="53" strokeWidth="8" />
          <rect x="21" y="21" width="238" height="78" rx="39" strokeWidth="3" />
          <path d="M44 60h0M236 60h0" strokeWidth="9" strokeLinecap="round" />
          <text
            x="140"
            y="75"
            textAnchor="middle"
            fill="#FF834F"
            stroke="none"
            fontSize="44"
            fontWeight="700"
            textLength="168"
            lengthAdjust="spacingAndGlyphs"
            fontFamily="DZ Fredoka,Fredoka,sans-serif"
          >
            AGOTADO
          </text>
        </g>
      </svg>
    </span>
  );
}
