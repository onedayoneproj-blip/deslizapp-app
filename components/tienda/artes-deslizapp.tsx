// Geometría e ilustraciones de la referencia HTML; JSX, sin inyección de HTML.
import type { CSSProperties } from "react";
export const HISTORIAS = [
  {
    h: "Tú mandas <em>las fotos.</em>",
    p: "Nombre, precio y una foto del celular. Ahí termina tu parte.",
    bg: "rosa",
  },
  {
    h: "Nosotros las ponemos <em>a brillar.</em>",
    p: "Retocamos cada foto y escribimos los textos. El producto es la estrella; nosotros, las luces.",
    bg: "verde",
  },
  {
    h: "Deslizan… <em>aaah.</em>",
    p: "Como en sus reels. Tus clientes llevan años practicando sin saberlo.",
    note: "dale al corazón, no a la captura de pantalla",
    bg: "crema",
  },
  {
    h: "Del suspiro <em>al chat.</em>",
    p: "El pedido te llega por WhatsApp con todo listo. Sin formularios ni contraseñas.",
    bg: "verde",
  },
  {
    h: "Cada pedido, <em>en vivo.</em>",
    p: "Tú y tu cliente lo ven con fotos por 24 horas. El recibo se descarga solito.",
    bg: "rosa",
  },
  {
    h: "Lo buscan <em>como hablan.</em>",
    p: "«Algo dulce», «para regalar»… Lo escriben y aparece.",
    note: "sin algoritmo que te juzgue",
    bg: "mandarina",
  },
  {
    h: "Y lo <em>comparten.</em>",
    p: "Cada producto tiene su enlace. Perfecto para lanzar indirectas de regalo.",
    bg: "crema",
  },
  {
    h: "Siempre <em>al día.</em>",
    p: "Marcamos lo vendido y subimos lo nuevo. Tú solo nos avisas.",
    bg: "verde",
  },
  {
    h: "Un enlace. <em>Todas partes.</em>",
    p: "En tu bio, tus estados y tus grupos. Nadie descarga nada.",
    bg: "rosa",
  },
  {
    h: "Tu tienda merece <em>su aaah.</em>",
    p: "Escríbenos y te armamos una demo con tus propios productos.",
    note: "ese aaah ya tiene nombre: deslizapp",
    cta: true,
    bg: "verde",
  },
];
export function ArteHistoria({
  indice,
  contacto,
}: {
  indice: number;
  contacto: string;
}) {
  if (indice === 0)
    return (
      <section className={"slide on"} data-bg={"rosa"}>
        <div className={"deco"} aria-hidden={"true"}>
          <span
            className={"di c2"}
            style={
              {
                left: "6%",
                top: "7%",
                width: "30px",
                height: "30px",
                "--r": "-12deg",
                "--dd": "3.00s",
                "--dl": "0s",
              } as CSSProperties
            }
          >
            <svg viewBox={"0 0 24 22"} fill={"currentColor"}>
              <path
                d={
                  "M12 21s-8.6-5.1-10.7-10.3C-.3 6.6 2.2 1.5 6.6 1.5c2.4 0 4 1.2 5.4 3.2 1.4-2 3-3.2 5.4-3.2 4.4 0 6.9 5.1 5.3 9.2C20.6 15.9 12 21 12 21z"
                }
              ></path>
            </svg>
          </span>
          <span
            className={"di c2"}
            style={
              {
                left: "88%",
                top: "81%",
                width: "32px",
                height: "32px",
                "--r": "10deg",
                "--dd": "3.37s",
                "--dl": "-0.9s",
              } as CSSProperties
            }
          >
            <svg viewBox={"0 0 24 22"} fill={"currentColor"}>
              <path
                d={
                  "M12 21s-8.6-5.1-10.7-10.3C-.3 6.6 2.2 1.5 6.6 1.5c2.4 0 4 1.2 5.4 3.2 1.4-2 3-3.2 5.4-3.2 4.4 0 6.9 5.1 5.3 9.2C20.6 15.9 12 21 12 21z"
                }
              ></path>
            </svg>
          </span>
          <span
            className={"di c2"}
            style={
              {
                left: "9%",
                top: "79%",
                width: "24px",
                height: "24px",
                "--r": "-6deg",
                "--dd": "3.74s",
                "--dl": "-1.8s",
              } as CSSProperties
            }
          >
            <svg viewBox={"0 0 24 22"} fill={"currentColor"}>
              <path
                d={
                  "M12 21s-8.6-5.1-10.7-10.3C-.3 6.6 2.2 1.5 6.6 1.5c2.4 0 4 1.2 5.4 3.2 1.4-2 3-3.2 5.4-3.2 4.4 0 6.9 5.1 5.3 9.2C20.6 15.9 12 21 12 21z"
                }
              ></path>
            </svg>
          </span>
          <span
            className={"di c1"}
            style={
              {
                left: "83%",
                top: "5%",
                width: "34px",
                height: "34px",
                "--r": "12deg",
                "--dd": "4.11s",
                "--dl": "-2.7s",
              } as CSSProperties
            }
          >
            <svg
              viewBox={"0 0 24 22"}
              fill={"none"}
              stroke={"currentColor"}
              strokeWidth={"2.4"}
              strokeLinejoin={"round"}
            >
              <path
                d={
                  "M12 20s-8.2-4.9-10.2-9.8C.3 6.4 2.6 2.2 6.6 2.2c2.3 0 3.9 1.2 5.4 3.2 1.5-2 3.1-3.2 5.4-3.2 4 0 6.3 4.2 4.8 8C20.2 15.1 12 20 12 20z"
                }
              ></path>
            </svg>
          </span>
          <span
            className={"di c1"}
            style={
              {
                left: "3%",
                top: "45%",
                width: "30px",
                height: "30px",
                "--r": "-10deg",
                "--dd": "4.48s",
                "--dl": "-0.6s",
              } as CSSProperties
            }
          >
            <svg
              viewBox={"0 0 24 22"}
              fill={"none"}
              stroke={"currentColor"}
              strokeWidth={"2.4"}
              strokeLinejoin={"round"}
            >
              <path
                d={
                  "M12 20s-8.2-4.9-10.2-9.8C.3 6.4 2.6 2.2 6.6 2.2c2.3 0 3.9 1.2 5.4 3.2 1.5-2 3.1-3.2 5.4-3.2 4 0 6.3 4.2 4.8 8C20.2 15.1 12 20 12 20z"
                }
              ></path>
            </svg>
          </span>
          <span
            className={"di c1"}
            style={
              {
                left: "89%",
                top: "40%",
                width: "22px",
                height: "22px",
                "--r": "8deg",
                "--dd": "3.25s",
                "--dl": "-1.5s",
              } as CSSProperties
            }
          >
            <svg
              viewBox={"0 0 24 22"}
              fill={"none"}
              stroke={"currentColor"}
              strokeWidth={"2.4"}
              strokeLinejoin={"round"}
            >
              <path
                d={
                  "M12 20s-8.2-4.9-10.2-9.8C.3 6.4 2.6 2.2 6.6 2.2c2.3 0 3.9 1.2 5.4 3.2 1.5-2 3.1-3.2 5.4-3.2 4 0 6.3 4.2 4.8 8C20.2 15.1 12 20 12 20z"
                }
              ></path>
            </svg>
          </span>
          <span
            className={"di c2"}
            style={
              {
                left: "68%",
                top: "3%",
                width: "24px",
                height: "24px",
                "--r": "0deg",
                "--dd": "3.62s",
                "--dl": "-2.4s",
              } as CSSProperties
            }
          >
            <svg viewBox={"0 0 24 24"} fill={"currentColor"}>
              <path
                d={
                  "M12 0c.9 6.2 5.1 10.9 12 12-6.9 1.1-11.1 5.8-12 12-.9-6.2-5.1-10.9-12-12 6.9-1.1 11.1-5.8 12-12z"
                }
              ></path>
            </svg>
          </span>
          <span
            className={"di c2"}
            style={
              {
                left: "16%",
                top: "31%",
                width: "18px",
                height: "18px",
                "--r": "0deg",
                "--dd": "3.99s",
                "--dl": "-0.3s",
              } as CSSProperties
            }
          >
            <svg viewBox={"0 0 24 24"} fill={"currentColor"}>
              <path
                d={
                  "M12 0c.9 6.2 5.1 10.9 12 12-6.9 1.1-11.1 5.8-12 12-.9-6.2-5.1-10.9-12-12 6.9-1.1 11.1-5.8 12-12z"
                }
              ></path>
            </svg>
          </span>
          <span
            className={"di c1"}
            style={
              {
                left: "79%",
                top: "89%",
                width: "28px",
                height: "28px",
                "--r": "0deg",
                "--dd": "4.36s",
                "--dl": "-1.2s",
              } as CSSProperties
            }
          >
            <svg
              viewBox={"0 0 24 24"}
              fill={"none"}
              stroke={"currentColor"}
              strokeWidth={"1.8"}
              strokeLinejoin={"round"}
            >
              <path
                d={
                  "M12 1.5c.9 5.6 4.8 9.5 10.5 10.5-5.7 1-9.6 4.9-10.5 10.5C11.1 16.9 7.2 13 1.5 12 7.2 11 11.1 7.1 12 1.5z"
                }
              ></path>
            </svg>
          </span>
          <span
            className={"di c2"}
            style={
              {
                left: "4%",
                top: "93%",
                width: "20px",
                height: "20px",
                "--r": "0deg",
                "--dd": "3.13s",
                "--dl": "-2.1s",
              } as CSSProperties
            }
          >
            <svg viewBox={"0 0 24 24"} fill={"currentColor"}>
              <path
                d={
                  "M12 0c.9 6.2 5.1 10.9 12 12-6.9 1.1-11.1 5.8-12 12-.9-6.2-5.1-10.9-12-12 6.9-1.1 11.1-5.8 12-12z"
                }
              ></path>
            </svg>
          </span>
        </div>
        <div className={"art a1"}>
          <div className={"phone"}>
            <img src={"/tienda/michel-parade.jpg"} alt={""} />
            <div className={"flash"}></div>
          </div>
          <div className={"fly"}>
            <img src={"/tienda/michel-parade.jpg"} alt={""} />
          </div>
        </div>
        <h3>
          {"Tú mandas "}
          <em>{"las fotos."}</em>
        </h3>
        <p>{"Nombre, precio y una foto del celular. Ahí termina tu parte."}</p>
      </section>
    );
  if (indice === 1)
    return (
      <section className={"slide on"} data-bg={"verde"}>
        <div className={"deco"} aria-hidden={"true"}>
          <span
            className={"di c2"}
            style={
              {
                left: "8%",
                top: "6%",
                width: "32px",
                height: "32px",
                "--r": "0deg",
                "--dd": "3.00s",
                "--dl": "0s",
              } as CSSProperties
            }
          >
            <svg viewBox={"0 0 24 24"} fill={"currentColor"}>
              <path
                d={
                  "M12 0c.9 6.2 5.1 10.9 12 12-6.9 1.1-11.1 5.8-12 12-.9-6.2-5.1-10.9-12-12 6.9-1.1 11.1-5.8 12-12z"
                }
              ></path>
            </svg>
          </span>
          <span
            className={"di c2"}
            style={
              {
                left: "85%",
                top: "12%",
                width: "24px",
                height: "24px",
                "--r": "0deg",
                "--dd": "3.37s",
                "--dl": "-0.9s",
              } as CSSProperties
            }
          >
            <svg viewBox={"0 0 24 24"} fill={"currentColor"}>
              <path
                d={
                  "M12 0c.9 6.2 5.1 10.9 12 12-6.9 1.1-11.1 5.8-12 12-.9-6.2-5.1-10.9-12-12 6.9-1.1 11.1-5.8 12-12z"
                }
              ></path>
            </svg>
          </span>
          <span
            className={"di c2"}
            style={
              {
                left: "90%",
                top: "49%",
                width: "30px",
                height: "30px",
                "--r": "0deg",
                "--dd": "3.74s",
                "--dl": "-1.8s",
              } as CSSProperties
            }
          >
            <svg viewBox={"0 0 24 24"} fill={"currentColor"}>
              <path
                d={
                  "M12 0c.9 6.2 5.1 10.9 12 12-6.9 1.1-11.1 5.8-12 12-.9-6.2-5.1-10.9-12-12 6.9-1.1 11.1-5.8 12-12z"
                }
              ></path>
            </svg>
          </span>
          <span
            className={"di c2"}
            style={
              {
                left: "3%",
                top: "75%",
                width: "22px",
                height: "22px",
                "--r": "0deg",
                "--dd": "4.11s",
                "--dl": "-2.7s",
              } as CSSProperties
            }
          >
            <svg viewBox={"0 0 24 24"} fill={"currentColor"}>
              <path
                d={
                  "M12 0c.9 6.2 5.1 10.9 12 12-6.9 1.1-11.1 5.8-12 12-.9-6.2-5.1-10.9-12-12 6.9-1.1 11.1-5.8 12-12z"
                }
              ></path>
            </svg>
          </span>
          <span
            className={"di c2"}
            style={
              {
                left: "75%",
                top: "90%",
                width: "20px",
                height: "20px",
                "--r": "0deg",
                "--dd": "4.48s",
                "--dl": "-0.6s",
              } as CSSProperties
            }
          >
            <svg viewBox={"0 0 24 24"} fill={"currentColor"}>
              <path
                d={
                  "M12 0c.9 6.2 5.1 10.9 12 12-6.9 1.1-11.1 5.8-12 12-.9-6.2-5.1-10.9-12-12 6.9-1.1 11.1-5.8 12-12z"
                }
              ></path>
            </svg>
          </span>
          <span
            className={"di c1"}
            style={
              {
                left: "14%",
                top: "29%",
                width: "28px",
                height: "28px",
                "--r": "0deg",
                "--dd": "3.25s",
                "--dl": "-1.5s",
              } as CSSProperties
            }
          >
            <svg
              viewBox={"0 0 24 24"}
              fill={"none"}
              stroke={"currentColor"}
              strokeWidth={"1.8"}
              strokeLinejoin={"round"}
            >
              <path
                d={
                  "M12 1.5c.9 5.6 4.8 9.5 10.5 10.5-5.7 1-9.6 4.9-10.5 10.5C11.1 16.9 7.2 13 1.5 12 7.2 11 11.1 7.1 12 1.5z"
                }
              ></path>
            </svg>
          </span>
          <span
            className={"di c1"}
            style={
              {
                left: "84%",
                top: "34%",
                width: "20px",
                height: "20px",
                "--r": "0deg",
                "--dd": "3.62s",
                "--dl": "-2.4s",
              } as CSSProperties
            }
          >
            <svg
              viewBox={"0 0 24 24"}
              fill={"none"}
              stroke={"currentColor"}
              strokeWidth={"1.8"}
              strokeLinejoin={"round"}
            >
              <path
                d={
                  "M12 1.5c.9 5.6 4.8 9.5 10.5 10.5-5.7 1-9.6 4.9-10.5 10.5C11.1 16.9 7.2 13 1.5 12 7.2 11 11.1 7.1 12 1.5z"
                }
              ></path>
            </svg>
          </span>
          <span
            className={"di c1"}
            style={
              {
                left: "12%",
                top: "88%",
                width: "30px",
                height: "30px",
                "--r": "0deg",
                "--dd": "3.99s",
                "--dl": "-0.3s",
              } as CSSProperties
            }
          >
            <svg
              viewBox={"0 0 24 24"}
              fill={"none"}
              stroke={"currentColor"}
              strokeWidth={"1.8"}
              strokeLinejoin={"round"}
            >
              <path
                d={
                  "M12 1.5c.9 5.6 4.8 9.5 10.5 10.5-5.7 1-9.6 4.9-10.5 10.5C11.1 16.9 7.2 13 1.5 12 7.2 11 11.1 7.1 12 1.5z"
                }
              ></path>
            </svg>
          </span>
          <span
            className={"di c2"}
            style={
              {
                left: "70%",
                top: "4%",
                width: "30px",
                height: "30px",
                "--r": "10deg",
                "--dd": "4.36s",
                "--dl": "-1.2s",
              } as CSSProperties
            }
          >
            <svg
              viewBox={"0 0 30 30"}
              fill={"none"}
              stroke={"currentColor"}
              strokeWidth={"3.6"}
              strokeLinecap={"round"}
            >
              <path d={"M4 12 11 16M9 4l6 9M20 3l-1 10"}></path>
            </svg>
          </span>
          <span
            className={"di c2"}
            style={
              {
                left: "3%",
                top: "39%",
                width: "26px",
                height: "26px",
                "--r": "-30deg",
                "--dd": "3.13s",
                "--dl": "-2.1s",
              } as CSSProperties
            }
          >
            <svg
              viewBox={"0 0 30 30"}
              fill={"none"}
              stroke={"currentColor"}
              strokeWidth={"3.6"}
              strokeLinecap={"round"}
            >
              <path d={"M4 12 11 16M9 4l6 9M20 3l-1 10"}></path>
            </svg>
          </span>
          <span
            className={"di c1"}
            style={
              {
                left: "90%",
                top: "82%",
                width: "20px",
                height: "20px",
                "--r": "10deg",
                "--dd": "3.50s",
                "--dl": "0s",
              } as CSSProperties
            }
          >
            <svg viewBox={"0 0 24 22"} fill={"currentColor"}>
              <path
                d={
                  "M12 21s-8.6-5.1-10.7-10.3C-.3 6.6 2.2 1.5 6.6 1.5c2.4 0 4 1.2 5.4 3.2 1.4-2 3-3.2 5.4-3.2 4.4 0 6.9 5.1 5.3 9.2C20.6 15.9 12 21 12 21z"
                }
              ></path>
            </svg>
          </span>
        </div>
        <div className={"art a2"}>
          <div className={"frame"}>
            <img
              className={"raw"}
              src={"/tienda/michel-wildflower.jpg"}
              alt={""}
            />
            <img
              className={"pro"}
              src={"/tienda/michel-wildflower.jpg"}
              alt={""}
            />
            <span className={"wipe"}></span>
          </div>
          <span
            className={"spark"}
            style={{ left: "6px", top: "30px" } as CSSProperties}
          >
            <svg viewBox={"0 0 24 24"} aria-hidden={"true"} fill={"#FFF9EE"}>
              <path
                d={"M12 0l2.6 9.4L24 12l-9.4 2.6L12 24l-2.6-9.4L0 12l9.4-2.6z"}
              ></path>
            </svg>
          </span>
          <span
            className={"spark s2"}
            style={{ right: "4px", top: "90px" } as CSSProperties}
          >
            <svg viewBox={"0 0 24 24"} aria-hidden={"true"} fill={"#FFF9EE"}>
              <path
                d={"M12 0l2.6 9.4L24 12l-9.4 2.6L12 24l-2.6-9.4L0 12l9.4-2.6z"}
              ></path>
            </svg>
          </span>
          <span
            className={"spark s3"}
            style={{ left: "30px", bottom: "10px" } as CSSProperties}
          >
            <svg viewBox={"0 0 24 24"} aria-hidden={"true"} fill={"#FFF9EE"}>
              <path
                d={"M12 0l2.6 9.4L24 12l-9.4 2.6L12 24l-2.6-9.4L0 12l9.4-2.6z"}
              ></path>
            </svg>
          </span>
        </div>
        <h3>
          {"Nosotros las ponemos "}
          <em>{"a brillar."}</em>
        </h3>
        <p>
          {
            "Retocamos cada foto y escribimos los textos. El producto es la estrella; nosotros, las luces."
          }
        </p>
      </section>
    );
  if (indice === 2)
    return (
      <section className={"slide on"} data-bg={"crema"}>
        <div className={"deco"} aria-hidden={"true"}>
          <div className={"dband"}>
            <div className={"dcol"}>
              <svg
                viewBox={"0 0 24 24"}
                fill={"none"}
                stroke={"currentColor"}
                strokeWidth={"4.2"}
                strokeLinecap={"round"}
                strokeLinejoin={"round"}
              >
                <path d={"M5 19 18 6M8.5 5.5H18.5V15.5"}></path>
              </svg>
              <svg
                viewBox={"0 0 24 24"}
                fill={"none"}
                stroke={"currentColor"}
                strokeWidth={"4.2"}
                strokeLinecap={"round"}
                strokeLinejoin={"round"}
              >
                <path d={"M5 19 18 6M8.5 5.5H18.5V15.5"}></path>
              </svg>
              <svg
                viewBox={"0 0 24 24"}
                fill={"none"}
                stroke={"currentColor"}
                strokeWidth={"4.2"}
                strokeLinecap={"round"}
                strokeLinejoin={"round"}
              >
                <path d={"M5 19 18 6M8.5 5.5H18.5V15.5"}></path>
              </svg>
              <svg
                viewBox={"0 0 24 24"}
                fill={"none"}
                stroke={"currentColor"}
                strokeWidth={"4.2"}
                strokeLinecap={"round"}
                strokeLinejoin={"round"}
              >
                <path d={"M5 19 18 6M8.5 5.5H18.5V15.5"}></path>
              </svg>
              <svg
                viewBox={"0 0 24 24"}
                fill={"none"}
                stroke={"currentColor"}
                strokeWidth={"4.2"}
                strokeLinecap={"round"}
                strokeLinejoin={"round"}
              >
                <path d={"M5 19 18 6M8.5 5.5H18.5V15.5"}></path>
              </svg>
              <svg
                viewBox={"0 0 24 24"}
                fill={"none"}
                stroke={"currentColor"}
                strokeWidth={"4.2"}
                strokeLinecap={"round"}
                strokeLinejoin={"round"}
              >
                <path d={"M5 19 18 6M8.5 5.5H18.5V15.5"}></path>
              </svg>
              <svg
                viewBox={"0 0 24 24"}
                fill={"none"}
                stroke={"currentColor"}
                strokeWidth={"4.2"}
                strokeLinecap={"round"}
                strokeLinejoin={"round"}
              >
                <path d={"M5 19 18 6M8.5 5.5H18.5V15.5"}></path>
              </svg>
              <svg
                viewBox={"0 0 24 24"}
                fill={"none"}
                stroke={"currentColor"}
                strokeWidth={"4.2"}
                strokeLinecap={"round"}
                strokeLinejoin={"round"}
              >
                <path d={"M5 19 18 6M8.5 5.5H18.5V15.5"}></path>
              </svg>
              <svg
                viewBox={"0 0 24 24"}
                fill={"none"}
                stroke={"currentColor"}
                strokeWidth={"4.2"}
                strokeLinecap={"round"}
                strokeLinejoin={"round"}
              >
                <path d={"M5 19 18 6M8.5 5.5H18.5V15.5"}></path>
              </svg>
              <svg
                viewBox={"0 0 24 24"}
                fill={"none"}
                stroke={"currentColor"}
                strokeWidth={"4.2"}
                strokeLinecap={"round"}
                strokeLinejoin={"round"}
              >
                <path d={"M5 19 18 6M8.5 5.5H18.5V15.5"}></path>
              </svg>
              <svg
                viewBox={"0 0 24 24"}
                fill={"none"}
                stroke={"currentColor"}
                strokeWidth={"4.2"}
                strokeLinecap={"round"}
                strokeLinejoin={"round"}
              >
                <path d={"M5 19 18 6M8.5 5.5H18.5V15.5"}></path>
              </svg>
              <svg
                viewBox={"0 0 24 24"}
                fill={"none"}
                stroke={"currentColor"}
                strokeWidth={"4.2"}
                strokeLinecap={"round"}
                strokeLinejoin={"round"}
              >
                <path d={"M5 19 18 6M8.5 5.5H18.5V15.5"}></path>
              </svg>
              <svg
                viewBox={"0 0 24 24"}
                fill={"none"}
                stroke={"currentColor"}
                strokeWidth={"4.2"}
                strokeLinecap={"round"}
                strokeLinejoin={"round"}
              >
                <path d={"M5 19 18 6M8.5 5.5H18.5V15.5"}></path>
              </svg>
              <svg
                viewBox={"0 0 24 24"}
                fill={"none"}
                stroke={"currentColor"}
                strokeWidth={"4.2"}
                strokeLinecap={"round"}
                strokeLinejoin={"round"}
              >
                <path d={"M5 19 18 6M8.5 5.5H18.5V15.5"}></path>
              </svg>
              <svg
                viewBox={"0 0 24 24"}
                fill={"none"}
                stroke={"currentColor"}
                strokeWidth={"4.2"}
                strokeLinecap={"round"}
                strokeLinejoin={"round"}
              >
                <path d={"M5 19 18 6M8.5 5.5H18.5V15.5"}></path>
              </svg>
              <svg
                viewBox={"0 0 24 24"}
                fill={"none"}
                stroke={"currentColor"}
                strokeWidth={"4.2"}
                strokeLinecap={"round"}
                strokeLinejoin={"round"}
              >
                <path d={"M5 19 18 6M8.5 5.5H18.5V15.5"}></path>
              </svg>
              <svg
                viewBox={"0 0 24 24"}
                fill={"none"}
                stroke={"currentColor"}
                strokeWidth={"4.2"}
                strokeLinecap={"round"}
                strokeLinejoin={"round"}
              >
                <path d={"M5 19 18 6M8.5 5.5H18.5V15.5"}></path>
              </svg>
              <svg
                viewBox={"0 0 24 24"}
                fill={"none"}
                stroke={"currentColor"}
                strokeWidth={"4.2"}
                strokeLinecap={"round"}
                strokeLinejoin={"round"}
              >
                <path d={"M5 19 18 6M8.5 5.5H18.5V15.5"}></path>
              </svg>
              <svg
                viewBox={"0 0 24 24"}
                fill={"none"}
                stroke={"currentColor"}
                strokeWidth={"4.2"}
                strokeLinecap={"round"}
                strokeLinejoin={"round"}
              >
                <path d={"M5 19 18 6M8.5 5.5H18.5V15.5"}></path>
              </svg>
              <svg
                viewBox={"0 0 24 24"}
                fill={"none"}
                stroke={"currentColor"}
                strokeWidth={"4.2"}
                strokeLinecap={"round"}
                strokeLinejoin={"round"}
              >
                <path d={"M5 19 18 6M8.5 5.5H18.5V15.5"}></path>
              </svg>
              <svg
                viewBox={"0 0 24 24"}
                fill={"none"}
                stroke={"currentColor"}
                strokeWidth={"4.2"}
                strokeLinecap={"round"}
                strokeLinejoin={"round"}
              >
                <path d={"M5 19 18 6M8.5 5.5H18.5V15.5"}></path>
              </svg>
              <svg
                viewBox={"0 0 24 24"}
                fill={"none"}
                stroke={"currentColor"}
                strokeWidth={"4.2"}
                strokeLinecap={"round"}
                strokeLinejoin={"round"}
              >
                <path d={"M5 19 18 6M8.5 5.5H18.5V15.5"}></path>
              </svg>
              <svg
                viewBox={"0 0 24 24"}
                fill={"none"}
                stroke={"currentColor"}
                strokeWidth={"4.2"}
                strokeLinecap={"round"}
                strokeLinejoin={"round"}
              >
                <path d={"M5 19 18 6M8.5 5.5H18.5V15.5"}></path>
              </svg>
              <svg
                viewBox={"0 0 24 24"}
                fill={"none"}
                stroke={"currentColor"}
                strokeWidth={"4.2"}
                strokeLinecap={"round"}
                strokeLinejoin={"round"}
              >
                <path d={"M5 19 18 6M8.5 5.5H18.5V15.5"}></path>
              </svg>
              <svg
                viewBox={"0 0 24 24"}
                fill={"none"}
                stroke={"currentColor"}
                strokeWidth={"4.2"}
                strokeLinecap={"round"}
                strokeLinejoin={"round"}
              >
                <path d={"M5 19 18 6M8.5 5.5H18.5V15.5"}></path>
              </svg>
              <svg
                viewBox={"0 0 24 24"}
                fill={"none"}
                stroke={"currentColor"}
                strokeWidth={"4.2"}
                strokeLinecap={"round"}
                strokeLinejoin={"round"}
              >
                <path d={"M5 19 18 6M8.5 5.5H18.5V15.5"}></path>
              </svg>
            </div>
          </div>
          <span
            className={"di c2"}
            style={
              {
                left: "6%",
                top: "9%",
                width: "26px",
                height: "26px",
                "--r": "-10deg",
                "--dd": "3.00s",
                "--dl": "0s",
              } as CSSProperties
            }
          >
            <svg viewBox={"0 0 24 22"} fill={"currentColor"}>
              <path
                d={
                  "M12 21s-8.6-5.1-10.7-10.3C-.3 6.6 2.2 1.5 6.6 1.5c2.4 0 4 1.2 5.4 3.2 1.4-2 3-3.2 5.4-3.2 4.4 0 6.9 5.1 5.3 9.2C20.6 15.9 12 21 12 21z"
                }
              ></path>
            </svg>
          </span>
          <span
            className={"di c1"}
            style={
              {
                left: "3%",
                top: "40%",
                width: "28px",
                height: "28px",
                "--r": "-8deg",
                "--dd": "3.37s",
                "--dl": "-0.9s",
              } as CSSProperties
            }
          >
            <svg
              viewBox={"0 0 24 22"}
              fill={"none"}
              stroke={"currentColor"}
              strokeWidth={"2.4"}
              strokeLinejoin={"round"}
            >
              <path
                d={
                  "M12 20s-8.2-4.9-10.2-9.8C.3 6.4 2.6 2.2 6.6 2.2c2.3 0 3.9 1.2 5.4 3.2 1.5-2 3.1-3.2 5.4-3.2 4 0 6.3 4.2 4.8 8C20.2 15.1 12 20 12 20z"
                }
              ></path>
            </svg>
          </span>
          <span
            className={"di c2"}
            style={
              {
                left: "10%",
                top: "70%",
                width: "22px",
                height: "22px",
                "--r": "0deg",
                "--dd": "3.74s",
                "--dl": "-1.8s",
              } as CSSProperties
            }
          >
            <svg viewBox={"0 0 24 24"} fill={"currentColor"}>
              <path
                d={
                  "M12 0c.9 6.2 5.1 10.9 12 12-6.9 1.1-11.1 5.8-12 12-.9-6.2-5.1-10.9-12-12 6.9-1.1 11.1-5.8 12-12z"
                }
              ></path>
            </svg>
          </span>
          <span
            className={"di c2"}
            style={
              {
                left: "14%",
                top: "91%",
                width: "26px",
                height: "26px",
                "--r": "0deg",
                "--dd": "4.11s",
                "--dl": "-2.7s",
              } as CSSProperties
            }
          >
            <svg
              viewBox={"0 0 24 24"}
              fill={"none"}
              stroke={"currentColor"}
              strokeWidth={"1.8"}
              strokeLinejoin={"round"}
            >
              <path
                d={
                  "M12 1.5c.9 5.6 4.8 9.5 10.5 10.5-5.7 1-9.6 4.9-10.5 10.5C11.1 16.9 7.2 13 1.5 12 7.2 11 11.1 7.1 12 1.5z"
                }
              ></path>
            </svg>
          </span>
          <span
            className={"di c2"}
            style={
              {
                left: "60%",
                top: "3%",
                width: "20px",
                height: "20px",
                "--r": "0deg",
                "--dd": "4.48s",
                "--dl": "-0.6s",
              } as CSSProperties
            }
          >
            <svg viewBox={"0 0 24 24"} fill={"currentColor"}>
              <path
                d={
                  "M12 0c.9 6.2 5.1 10.9 12 12-6.9 1.1-11.1 5.8-12 12-.9-6.2-5.1-10.9-12-12 6.9-1.1 11.1-5.8 12-12z"
                }
              ></path>
            </svg>
          </span>
          <span
            className={"di c2"}
            style={
              {
                left: "5%",
                top: "24%",
                width: "24px",
                height: "24px",
                "--r": "-20deg",
                "--dd": "3.25s",
                "--dl": "-1.5s",
              } as CSSProperties
            }
          >
            <svg
              viewBox={"0 0 30 30"}
              fill={"none"}
              stroke={"currentColor"}
              strokeWidth={"3.6"}
              strokeLinecap={"round"}
            >
              <path d={"M4 12 11 16M9 4l6 9M20 3l-1 10"}></path>
            </svg>
          </span>
        </div>
        <div className={"art a3"}>
          <div className={"phone"}>
            <div className={"stack"}>
              <img src={"/tienda/michel-majestic.jpg"} alt={""} />
              <img src={"/tienda/michel-zakat.jpg"} alt={""} />
            </div>
            <div className={"bigheart"}>
              <svg
                viewBox={"0 0 24 24"}
                aria-hidden={"true"}
                fill={"currentColor"}
              >
                <path
                  d={
                    "M12 20.3s-7.3-4.4-9.2-8.9C1.3 7.9 3.4 4.6 6.8 4.6c2.1 0 3.5 1.1 5.2 3 1.7-1.9 3.1-3 5.2-3 3.4 0 5.5 3.3 4 6.8-1.9 4.5-9.2 8.9-9.2 8.9z"
                  }
                ></path>
              </svg>
            </div>
          </div>
          <div className={"finger"}></div>
        </div>
        <h3>
          {"Deslizan… "}
          <em>{"aaah."}</em>
        </h3>
        <p>
          {
            "Como en sus reels. Tus clientes llevan años practicando sin saberlo."
          }
        </p>
        <p className={"snote"}>
          {"dale al corazón, no a la captura de pantalla"}
        </p>
      </section>
    );
  if (indice === 3)
    return (
      <section className={"slide on"} data-bg={"verde"}>
        <div className={"deco"} aria-hidden={"true"}>
          <span
            className={"di c1"}
            style={
              {
                left: "3%",
                top: "4%",
                width: "46px",
                height: "46px",
                "--r": "-8deg",
                "--dd": "3.00s",
                "--dl": "0s",
              } as CSSProperties
            }
          >
            <svg
              viewBox={"0 0 48 44"}
              fill={"none"}
              stroke={"currentColor"}
              strokeWidth={"4"}
              strokeLinejoin={"round"}
            >
              <path
                d={
                  "M9 4h30a7 7 0 0 1 7 7v14a7 7 0 0 1-7 7H22l-10 9 1-9H9a7 7 0 0 1-7-7V11a7 7 0 0 1 7-7z"
                }
              ></path>
            </svg>
          </span>
          <span
            className={"di c1"}
            style={
              {
                left: "78%",
                top: "5%",
                width: "48px",
                height: "48px",
                "--r": "10deg",
                "--dd": "3.37s",
                "--dl": "-0.9s",
              } as CSSProperties
            }
          >
            <svg
              viewBox={"0 0 48 44"}
              fill={"none"}
              stroke={"currentColor"}
              strokeWidth={"4"}
              strokeLinejoin={"round"}
            >
              <path
                d={
                  "M9 4h30a7 7 0 0 1 7 7v14a7 7 0 0 1-7 7H22l-10 9 1-9H9a7 7 0 0 1-7-7V11a7 7 0 0 1 7-7z"
                }
              ></path>
            </svg>
          </span>
          <span
            className={"di c1"}
            style={
              {
                left: "1%",
                top: "43%",
                width: "40px",
                height: "40px",
                "--r": "-12deg",
                "--dd": "3.74s",
                "--dl": "-1.8s",
              } as CSSProperties
            }
          >
            <svg
              viewBox={"0 0 48 44"}
              fill={"none"}
              stroke={"currentColor"}
              strokeWidth={"4"}
              strokeLinejoin={"round"}
            >
              <path
                d={
                  "M9 4h30a7 7 0 0 1 7 7v14a7 7 0 0 1-7 7H22l-10 9 1-9H9a7 7 0 0 1-7-7V11a7 7 0 0 1 7-7z"
                }
              ></path>
            </svg>
          </span>
          <span
            className={"di c1"}
            style={
              {
                left: "85%",
                top: "36%",
                width: "46px",
                height: "46px",
                "--r": "8deg",
                "--dd": "4.11s",
                "--dl": "-2.7s",
              } as CSSProperties
            }
          >
            <svg
              viewBox={"0 0 48 44"}
              fill={"none"}
              stroke={"currentColor"}
              strokeWidth={"4"}
              strokeLinejoin={"round"}
            >
              <path
                d={
                  "M9 4h30a7 7 0 0 1 7 7v14a7 7 0 0 1-7 7H22l-10 9 1-9H9a7 7 0 0 1-7-7V11a7 7 0 0 1 7-7z"
                }
              ></path>
            </svg>
          </span>
          <span
            className={"di c1"}
            style={
              {
                left: "5%",
                top: "86%",
                width: "44px",
                height: "44px",
                "--r": "6deg",
                "--dd": "4.48s",
                "--dl": "-0.6s",
              } as CSSProperties
            }
          >
            <svg
              viewBox={"0 0 48 44"}
              fill={"none"}
              stroke={"currentColor"}
              strokeWidth={"4"}
              strokeLinejoin={"round"}
            >
              <path
                d={
                  "M9 4h30a7 7 0 0 1 7 7v14a7 7 0 0 1-7 7H22l-10 9 1-9H9a7 7 0 0 1-7-7V11a7 7 0 0 1 7-7z"
                }
              ></path>
            </svg>
          </span>
          <span
            className={"di c1"}
            style={
              {
                left: "76%",
                top: "92%",
                width: "50px",
                height: "50px",
                "--r": "-6deg",
                "--dd": "3.25s",
                "--dl": "-1.5s",
              } as CSSProperties
            }
          >
            <svg
              viewBox={"0 0 48 44"}
              fill={"none"}
              stroke={"currentColor"}
              strokeWidth={"4"}
              strokeLinejoin={"round"}
            >
              <path
                d={
                  "M9 4h30a7 7 0 0 1 7 7v14a7 7 0 0 1-7 7H22l-10 9 1-9H9a7 7 0 0 1-7-7V11a7 7 0 0 1 7-7z"
                }
              ></path>
            </svg>
          </span>
          <span
            className={"di c2"}
            style={
              {
                left: "78%",
                top: "17%",
                width: "28px",
                height: "28px",
                "--r": "12deg",
                "--dd": "3.62s",
                "--dl": "-2.4s",
              } as CSSProperties
            }
          >
            <svg viewBox={"0 0 24 22"} fill={"currentColor"}>
              <path
                d={
                  "M12 21s-8.6-5.1-10.7-10.3C-.3 6.6 2.2 1.5 6.6 1.5c2.4 0 4 1.2 5.4 3.2 1.4-2 3-3.2 5.4-3.2 4.4 0 6.9 5.1 5.3 9.2C20.6 15.9 12 21 12 21z"
                }
              ></path>
            </svg>
          </span>
          <span
            className={"di c2"}
            style={
              {
                left: "13%",
                top: "25%",
                width: "20px",
                height: "20px",
                "--r": "-10deg",
                "--dd": "3.99s",
                "--dl": "-0.3s",
              } as CSSProperties
            }
          >
            <svg viewBox={"0 0 24 22"} fill={"currentColor"}>
              <path
                d={
                  "M12 21s-8.6-5.1-10.7-10.3C-.3 6.6 2.2 1.5 6.6 1.5c2.4 0 4 1.2 5.4 3.2 1.4-2 3-3.2 5.4-3.2 4.4 0 6.9 5.1 5.3 9.2C20.6 15.9 12 21 12 21z"
                }
              ></path>
            </svg>
          </span>
          <span
            className={"di c2"}
            style={
              {
                left: "68%",
                top: "3%",
                width: "22px",
                height: "22px",
                "--r": "0deg",
                "--dd": "4.36s",
                "--dl": "-1.2s",
              } as CSSProperties
            }
          >
            <svg viewBox={"0 0 24 24"} fill={"currentColor"}>
              <path
                d={
                  "M12 0c.9 6.2 5.1 10.9 12 12-6.9 1.1-11.1 5.8-12 12-.9-6.2-5.1-10.9-12-12 6.9-1.1 11.1-5.8 12-12z"
                }
              ></path>
            </svg>
          </span>
          <span
            className={"di c2"}
            style={
              {
                left: "92%",
                top: "79%",
                width: "24px",
                height: "24px",
                "--r": "0deg",
                "--dd": "3.13s",
                "--dl": "-2.1s",
              } as CSSProperties
            }
          >
            <svg viewBox={"0 0 24 24"} fill={"currentColor"}>
              <path
                d={
                  "M12 0c.9 6.2 5.1 10.9 12 12-6.9 1.1-11.1 5.8-12 12-.9-6.2-5.1-10.9-12-12 6.9-1.1 11.1-5.8 12-12z"
                }
              ></path>
            </svg>
          </span>
          <span
            className={"di c2"}
            style={
              {
                left: "5%",
                top: "74%",
                width: "18px",
                height: "18px",
                "--r": "0deg",
                "--dd": "3.50s",
                "--dl": "0s",
              } as CSSProperties
            }
          >
            <svg viewBox={"0 0 24 24"} fill={"currentColor"}>
              <path
                d={
                  "M12 0c.9 6.2 5.1 10.9 12 12-6.9 1.1-11.1 5.8-12 12-.9-6.2-5.1-10.9-12-12 6.9-1.1 11.1-5.8 12-12z"
                }
              ></path>
            </svg>
          </span>
          <span
            className={"di c2"}
            style={
              {
                left: "58%",
                top: "90%",
                width: "26px",
                height: "26px",
                "--r": "20deg",
                "--dd": "3.87s",
                "--dl": "-0.9s",
              } as CSSProperties
            }
          >
            <svg
              viewBox={"0 0 30 30"}
              fill={"none"}
              stroke={"currentColor"}
              strokeWidth={"3.6"}
              strokeLinecap={"round"}
            >
              <path d={"M4 12 11 16M9 4l6 9M20 3l-1 10"}></path>
            </svg>
          </span>
        </div>
        <div className={"art a4"}>
          <div className={"wabig"}>
            <svg
              viewBox={"0 0 24 24"}
              aria-hidden={"true"}
              fill={"currentColor"}
            >
              <path
                d={
                  "M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.1l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.8 11.9 11.9 0 0 0 4.6 4c1.7.7 2.3.8 3.2.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.2-.2-.5-.3z"
                }
              ></path>
            </svg>
          </div>
          <div className={"plane"}>
            <svg
              viewBox={"0 0 24 24"}
              aria-hidden={"true"}
              fill={"none"}
              stroke={"currentColor"}
              strokeWidth={"1.9"}
              strokeLinejoin={"round"}
            >
              <path
                d={"M21.5 3 9.9 11.3M21.5 3l-6.8 18.1-4.8-9.8L3 7.4z"}
              ></path>
            </svg>
          </div>
          <div className={"bub"}>
            <b>{"Nuevo pedido"}</b>
            {"¡Hola! Vi tu catálogo y quiero:"}
            <br />
            {"• Wild Flower Gold (RD$1,100)"}
            <br />
            {"• Shé (RD$1,200)"}
            <span className={"tick"}>{"✓✓"}</span>
          </div>
        </div>
        <h3 className={"igt"}>
          {"Del suspiro "}
          <em>{"al chat."}</em>
        </h3>
        <p>
          {
            "El pedido te llega por WhatsApp con todo listo. Sin formularios ni contraseñas."
          }
        </p>
      </section>
    );
  if (indice === 4)
    return (
      <section className={"slide on"} data-bg={"rosa"}>
        <div className={"deco"} aria-hidden={"true"}>
          <span
            className={"di c2"}
            style={
              {
                left: "8%",
                top: "6%",
                width: "32px",
                height: "32px",
                "--r": "0deg",
                "--dd": "3.00s",
                "--dl": "0s",
              } as CSSProperties
            }
          >
            <svg viewBox={"0 0 24 24"} fill={"currentColor"}>
              <path
                d={
                  "M12 0c.9 6.2 5.1 10.9 12 12-6.9 1.1-11.1 5.8-12 12-.9-6.2-5.1-10.9-12-12 6.9-1.1 11.1-5.8 12-12z"
                }
              ></path>
            </svg>
          </span>
          <span
            className={"di c2"}
            style={
              {
                left: "85%",
                top: "12%",
                width: "24px",
                height: "24px",
                "--r": "0deg",
                "--dd": "3.37s",
                "--dl": "-0.9s",
              } as CSSProperties
            }
          >
            <svg viewBox={"0 0 24 24"} fill={"currentColor"}>
              <path
                d={
                  "M12 0c.9 6.2 5.1 10.9 12 12-6.9 1.1-11.1 5.8-12 12-.9-6.2-5.1-10.9-12-12 6.9-1.1 11.1-5.8 12-12z"
                }
              ></path>
            </svg>
          </span>
          <span
            className={"di c2"}
            style={
              {
                left: "90%",
                top: "49%",
                width: "30px",
                height: "30px",
                "--r": "0deg",
                "--dd": "3.74s",
                "--dl": "-1.8s",
              } as CSSProperties
            }
          >
            <svg viewBox={"0 0 24 24"} fill={"currentColor"}>
              <path
                d={
                  "M12 0c.9 6.2 5.1 10.9 12 12-6.9 1.1-11.1 5.8-12 12-.9-6.2-5.1-10.9-12-12 6.9-1.1 11.1-5.8 12-12z"
                }
              ></path>
            </svg>
          </span>
          <span
            className={"di c2"}
            style={
              {
                left: "3%",
                top: "75%",
                width: "22px",
                height: "22px",
                "--r": "0deg",
                "--dd": "4.11s",
                "--dl": "-2.7s",
              } as CSSProperties
            }
          >
            <svg viewBox={"0 0 24 24"} fill={"currentColor"}>
              <path
                d={
                  "M12 0c.9 6.2 5.1 10.9 12 12-6.9 1.1-11.1 5.8-12 12-.9-6.2-5.1-10.9-12-12 6.9-1.1 11.1-5.8 12-12z"
                }
              ></path>
            </svg>
          </span>
          <span
            className={"di c2"}
            style={
              {
                left: "75%",
                top: "90%",
                width: "20px",
                height: "20px",
                "--r": "0deg",
                "--dd": "4.48s",
                "--dl": "-0.6s",
              } as CSSProperties
            }
          >
            <svg viewBox={"0 0 24 24"} fill={"currentColor"}>
              <path
                d={
                  "M12 0c.9 6.2 5.1 10.9 12 12-6.9 1.1-11.1 5.8-12 12-.9-6.2-5.1-10.9-12-12 6.9-1.1 11.1-5.8 12-12z"
                }
              ></path>
            </svg>
          </span>
          <span
            className={"di c1"}
            style={
              {
                left: "14%",
                top: "29%",
                width: "28px",
                height: "28px",
                "--r": "0deg",
                "--dd": "3.25s",
                "--dl": "-1.5s",
              } as CSSProperties
            }
          >
            <svg
              viewBox={"0 0 24 24"}
              fill={"none"}
              stroke={"currentColor"}
              strokeWidth={"1.8"}
              strokeLinejoin={"round"}
            >
              <path
                d={
                  "M12 1.5c.9 5.6 4.8 9.5 10.5 10.5-5.7 1-9.6 4.9-10.5 10.5C11.1 16.9 7.2 13 1.5 12 7.2 11 11.1 7.1 12 1.5z"
                }
              ></path>
            </svg>
          </span>
          <span
            className={"di c1"}
            style={
              {
                left: "84%",
                top: "34%",
                width: "20px",
                height: "20px",
                "--r": "0deg",
                "--dd": "3.62s",
                "--dl": "-2.4s",
              } as CSSProperties
            }
          >
            <svg
              viewBox={"0 0 24 24"}
              fill={"none"}
              stroke={"currentColor"}
              strokeWidth={"1.8"}
              strokeLinejoin={"round"}
            >
              <path
                d={
                  "M12 1.5c.9 5.6 4.8 9.5 10.5 10.5-5.7 1-9.6 4.9-10.5 10.5C11.1 16.9 7.2 13 1.5 12 7.2 11 11.1 7.1 12 1.5z"
                }
              ></path>
            </svg>
          </span>
          <span
            className={"di c1"}
            style={
              {
                left: "12%",
                top: "88%",
                width: "30px",
                height: "30px",
                "--r": "0deg",
                "--dd": "3.99s",
                "--dl": "-0.3s",
              } as CSSProperties
            }
          >
            <svg
              viewBox={"0 0 24 24"}
              fill={"none"}
              stroke={"currentColor"}
              strokeWidth={"1.8"}
              strokeLinejoin={"round"}
            >
              <path
                d={
                  "M12 1.5c.9 5.6 4.8 9.5 10.5 10.5-5.7 1-9.6 4.9-10.5 10.5C11.1 16.9 7.2 13 1.5 12 7.2 11 11.1 7.1 12 1.5z"
                }
              ></path>
            </svg>
          </span>
          <span
            className={"di c2"}
            style={
              {
                left: "70%",
                top: "4%",
                width: "30px",
                height: "30px",
                "--r": "10deg",
                "--dd": "4.36s",
                "--dl": "-1.2s",
              } as CSSProperties
            }
          >
            <svg
              viewBox={"0 0 30 30"}
              fill={"none"}
              stroke={"currentColor"}
              strokeWidth={"3.6"}
              strokeLinecap={"round"}
            >
              <path d={"M4 12 11 16M9 4l6 9M20 3l-1 10"}></path>
            </svg>
          </span>
          <span
            className={"di c2"}
            style={
              {
                left: "3%",
                top: "39%",
                width: "26px",
                height: "26px",
                "--r": "-30deg",
                "--dd": "3.13s",
                "--dl": "-2.1s",
              } as CSSProperties
            }
          >
            <svg
              viewBox={"0 0 30 30"}
              fill={"none"}
              stroke={"currentColor"}
              strokeWidth={"3.6"}
              strokeLinecap={"round"}
            >
              <path d={"M4 12 11 16M9 4l6 9M20 3l-1 10"}></path>
            </svg>
          </span>
          <span
            className={"di c1"}
            style={
              {
                left: "90%",
                top: "82%",
                width: "20px",
                height: "20px",
                "--r": "10deg",
                "--dd": "3.50s",
                "--dl": "0s",
              } as CSSProperties
            }
          >
            <svg viewBox={"0 0 24 22"} fill={"currentColor"}>
              <path
                d={
                  "M12 21s-8.6-5.1-10.7-10.3C-.3 6.6 2.2 1.5 6.6 1.5c2.4 0 4 1.2 5.4 3.2 1.4-2 3-3.2 5.4-3.2 4.4 0 6.9 5.1 5.3 9.2C20.6 15.9 12 21 12 21z"
                }
              ></path>
            </svg>
          </span>
        </div>
        <div className={"art a7"}>
          <span className={"lnk"}>
            <i className={"dot"}></i>
            {"Pedido en vivo · 24 h"}
          </span>
          <div className={"rcpt"}>
            <b>{"Pedido #JPAZK"}</b>
            <i></i>
            <i></i>
            <i className={"s"}></i>
            <em>{"RD$6,200"}</em>
          </div>
          <span className={"dl d1"}>
            <svg
              viewBox={"0 0 24 24"}
              fill={"none"}
              stroke={"currentColor"}
              strokeWidth={"2"}
              strokeLinecap={"round"}
              strokeLinejoin={"round"}
              aria-hidden={"true"}
            >
              <rect
                x={"3.5"}
                y={"4.5"}
                width={"17"}
                height={"15"}
                rx={"2.5"}
              ></rect>
              <circle cx={"9"} cy={"10"} r={"1.6"}></circle>
              <path d={"M20.5 16l-5-5-8 8"}></path>
            </svg>
          </span>
          <span className={"dl d2"}>
            <svg
              viewBox={"0 0 24 24"}
              fill={"none"}
              stroke={"currentColor"}
              strokeWidth={"2"}
              strokeLinecap={"round"}
              strokeLinejoin={"round"}
              aria-hidden={"true"}
            >
              <path
                d={
                  "M14 3.5H7a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8.5z"
                }
              ></path>
              <path d={"M14 3.5v5h5"}></path>
              <path d={"M9 13h6M9 16.5h4"}></path>
            </svg>
          </span>
        </div>
        <h3>
          {"Cada pedido, "}
          <em>{"en vivo."}</em>
        </h3>
        <p>
          {
            "Tú y tu cliente lo ven con fotos por 24 horas. El recibo se descarga solito."
          }
        </p>
      </section>
    );
  if (indice === 5)
    return (
      <section className={"slide on"} data-bg={"mandarina"}>
        <div className={"deco"} aria-hidden={"true"}>
          <span
            className={"di c2"}
            style={
              {
                left: "6%",
                top: "7%",
                width: "30px",
                height: "30px",
                "--r": "-12deg",
                "--dd": "3.00s",
                "--dl": "0s",
              } as CSSProperties
            }
          >
            <svg viewBox={"0 0 24 22"} fill={"currentColor"}>
              <path
                d={
                  "M12 21s-8.6-5.1-10.7-10.3C-.3 6.6 2.2 1.5 6.6 1.5c2.4 0 4 1.2 5.4 3.2 1.4-2 3-3.2 5.4-3.2 4.4 0 6.9 5.1 5.3 9.2C20.6 15.9 12 21 12 21z"
                }
              ></path>
            </svg>
          </span>
          <span
            className={"di c2"}
            style={
              {
                left: "88%",
                top: "81%",
                width: "32px",
                height: "32px",
                "--r": "10deg",
                "--dd": "3.37s",
                "--dl": "-0.9s",
              } as CSSProperties
            }
          >
            <svg viewBox={"0 0 24 22"} fill={"currentColor"}>
              <path
                d={
                  "M12 21s-8.6-5.1-10.7-10.3C-.3 6.6 2.2 1.5 6.6 1.5c2.4 0 4 1.2 5.4 3.2 1.4-2 3-3.2 5.4-3.2 4.4 0 6.9 5.1 5.3 9.2C20.6 15.9 12 21 12 21z"
                }
              ></path>
            </svg>
          </span>
          <span
            className={"di c2"}
            style={
              {
                left: "9%",
                top: "79%",
                width: "24px",
                height: "24px",
                "--r": "-6deg",
                "--dd": "3.74s",
                "--dl": "-1.8s",
              } as CSSProperties
            }
          >
            <svg viewBox={"0 0 24 22"} fill={"currentColor"}>
              <path
                d={
                  "M12 21s-8.6-5.1-10.7-10.3C-.3 6.6 2.2 1.5 6.6 1.5c2.4 0 4 1.2 5.4 3.2 1.4-2 3-3.2 5.4-3.2 4.4 0 6.9 5.1 5.3 9.2C20.6 15.9 12 21 12 21z"
                }
              ></path>
            </svg>
          </span>
          <span
            className={"di c1"}
            style={
              {
                left: "83%",
                top: "5%",
                width: "34px",
                height: "34px",
                "--r": "12deg",
                "--dd": "4.11s",
                "--dl": "-2.7s",
              } as CSSProperties
            }
          >
            <svg
              viewBox={"0 0 24 22"}
              fill={"none"}
              stroke={"currentColor"}
              strokeWidth={"2.4"}
              strokeLinejoin={"round"}
            >
              <path
                d={
                  "M12 20s-8.2-4.9-10.2-9.8C.3 6.4 2.6 2.2 6.6 2.2c2.3 0 3.9 1.2 5.4 3.2 1.5-2 3.1-3.2 5.4-3.2 4 0 6.3 4.2 4.8 8C20.2 15.1 12 20 12 20z"
                }
              ></path>
            </svg>
          </span>
          <span
            className={"di c1"}
            style={
              {
                left: "3%",
                top: "45%",
                width: "30px",
                height: "30px",
                "--r": "-10deg",
                "--dd": "4.48s",
                "--dl": "-0.6s",
              } as CSSProperties
            }
          >
            <svg
              viewBox={"0 0 24 22"}
              fill={"none"}
              stroke={"currentColor"}
              strokeWidth={"2.4"}
              strokeLinejoin={"round"}
            >
              <path
                d={
                  "M12 20s-8.2-4.9-10.2-9.8C.3 6.4 2.6 2.2 6.6 2.2c2.3 0 3.9 1.2 5.4 3.2 1.5-2 3.1-3.2 5.4-3.2 4 0 6.3 4.2 4.8 8C20.2 15.1 12 20 12 20z"
                }
              ></path>
            </svg>
          </span>
          <span
            className={"di c1"}
            style={
              {
                left: "89%",
                top: "40%",
                width: "22px",
                height: "22px",
                "--r": "8deg",
                "--dd": "3.25s",
                "--dl": "-1.5s",
              } as CSSProperties
            }
          >
            <svg
              viewBox={"0 0 24 22"}
              fill={"none"}
              stroke={"currentColor"}
              strokeWidth={"2.4"}
              strokeLinejoin={"round"}
            >
              <path
                d={
                  "M12 20s-8.2-4.9-10.2-9.8C.3 6.4 2.6 2.2 6.6 2.2c2.3 0 3.9 1.2 5.4 3.2 1.5-2 3.1-3.2 5.4-3.2 4 0 6.3 4.2 4.8 8C20.2 15.1 12 20 12 20z"
                }
              ></path>
            </svg>
          </span>
          <span
            className={"di c2"}
            style={
              {
                left: "68%",
                top: "3%",
                width: "24px",
                height: "24px",
                "--r": "0deg",
                "--dd": "3.62s",
                "--dl": "-2.4s",
              } as CSSProperties
            }
          >
            <svg viewBox={"0 0 24 24"} fill={"currentColor"}>
              <path
                d={
                  "M12 0c.9 6.2 5.1 10.9 12 12-6.9 1.1-11.1 5.8-12 12-.9-6.2-5.1-10.9-12-12 6.9-1.1 11.1-5.8 12-12z"
                }
              ></path>
            </svg>
          </span>
          <span
            className={"di c2"}
            style={
              {
                left: "16%",
                top: "31%",
                width: "18px",
                height: "18px",
                "--r": "0deg",
                "--dd": "3.99s",
                "--dl": "-0.3s",
              } as CSSProperties
            }
          >
            <svg viewBox={"0 0 24 24"} fill={"currentColor"}>
              <path
                d={
                  "M12 0c.9 6.2 5.1 10.9 12 12-6.9 1.1-11.1 5.8-12 12-.9-6.2-5.1-10.9-12-12 6.9-1.1 11.1-5.8 12-12z"
                }
              ></path>
            </svg>
          </span>
          <span
            className={"di c1"}
            style={
              {
                left: "79%",
                top: "89%",
                width: "28px",
                height: "28px",
                "--r": "0deg",
                "--dd": "4.36s",
                "--dl": "-1.2s",
              } as CSSProperties
            }
          >
            <svg
              viewBox={"0 0 24 24"}
              fill={"none"}
              stroke={"currentColor"}
              strokeWidth={"1.8"}
              strokeLinejoin={"round"}
            >
              <path
                d={
                  "M12 1.5c.9 5.6 4.8 9.5 10.5 10.5-5.7 1-9.6 4.9-10.5 10.5C11.1 16.9 7.2 13 1.5 12 7.2 11 11.1 7.1 12 1.5z"
                }
              ></path>
            </svg>
          </span>
          <span
            className={"di c2"}
            style={
              {
                left: "4%",
                top: "93%",
                width: "20px",
                height: "20px",
                "--r": "0deg",
                "--dd": "3.13s",
                "--dl": "-2.1s",
              } as CSSProperties
            }
          >
            <svg viewBox={"0 0 24 24"} fill={"currentColor"}>
              <path
                d={
                  "M12 0c.9 6.2 5.1 10.9 12 12-6.9 1.1-11.1 5.8-12 12-.9-6.2-5.1-10.9-12-12 6.9-1.1 11.1-5.8 12-12z"
                }
              ></path>
            </svg>
          </span>
        </div>
        <div className={"art a8"}>
          <div className={"sbx"}>
            <svg
              viewBox={"0 0 24 24"}
              fill={"none"}
              stroke={"currentColor"}
              strokeWidth={"2"}
              strokeLinecap={"round"}
              aria-hidden={"true"}
            >
              <circle cx={"10.8"} cy={"10.8"} r={"6.3"}></circle>
              <path d={"M15.5 15.5 20 20"}></path>
            </svg>
            <span className={"typed"}>{"algo dulce"}</span>
            <i className={"caret"}></i>
          </div>
          <div className={"res"}>
            <span>
              <img src={"/tienda/michel-wildflower.jpg"} alt={""} />
              {"Wild Flower"}
            </span>
            <span>
              <img src={"/tienda/michel-urbantoy.jpg"} alt={""} />
              {"Urban Toy"}
            </span>
            <span>
              <img src={"/tienda/michel-parade.jpg"} alt={""} />
              {"Parade"}
            </span>
          </div>
        </div>
        <h3>
          {"Lo buscan "}
          <em>{"como hablan."}</em>
        </h3>
        <p>{"«Algo dulce», «para regalar»… Lo escriben y aparece."}</p>
        <p className={"snote"}>{"sin algoritmo que te juzgue"}</p>
      </section>
    );
  if (indice === 6)
    return (
      <section className={"slide on"} data-bg={"crema"}>
        <div className={"deco"} aria-hidden={"true"}>
          <span
            className={"di c1"}
            style={
              {
                left: "3%",
                top: "4%",
                width: "46px",
                height: "46px",
                "--r": "-8deg",
                "--dd": "3.00s",
                "--dl": "0s",
              } as CSSProperties
            }
          >
            <svg
              viewBox={"0 0 48 44"}
              fill={"none"}
              stroke={"currentColor"}
              strokeWidth={"4"}
              strokeLinejoin={"round"}
            >
              <path
                d={
                  "M9 4h30a7 7 0 0 1 7 7v14a7 7 0 0 1-7 7H22l-10 9 1-9H9a7 7 0 0 1-7-7V11a7 7 0 0 1 7-7z"
                }
              ></path>
            </svg>
          </span>
          <span
            className={"di c1"}
            style={
              {
                left: "78%",
                top: "5%",
                width: "48px",
                height: "48px",
                "--r": "10deg",
                "--dd": "3.37s",
                "--dl": "-0.9s",
              } as CSSProperties
            }
          >
            <svg
              viewBox={"0 0 48 44"}
              fill={"none"}
              stroke={"currentColor"}
              strokeWidth={"4"}
              strokeLinejoin={"round"}
            >
              <path
                d={
                  "M9 4h30a7 7 0 0 1 7 7v14a7 7 0 0 1-7 7H22l-10 9 1-9H9a7 7 0 0 1-7-7V11a7 7 0 0 1 7-7z"
                }
              ></path>
            </svg>
          </span>
          <span
            className={"di c1"}
            style={
              {
                left: "1%",
                top: "43%",
                width: "40px",
                height: "40px",
                "--r": "-12deg",
                "--dd": "3.74s",
                "--dl": "-1.8s",
              } as CSSProperties
            }
          >
            <svg
              viewBox={"0 0 48 44"}
              fill={"none"}
              stroke={"currentColor"}
              strokeWidth={"4"}
              strokeLinejoin={"round"}
            >
              <path
                d={
                  "M9 4h30a7 7 0 0 1 7 7v14a7 7 0 0 1-7 7H22l-10 9 1-9H9a7 7 0 0 1-7-7V11a7 7 0 0 1 7-7z"
                }
              ></path>
            </svg>
          </span>
          <span
            className={"di c1"}
            style={
              {
                left: "85%",
                top: "36%",
                width: "46px",
                height: "46px",
                "--r": "8deg",
                "--dd": "4.11s",
                "--dl": "-2.7s",
              } as CSSProperties
            }
          >
            <svg
              viewBox={"0 0 48 44"}
              fill={"none"}
              stroke={"currentColor"}
              strokeWidth={"4"}
              strokeLinejoin={"round"}
            >
              <path
                d={
                  "M9 4h30a7 7 0 0 1 7 7v14a7 7 0 0 1-7 7H22l-10 9 1-9H9a7 7 0 0 1-7-7V11a7 7 0 0 1 7-7z"
                }
              ></path>
            </svg>
          </span>
          <span
            className={"di c1"}
            style={
              {
                left: "5%",
                top: "86%",
                width: "44px",
                height: "44px",
                "--r": "6deg",
                "--dd": "4.48s",
                "--dl": "-0.6s",
              } as CSSProperties
            }
          >
            <svg
              viewBox={"0 0 48 44"}
              fill={"none"}
              stroke={"currentColor"}
              strokeWidth={"4"}
              strokeLinejoin={"round"}
            >
              <path
                d={
                  "M9 4h30a7 7 0 0 1 7 7v14a7 7 0 0 1-7 7H22l-10 9 1-9H9a7 7 0 0 1-7-7V11a7 7 0 0 1 7-7z"
                }
              ></path>
            </svg>
          </span>
          <span
            className={"di c1"}
            style={
              {
                left: "76%",
                top: "92%",
                width: "50px",
                height: "50px",
                "--r": "-6deg",
                "--dd": "3.25s",
                "--dl": "-1.5s",
              } as CSSProperties
            }
          >
            <svg
              viewBox={"0 0 48 44"}
              fill={"none"}
              stroke={"currentColor"}
              strokeWidth={"4"}
              strokeLinejoin={"round"}
            >
              <path
                d={
                  "M9 4h30a7 7 0 0 1 7 7v14a7 7 0 0 1-7 7H22l-10 9 1-9H9a7 7 0 0 1-7-7V11a7 7 0 0 1 7-7z"
                }
              ></path>
            </svg>
          </span>
          <span
            className={"di c2"}
            style={
              {
                left: "78%",
                top: "17%",
                width: "28px",
                height: "28px",
                "--r": "12deg",
                "--dd": "3.62s",
                "--dl": "-2.4s",
              } as CSSProperties
            }
          >
            <svg viewBox={"0 0 24 22"} fill={"currentColor"}>
              <path
                d={
                  "M12 21s-8.6-5.1-10.7-10.3C-.3 6.6 2.2 1.5 6.6 1.5c2.4 0 4 1.2 5.4 3.2 1.4-2 3-3.2 5.4-3.2 4.4 0 6.9 5.1 5.3 9.2C20.6 15.9 12 21 12 21z"
                }
              ></path>
            </svg>
          </span>
          <span
            className={"di c2"}
            style={
              {
                left: "13%",
                top: "25%",
                width: "20px",
                height: "20px",
                "--r": "-10deg",
                "--dd": "3.99s",
                "--dl": "-0.3s",
              } as CSSProperties
            }
          >
            <svg viewBox={"0 0 24 22"} fill={"currentColor"}>
              <path
                d={
                  "M12 21s-8.6-5.1-10.7-10.3C-.3 6.6 2.2 1.5 6.6 1.5c2.4 0 4 1.2 5.4 3.2 1.4-2 3-3.2 5.4-3.2 4.4 0 6.9 5.1 5.3 9.2C20.6 15.9 12 21 12 21z"
                }
              ></path>
            </svg>
          </span>
          <span
            className={"di c2"}
            style={
              {
                left: "68%",
                top: "3%",
                width: "22px",
                height: "22px",
                "--r": "0deg",
                "--dd": "4.36s",
                "--dl": "-1.2s",
              } as CSSProperties
            }
          >
            <svg viewBox={"0 0 24 24"} fill={"currentColor"}>
              <path
                d={
                  "M12 0c.9 6.2 5.1 10.9 12 12-6.9 1.1-11.1 5.8-12 12-.9-6.2-5.1-10.9-12-12 6.9-1.1 11.1-5.8 12-12z"
                }
              ></path>
            </svg>
          </span>
          <span
            className={"di c2"}
            style={
              {
                left: "92%",
                top: "79%",
                width: "24px",
                height: "24px",
                "--r": "0deg",
                "--dd": "3.13s",
                "--dl": "-2.1s",
              } as CSSProperties
            }
          >
            <svg viewBox={"0 0 24 24"} fill={"currentColor"}>
              <path
                d={
                  "M12 0c.9 6.2 5.1 10.9 12 12-6.9 1.1-11.1 5.8-12 12-.9-6.2-5.1-10.9-12-12 6.9-1.1 11.1-5.8 12-12z"
                }
              ></path>
            </svg>
          </span>
          <span
            className={"di c2"}
            style={
              {
                left: "5%",
                top: "74%",
                width: "18px",
                height: "18px",
                "--r": "0deg",
                "--dd": "3.50s",
                "--dl": "0s",
              } as CSSProperties
            }
          >
            <svg viewBox={"0 0 24 24"} fill={"currentColor"}>
              <path
                d={
                  "M12 0c.9 6.2 5.1 10.9 12 12-6.9 1.1-11.1 5.8-12 12-.9-6.2-5.1-10.9-12-12 6.9-1.1 11.1-5.8 12-12z"
                }
              ></path>
            </svg>
          </span>
          <span
            className={"di c2"}
            style={
              {
                left: "58%",
                top: "90%",
                width: "26px",
                height: "26px",
                "--r": "20deg",
                "--dd": "3.87s",
                "--dl": "-0.9s",
              } as CSSProperties
            }
          >
            <svg
              viewBox={"0 0 30 30"}
              fill={"none"}
              stroke={"currentColor"}
              strokeWidth={"3.6"}
              strokeLinecap={"round"}
            >
              <path d={"M4 12 11 16M9 4l6 9M20 3l-1 10"}></path>
            </svg>
          </span>
        </div>
        <div className={"art a10"}>
          <div className={"card"}>
            <img src={"/tienda/michel-mayar.jpg"} alt={""} />
            <span className={"sb"}>
              <svg
                viewBox={"0 0 24 24"}
                fill={"none"}
                stroke={"currentColor"}
                strokeWidth={"1.9"}
                strokeLinecap={"round"}
                strokeLinejoin={"round"}
                aria-hidden={"true"}
              >
                <path d={"M21.5 2.5 10.2 13.8"}></path>
                <path
                  d={
                    "M21.5 2.5 14.6 21.2a.5.5 0 0 1-.93.03L10.2 13.8 2.77 10.33a.5.5 0 0 1 .03-.93z"
                  }
                ></path>
              </svg>
            </span>
          </div>
          <span className={"pl"}>
            <svg
              viewBox={"0 0 24 24"}
              fill={"none"}
              stroke={"currentColor"}
              strokeWidth={"1.9"}
              strokeLinecap={"round"}
              strokeLinejoin={"round"}
              aria-hidden={"true"}
            >
              <path d={"M21.5 2.5 10.2 13.8"}></path>
              <path
                d={
                  "M21.5 2.5 14.6 21.2a.5.5 0 0 1-.93.03L10.2 13.8 2.77 10.33a.5.5 0 0 1 .03-.93z"
                }
              ></path>
            </svg>
          </span>
          <div className={"bub2"}>
            {"Mira este 😍 ¿me lo regalas?"}
            <span>
              <svg
                viewBox={"0 0 24 24"}
                fill={"none"}
                stroke={"currentColor"}
                strokeWidth={"2.2"}
                strokeLinecap={"round"}
                strokeLinejoin={"round"}
                aria-hidden={"true"}
              >
                <path
                  d={"M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"}
                ></path>
                <path
                  d={"M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"}
                ></path>
              </svg>
              {"tutienda.com/mayar"}
            </span>
          </div>
        </div>
        <h3>
          {"Y lo "}
          <em>{"comparten."}</em>
        </h3>
        <p>
          {
            "Cada producto tiene su enlace. Perfecto para lanzar indirectas de regalo."
          }
        </p>
      </section>
    );
  if (indice === 7)
    return (
      <section className={"slide on"} data-bg={"verde"}>
        <div className={"deco"} aria-hidden={"true"}>
          <span
            className={"di c2"}
            style={
              {
                left: "6%",
                top: "7%",
                width: "30px",
                height: "30px",
                "--r": "-12deg",
                "--dd": "3.00s",
                "--dl": "0s",
              } as CSSProperties
            }
          >
            <svg viewBox={"0 0 24 22"} fill={"currentColor"}>
              <path
                d={
                  "M12 21s-8.6-5.1-10.7-10.3C-.3 6.6 2.2 1.5 6.6 1.5c2.4 0 4 1.2 5.4 3.2 1.4-2 3-3.2 5.4-3.2 4.4 0 6.9 5.1 5.3 9.2C20.6 15.9 12 21 12 21z"
                }
              ></path>
            </svg>
          </span>
          <span
            className={"di c2"}
            style={
              {
                left: "88%",
                top: "81%",
                width: "32px",
                height: "32px",
                "--r": "10deg",
                "--dd": "3.37s",
                "--dl": "-0.9s",
              } as CSSProperties
            }
          >
            <svg viewBox={"0 0 24 22"} fill={"currentColor"}>
              <path
                d={
                  "M12 21s-8.6-5.1-10.7-10.3C-.3 6.6 2.2 1.5 6.6 1.5c2.4 0 4 1.2 5.4 3.2 1.4-2 3-3.2 5.4-3.2 4.4 0 6.9 5.1 5.3 9.2C20.6 15.9 12 21 12 21z"
                }
              ></path>
            </svg>
          </span>
          <span
            className={"di c2"}
            style={
              {
                left: "9%",
                top: "79%",
                width: "24px",
                height: "24px",
                "--r": "-6deg",
                "--dd": "3.74s",
                "--dl": "-1.8s",
              } as CSSProperties
            }
          >
            <svg viewBox={"0 0 24 22"} fill={"currentColor"}>
              <path
                d={
                  "M12 21s-8.6-5.1-10.7-10.3C-.3 6.6 2.2 1.5 6.6 1.5c2.4 0 4 1.2 5.4 3.2 1.4-2 3-3.2 5.4-3.2 4.4 0 6.9 5.1 5.3 9.2C20.6 15.9 12 21 12 21z"
                }
              ></path>
            </svg>
          </span>
          <span
            className={"di c1"}
            style={
              {
                left: "83%",
                top: "5%",
                width: "34px",
                height: "34px",
                "--r": "12deg",
                "--dd": "4.11s",
                "--dl": "-2.7s",
              } as CSSProperties
            }
          >
            <svg
              viewBox={"0 0 24 22"}
              fill={"none"}
              stroke={"currentColor"}
              strokeWidth={"2.4"}
              strokeLinejoin={"round"}
            >
              <path
                d={
                  "M12 20s-8.2-4.9-10.2-9.8C.3 6.4 2.6 2.2 6.6 2.2c2.3 0 3.9 1.2 5.4 3.2 1.5-2 3.1-3.2 5.4-3.2 4 0 6.3 4.2 4.8 8C20.2 15.1 12 20 12 20z"
                }
              ></path>
            </svg>
          </span>
          <span
            className={"di c1"}
            style={
              {
                left: "3%",
                top: "45%",
                width: "30px",
                height: "30px",
                "--r": "-10deg",
                "--dd": "4.48s",
                "--dl": "-0.6s",
              } as CSSProperties
            }
          >
            <svg
              viewBox={"0 0 24 22"}
              fill={"none"}
              stroke={"currentColor"}
              strokeWidth={"2.4"}
              strokeLinejoin={"round"}
            >
              <path
                d={
                  "M12 20s-8.2-4.9-10.2-9.8C.3 6.4 2.6 2.2 6.6 2.2c2.3 0 3.9 1.2 5.4 3.2 1.5-2 3.1-3.2 5.4-3.2 4 0 6.3 4.2 4.8 8C20.2 15.1 12 20 12 20z"
                }
              ></path>
            </svg>
          </span>
          <span
            className={"di c1"}
            style={
              {
                left: "89%",
                top: "40%",
                width: "22px",
                height: "22px",
                "--r": "8deg",
                "--dd": "3.25s",
                "--dl": "-1.5s",
              } as CSSProperties
            }
          >
            <svg
              viewBox={"0 0 24 22"}
              fill={"none"}
              stroke={"currentColor"}
              strokeWidth={"2.4"}
              strokeLinejoin={"round"}
            >
              <path
                d={
                  "M12 20s-8.2-4.9-10.2-9.8C.3 6.4 2.6 2.2 6.6 2.2c2.3 0 3.9 1.2 5.4 3.2 1.5-2 3.1-3.2 5.4-3.2 4 0 6.3 4.2 4.8 8C20.2 15.1 12 20 12 20z"
                }
              ></path>
            </svg>
          </span>
          <span
            className={"di c2"}
            style={
              {
                left: "68%",
                top: "3%",
                width: "24px",
                height: "24px",
                "--r": "0deg",
                "--dd": "3.62s",
                "--dl": "-2.4s",
              } as CSSProperties
            }
          >
            <svg viewBox={"0 0 24 24"} fill={"currentColor"}>
              <path
                d={
                  "M12 0c.9 6.2 5.1 10.9 12 12-6.9 1.1-11.1 5.8-12 12-.9-6.2-5.1-10.9-12-12 6.9-1.1 11.1-5.8 12-12z"
                }
              ></path>
            </svg>
          </span>
          <span
            className={"di c2"}
            style={
              {
                left: "16%",
                top: "31%",
                width: "18px",
                height: "18px",
                "--r": "0deg",
                "--dd": "3.99s",
                "--dl": "-0.3s",
              } as CSSProperties
            }
          >
            <svg viewBox={"0 0 24 24"} fill={"currentColor"}>
              <path
                d={
                  "M12 0c.9 6.2 5.1 10.9 12 12-6.9 1.1-11.1 5.8-12 12-.9-6.2-5.1-10.9-12-12 6.9-1.1 11.1-5.8 12-12z"
                }
              ></path>
            </svg>
          </span>
          <span
            className={"di c1"}
            style={
              {
                left: "79%",
                top: "89%",
                width: "28px",
                height: "28px",
                "--r": "0deg",
                "--dd": "4.36s",
                "--dl": "-1.2s",
              } as CSSProperties
            }
          >
            <svg
              viewBox={"0 0 24 24"}
              fill={"none"}
              stroke={"currentColor"}
              strokeWidth={"1.8"}
              strokeLinejoin={"round"}
            >
              <path
                d={
                  "M12 1.5c.9 5.6 4.8 9.5 10.5 10.5-5.7 1-9.6 4.9-10.5 10.5C11.1 16.9 7.2 13 1.5 12 7.2 11 11.1 7.1 12 1.5z"
                }
              ></path>
            </svg>
          </span>
          <span
            className={"di c2"}
            style={
              {
                left: "4%",
                top: "93%",
                width: "20px",
                height: "20px",
                "--r": "0deg",
                "--dd": "3.13s",
                "--dl": "-2.1s",
              } as CSSProperties
            }
          >
            <svg viewBox={"0 0 24 24"} fill={"currentColor"}>
              <path
                d={
                  "M12 0c.9 6.2 5.1 10.9 12 12-6.9 1.1-11.1 5.8-12 12-.9-6.2-5.1-10.9-12-12 6.9-1.1 11.1-5.8 12-12z"
                }
              ></path>
            </svg>
          </span>
        </div>
        <div className={"art a5"}>
          <div className={"refresh"}>
            <svg
              viewBox={"0 0 24 24"}
              fill={"none"}
              stroke={"currentColor"}
              strokeWidth={"2"}
              strokeLinecap={"round"}
              strokeLinejoin={"round"}
            >
              <path
                d={
                  "M20 11a8 8 0 0 0-14.9-3.5M4 4v4h4M4 13a8 8 0 0 0 14.9 3.5M20 20v-4h-4"
                }
              ></path>
            </svg>
          </div>
          <div className={"tiles"}>
            <div>
              <img src={"/tienda/michel-oxana.jpg"} alt={""} />
              <span className={"stamp"}>{"VENDIDO"}</span>
            </div>
            <div>
              <img src={"/tienda/michel-mayar.jpg"} alt={""} />
              <span className={"price"}>{"RD$3,200"}</span>
            </div>
            <div className={"newt"}>
              <img src={"/tienda/michel-wildflower.jpg"} alt={""} />
              <span className={"price"}>{"NUEVO"}</span>
            </div>
          </div>
        </div>
        <h3>
          {"Siempre "}
          <em>{"al día."}</em>
        </h3>
        <p>{"Marcamos lo vendido y subimos lo nuevo. Tú solo nos avisas."}</p>
      </section>
    );
  if (indice === 8)
    return (
      <section className={"slide on"} data-bg={"rosa"}>
        <div className={"deco"} aria-hidden={"true"}>
          <div className={"dband"}>
            <div className={"dcol"}>
              <svg
                viewBox={"0 0 24 24"}
                fill={"none"}
                stroke={"currentColor"}
                strokeWidth={"4.2"}
                strokeLinecap={"round"}
                strokeLinejoin={"round"}
              >
                <path d={"M5 19 18 6M8.5 5.5H18.5V15.5"}></path>
              </svg>
              <svg
                viewBox={"0 0 24 24"}
                fill={"none"}
                stroke={"currentColor"}
                strokeWidth={"4.2"}
                strokeLinecap={"round"}
                strokeLinejoin={"round"}
              >
                <path d={"M5 19 18 6M8.5 5.5H18.5V15.5"}></path>
              </svg>
              <svg
                viewBox={"0 0 24 24"}
                fill={"none"}
                stroke={"currentColor"}
                strokeWidth={"4.2"}
                strokeLinecap={"round"}
                strokeLinejoin={"round"}
              >
                <path d={"M5 19 18 6M8.5 5.5H18.5V15.5"}></path>
              </svg>
              <svg
                viewBox={"0 0 24 24"}
                fill={"none"}
                stroke={"currentColor"}
                strokeWidth={"4.2"}
                strokeLinecap={"round"}
                strokeLinejoin={"round"}
              >
                <path d={"M5 19 18 6M8.5 5.5H18.5V15.5"}></path>
              </svg>
              <svg
                viewBox={"0 0 24 24"}
                fill={"none"}
                stroke={"currentColor"}
                strokeWidth={"4.2"}
                strokeLinecap={"round"}
                strokeLinejoin={"round"}
              >
                <path d={"M5 19 18 6M8.5 5.5H18.5V15.5"}></path>
              </svg>
              <svg
                viewBox={"0 0 24 24"}
                fill={"none"}
                stroke={"currentColor"}
                strokeWidth={"4.2"}
                strokeLinecap={"round"}
                strokeLinejoin={"round"}
              >
                <path d={"M5 19 18 6M8.5 5.5H18.5V15.5"}></path>
              </svg>
              <svg
                viewBox={"0 0 24 24"}
                fill={"none"}
                stroke={"currentColor"}
                strokeWidth={"4.2"}
                strokeLinecap={"round"}
                strokeLinejoin={"round"}
              >
                <path d={"M5 19 18 6M8.5 5.5H18.5V15.5"}></path>
              </svg>
              <svg
                viewBox={"0 0 24 24"}
                fill={"none"}
                stroke={"currentColor"}
                strokeWidth={"4.2"}
                strokeLinecap={"round"}
                strokeLinejoin={"round"}
              >
                <path d={"M5 19 18 6M8.5 5.5H18.5V15.5"}></path>
              </svg>
              <svg
                viewBox={"0 0 24 24"}
                fill={"none"}
                stroke={"currentColor"}
                strokeWidth={"4.2"}
                strokeLinecap={"round"}
                strokeLinejoin={"round"}
              >
                <path d={"M5 19 18 6M8.5 5.5H18.5V15.5"}></path>
              </svg>
              <svg
                viewBox={"0 0 24 24"}
                fill={"none"}
                stroke={"currentColor"}
                strokeWidth={"4.2"}
                strokeLinecap={"round"}
                strokeLinejoin={"round"}
              >
                <path d={"M5 19 18 6M8.5 5.5H18.5V15.5"}></path>
              </svg>
              <svg
                viewBox={"0 0 24 24"}
                fill={"none"}
                stroke={"currentColor"}
                strokeWidth={"4.2"}
                strokeLinecap={"round"}
                strokeLinejoin={"round"}
              >
                <path d={"M5 19 18 6M8.5 5.5H18.5V15.5"}></path>
              </svg>
              <svg
                viewBox={"0 0 24 24"}
                fill={"none"}
                stroke={"currentColor"}
                strokeWidth={"4.2"}
                strokeLinecap={"round"}
                strokeLinejoin={"round"}
              >
                <path d={"M5 19 18 6M8.5 5.5H18.5V15.5"}></path>
              </svg>
              <svg
                viewBox={"0 0 24 24"}
                fill={"none"}
                stroke={"currentColor"}
                strokeWidth={"4.2"}
                strokeLinecap={"round"}
                strokeLinejoin={"round"}
              >
                <path d={"M5 19 18 6M8.5 5.5H18.5V15.5"}></path>
              </svg>
              <svg
                viewBox={"0 0 24 24"}
                fill={"none"}
                stroke={"currentColor"}
                strokeWidth={"4.2"}
                strokeLinecap={"round"}
                strokeLinejoin={"round"}
              >
                <path d={"M5 19 18 6M8.5 5.5H18.5V15.5"}></path>
              </svg>
              <svg
                viewBox={"0 0 24 24"}
                fill={"none"}
                stroke={"currentColor"}
                strokeWidth={"4.2"}
                strokeLinecap={"round"}
                strokeLinejoin={"round"}
              >
                <path d={"M5 19 18 6M8.5 5.5H18.5V15.5"}></path>
              </svg>
              <svg
                viewBox={"0 0 24 24"}
                fill={"none"}
                stroke={"currentColor"}
                strokeWidth={"4.2"}
                strokeLinecap={"round"}
                strokeLinejoin={"round"}
              >
                <path d={"M5 19 18 6M8.5 5.5H18.5V15.5"}></path>
              </svg>
              <svg
                viewBox={"0 0 24 24"}
                fill={"none"}
                stroke={"currentColor"}
                strokeWidth={"4.2"}
                strokeLinecap={"round"}
                strokeLinejoin={"round"}
              >
                <path d={"M5 19 18 6M8.5 5.5H18.5V15.5"}></path>
              </svg>
              <svg
                viewBox={"0 0 24 24"}
                fill={"none"}
                stroke={"currentColor"}
                strokeWidth={"4.2"}
                strokeLinecap={"round"}
                strokeLinejoin={"round"}
              >
                <path d={"M5 19 18 6M8.5 5.5H18.5V15.5"}></path>
              </svg>
              <svg
                viewBox={"0 0 24 24"}
                fill={"none"}
                stroke={"currentColor"}
                strokeWidth={"4.2"}
                strokeLinecap={"round"}
                strokeLinejoin={"round"}
              >
                <path d={"M5 19 18 6M8.5 5.5H18.5V15.5"}></path>
              </svg>
              <svg
                viewBox={"0 0 24 24"}
                fill={"none"}
                stroke={"currentColor"}
                strokeWidth={"4.2"}
                strokeLinecap={"round"}
                strokeLinejoin={"round"}
              >
                <path d={"M5 19 18 6M8.5 5.5H18.5V15.5"}></path>
              </svg>
              <svg
                viewBox={"0 0 24 24"}
                fill={"none"}
                stroke={"currentColor"}
                strokeWidth={"4.2"}
                strokeLinecap={"round"}
                strokeLinejoin={"round"}
              >
                <path d={"M5 19 18 6M8.5 5.5H18.5V15.5"}></path>
              </svg>
              <svg
                viewBox={"0 0 24 24"}
                fill={"none"}
                stroke={"currentColor"}
                strokeWidth={"4.2"}
                strokeLinecap={"round"}
                strokeLinejoin={"round"}
              >
                <path d={"M5 19 18 6M8.5 5.5H18.5V15.5"}></path>
              </svg>
              <svg
                viewBox={"0 0 24 24"}
                fill={"none"}
                stroke={"currentColor"}
                strokeWidth={"4.2"}
                strokeLinecap={"round"}
                strokeLinejoin={"round"}
              >
                <path d={"M5 19 18 6M8.5 5.5H18.5V15.5"}></path>
              </svg>
              <svg
                viewBox={"0 0 24 24"}
                fill={"none"}
                stroke={"currentColor"}
                strokeWidth={"4.2"}
                strokeLinecap={"round"}
                strokeLinejoin={"round"}
              >
                <path d={"M5 19 18 6M8.5 5.5H18.5V15.5"}></path>
              </svg>
              <svg
                viewBox={"0 0 24 24"}
                fill={"none"}
                stroke={"currentColor"}
                strokeWidth={"4.2"}
                strokeLinecap={"round"}
                strokeLinejoin={"round"}
              >
                <path d={"M5 19 18 6M8.5 5.5H18.5V15.5"}></path>
              </svg>
              <svg
                viewBox={"0 0 24 24"}
                fill={"none"}
                stroke={"currentColor"}
                strokeWidth={"4.2"}
                strokeLinecap={"round"}
                strokeLinejoin={"round"}
              >
                <path d={"M5 19 18 6M8.5 5.5H18.5V15.5"}></path>
              </svg>
            </div>
          </div>
          <span
            className={"di c2"}
            style={
              {
                left: "6%",
                top: "9%",
                width: "26px",
                height: "26px",
                "--r": "-10deg",
                "--dd": "3.00s",
                "--dl": "0s",
              } as CSSProperties
            }
          >
            <svg viewBox={"0 0 24 22"} fill={"currentColor"}>
              <path
                d={
                  "M12 21s-8.6-5.1-10.7-10.3C-.3 6.6 2.2 1.5 6.6 1.5c2.4 0 4 1.2 5.4 3.2 1.4-2 3-3.2 5.4-3.2 4.4 0 6.9 5.1 5.3 9.2C20.6 15.9 12 21 12 21z"
                }
              ></path>
            </svg>
          </span>
          <span
            className={"di c1"}
            style={
              {
                left: "3%",
                top: "40%",
                width: "28px",
                height: "28px",
                "--r": "-8deg",
                "--dd": "3.37s",
                "--dl": "-0.9s",
              } as CSSProperties
            }
          >
            <svg
              viewBox={"0 0 24 22"}
              fill={"none"}
              stroke={"currentColor"}
              strokeWidth={"2.4"}
              strokeLinejoin={"round"}
            >
              <path
                d={
                  "M12 20s-8.2-4.9-10.2-9.8C.3 6.4 2.6 2.2 6.6 2.2c2.3 0 3.9 1.2 5.4 3.2 1.5-2 3.1-3.2 5.4-3.2 4 0 6.3 4.2 4.8 8C20.2 15.1 12 20 12 20z"
                }
              ></path>
            </svg>
          </span>
          <span
            className={"di c2"}
            style={
              {
                left: "10%",
                top: "70%",
                width: "22px",
                height: "22px",
                "--r": "0deg",
                "--dd": "3.74s",
                "--dl": "-1.8s",
              } as CSSProperties
            }
          >
            <svg viewBox={"0 0 24 24"} fill={"currentColor"}>
              <path
                d={
                  "M12 0c.9 6.2 5.1 10.9 12 12-6.9 1.1-11.1 5.8-12 12-.9-6.2-5.1-10.9-12-12 6.9-1.1 11.1-5.8 12-12z"
                }
              ></path>
            </svg>
          </span>
          <span
            className={"di c2"}
            style={
              {
                left: "14%",
                top: "91%",
                width: "26px",
                height: "26px",
                "--r": "0deg",
                "--dd": "4.11s",
                "--dl": "-2.7s",
              } as CSSProperties
            }
          >
            <svg
              viewBox={"0 0 24 24"}
              fill={"none"}
              stroke={"currentColor"}
              strokeWidth={"1.8"}
              strokeLinejoin={"round"}
            >
              <path
                d={
                  "M12 1.5c.9 5.6 4.8 9.5 10.5 10.5-5.7 1-9.6 4.9-10.5 10.5C11.1 16.9 7.2 13 1.5 12 7.2 11 11.1 7.1 12 1.5z"
                }
              ></path>
            </svg>
          </span>
          <span
            className={"di c2"}
            style={
              {
                left: "60%",
                top: "3%",
                width: "20px",
                height: "20px",
                "--r": "0deg",
                "--dd": "4.48s",
                "--dl": "-0.6s",
              } as CSSProperties
            }
          >
            <svg viewBox={"0 0 24 24"} fill={"currentColor"}>
              <path
                d={
                  "M12 0c.9 6.2 5.1 10.9 12 12-6.9 1.1-11.1 5.8-12 12-.9-6.2-5.1-10.9-12-12 6.9-1.1 11.1-5.8 12-12z"
                }
              ></path>
            </svg>
          </span>
          <span
            className={"di c2"}
            style={
              {
                left: "5%",
                top: "24%",
                width: "24px",
                height: "24px",
                "--r": "-20deg",
                "--dd": "3.25s",
                "--dl": "-1.5s",
              } as CSSProperties
            }
          >
            <svg
              viewBox={"0 0 30 30"}
              fill={"none"}
              stroke={"currentColor"}
              strokeWidth={"3.6"}
              strokeLinecap={"round"}
            >
              <path d={"M4 12 11 16M9 4l6 9M20 3l-1 10"}></path>
            </svg>
          </span>
        </div>
        <div className={"art a9"}>
          <span className={"lp"}>
            <svg
              viewBox={"0 0 24 24"}
              fill={"none"}
              stroke={"currentColor"}
              strokeWidth={"2.2"}
              strokeLinecap={"round"}
              strokeLinejoin={"round"}
              aria-hidden={"true"}
            >
              <path
                d={"M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"}
              ></path>
              <path
                d={"M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"}
              ></path>
            </svg>
            {"tutienda.com"}
          </span>
          <span className={"to ig"}>
            <svg
              viewBox={"0 0 24 24"}
              fill={"none"}
              stroke={"currentColor"}
              strokeWidth={"2"}
              aria-hidden={"true"}
            >
              <rect
                x={"3.5"}
                y={"3.5"}
                width={"17"}
                height={"17"}
                rx={"5"}
              ></rect>
              <circle cx={"12"} cy={"12"} r={"4"}></circle>
              <circle
                cx={"17.3"}
                cy={"6.7"}
                r={"1"}
                fill={"currentColor"}
              ></circle>
            </svg>
          </span>
          <span className={"to wa"}>
            <svg
              viewBox={"0 0 24 24"}
              aria-hidden={"true"}
              fill={"currentColor"}
            >
              <path
                d={
                  "M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.1l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.8 11.9 11.9 0 0 0 4.6 4c1.7.7 2.3.8 3.2.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.2-.2-.5-.3z"
                }
              ></path>
            </svg>
          </span>
          <span className={"to gp"}>
            <svg
              viewBox={"0 0 24 24"}
              aria-hidden={"true"}
              fill={"none"}
              stroke={"currentColor"}
              strokeWidth={"1.9"}
              strokeLinejoin={"round"}
            >
              <path
                d={"M21.5 3 9.9 11.3M21.5 3l-6.8 18.1-4.8-9.8L3 7.4z"}
              ></path>
            </svg>
          </span>
        </div>
        <h3>
          {"Un enlace. "}
          <em>{"Todas partes."}</em>
        </h3>
        <p>{"En tu bio, tus estados y tus grupos. Nadie descarga nada."}</p>
      </section>
    );
  if (indice === 9)
    return (
      <section className={"slide on cta"} data-bg={"verde"}>
        <div className={"deco"} aria-hidden={"true"}>
          <span
            className={"di c1"}
            style={
              {
                left: "3%",
                top: "4%",
                width: "46px",
                height: "46px",
                "--r": "-8deg",
                "--dd": "3.00s",
                "--dl": "0s",
              } as CSSProperties
            }
          >
            <svg
              viewBox={"0 0 48 44"}
              fill={"none"}
              stroke={"currentColor"}
              strokeWidth={"4"}
              strokeLinejoin={"round"}
            >
              <path
                d={
                  "M9 4h30a7 7 0 0 1 7 7v14a7 7 0 0 1-7 7H22l-10 9 1-9H9a7 7 0 0 1-7-7V11a7 7 0 0 1 7-7z"
                }
              ></path>
            </svg>
          </span>
          <span
            className={"di c1"}
            style={
              {
                left: "78%",
                top: "5%",
                width: "48px",
                height: "48px",
                "--r": "10deg",
                "--dd": "3.37s",
                "--dl": "-0.9s",
              } as CSSProperties
            }
          >
            <svg
              viewBox={"0 0 48 44"}
              fill={"none"}
              stroke={"currentColor"}
              strokeWidth={"4"}
              strokeLinejoin={"round"}
            >
              <path
                d={
                  "M9 4h30a7 7 0 0 1 7 7v14a7 7 0 0 1-7 7H22l-10 9 1-9H9a7 7 0 0 1-7-7V11a7 7 0 0 1 7-7z"
                }
              ></path>
            </svg>
          </span>
          <span
            className={"di c1"}
            style={
              {
                left: "1%",
                top: "43%",
                width: "40px",
                height: "40px",
                "--r": "-12deg",
                "--dd": "3.74s",
                "--dl": "-1.8s",
              } as CSSProperties
            }
          >
            <svg
              viewBox={"0 0 48 44"}
              fill={"none"}
              stroke={"currentColor"}
              strokeWidth={"4"}
              strokeLinejoin={"round"}
            >
              <path
                d={
                  "M9 4h30a7 7 0 0 1 7 7v14a7 7 0 0 1-7 7H22l-10 9 1-9H9a7 7 0 0 1-7-7V11a7 7 0 0 1 7-7z"
                }
              ></path>
            </svg>
          </span>
          <span
            className={"di c1"}
            style={
              {
                left: "85%",
                top: "36%",
                width: "46px",
                height: "46px",
                "--r": "8deg",
                "--dd": "4.11s",
                "--dl": "-2.7s",
              } as CSSProperties
            }
          >
            <svg
              viewBox={"0 0 48 44"}
              fill={"none"}
              stroke={"currentColor"}
              strokeWidth={"4"}
              strokeLinejoin={"round"}
            >
              <path
                d={
                  "M9 4h30a7 7 0 0 1 7 7v14a7 7 0 0 1-7 7H22l-10 9 1-9H9a7 7 0 0 1-7-7V11a7 7 0 0 1 7-7z"
                }
              ></path>
            </svg>
          </span>
          <span
            className={"di c1"}
            style={
              {
                left: "5%",
                top: "86%",
                width: "44px",
                height: "44px",
                "--r": "6deg",
                "--dd": "4.48s",
                "--dl": "-0.6s",
              } as CSSProperties
            }
          >
            <svg
              viewBox={"0 0 48 44"}
              fill={"none"}
              stroke={"currentColor"}
              strokeWidth={"4"}
              strokeLinejoin={"round"}
            >
              <path
                d={
                  "M9 4h30a7 7 0 0 1 7 7v14a7 7 0 0 1-7 7H22l-10 9 1-9H9a7 7 0 0 1-7-7V11a7 7 0 0 1 7-7z"
                }
              ></path>
            </svg>
          </span>
          <span
            className={"di c1"}
            style={
              {
                left: "76%",
                top: "92%",
                width: "50px",
                height: "50px",
                "--r": "-6deg",
                "--dd": "3.25s",
                "--dl": "-1.5s",
              } as CSSProperties
            }
          >
            <svg
              viewBox={"0 0 48 44"}
              fill={"none"}
              stroke={"currentColor"}
              strokeWidth={"4"}
              strokeLinejoin={"round"}
            >
              <path
                d={
                  "M9 4h30a7 7 0 0 1 7 7v14a7 7 0 0 1-7 7H22l-10 9 1-9H9a7 7 0 0 1-7-7V11a7 7 0 0 1 7-7z"
                }
              ></path>
            </svg>
          </span>
          <span
            className={"di c2"}
            style={
              {
                left: "78%",
                top: "17%",
                width: "28px",
                height: "28px",
                "--r": "12deg",
                "--dd": "3.62s",
                "--dl": "-2.4s",
              } as CSSProperties
            }
          >
            <svg viewBox={"0 0 24 22"} fill={"currentColor"}>
              <path
                d={
                  "M12 21s-8.6-5.1-10.7-10.3C-.3 6.6 2.2 1.5 6.6 1.5c2.4 0 4 1.2 5.4 3.2 1.4-2 3-3.2 5.4-3.2 4.4 0 6.9 5.1 5.3 9.2C20.6 15.9 12 21 12 21z"
                }
              ></path>
            </svg>
          </span>
          <span
            className={"di c2"}
            style={
              {
                left: "13%",
                top: "25%",
                width: "20px",
                height: "20px",
                "--r": "-10deg",
                "--dd": "3.99s",
                "--dl": "-0.3s",
              } as CSSProperties
            }
          >
            <svg viewBox={"0 0 24 22"} fill={"currentColor"}>
              <path
                d={
                  "M12 21s-8.6-5.1-10.7-10.3C-.3 6.6 2.2 1.5 6.6 1.5c2.4 0 4 1.2 5.4 3.2 1.4-2 3-3.2 5.4-3.2 4.4 0 6.9 5.1 5.3 9.2C20.6 15.9 12 21 12 21z"
                }
              ></path>
            </svg>
          </span>
          <span
            className={"di c2"}
            style={
              {
                left: "68%",
                top: "3%",
                width: "22px",
                height: "22px",
                "--r": "0deg",
                "--dd": "4.36s",
                "--dl": "-1.2s",
              } as CSSProperties
            }
          >
            <svg viewBox={"0 0 24 24"} fill={"currentColor"}>
              <path
                d={
                  "M12 0c.9 6.2 5.1 10.9 12 12-6.9 1.1-11.1 5.8-12 12-.9-6.2-5.1-10.9-12-12 6.9-1.1 11.1-5.8 12-12z"
                }
              ></path>
            </svg>
          </span>
          <span
            className={"di c2"}
            style={
              {
                left: "92%",
                top: "79%",
                width: "24px",
                height: "24px",
                "--r": "0deg",
                "--dd": "3.13s",
                "--dl": "-2.1s",
              } as CSSProperties
            }
          >
            <svg viewBox={"0 0 24 24"} fill={"currentColor"}>
              <path
                d={
                  "M12 0c.9 6.2 5.1 10.9 12 12-6.9 1.1-11.1 5.8-12 12-.9-6.2-5.1-10.9-12-12 6.9-1.1 11.1-5.8 12-12z"
                }
              ></path>
            </svg>
          </span>
          <span
            className={"di c2"}
            style={
              {
                left: "5%",
                top: "74%",
                width: "18px",
                height: "18px",
                "--r": "0deg",
                "--dd": "3.50s",
                "--dl": "0s",
              } as CSSProperties
            }
          >
            <svg viewBox={"0 0 24 24"} fill={"currentColor"}>
              <path
                d={
                  "M12 0c.9 6.2 5.1 10.9 12 12-6.9 1.1-11.1 5.8-12 12-.9-6.2-5.1-10.9-12-12 6.9-1.1 11.1-5.8 12-12z"
                }
              ></path>
            </svg>
          </span>
          <span
            className={"di c2"}
            style={
              {
                left: "58%",
                top: "90%",
                width: "26px",
                height: "26px",
                "--r": "20deg",
                "--dd": "3.87s",
                "--dl": "-0.9s",
              } as CSSProperties
            }
          >
            <svg
              viewBox={"0 0 30 30"}
              fill={"none"}
              stroke={"currentColor"}
              strokeWidth={"3.6"}
              strokeLinecap={"round"}
            >
              <path d={"M4 12 11 16M9 4l6 9M20 3l-1 10"}></path>
            </svg>
          </span>
        </div>
        <div className={"art a6"}>
          <span className={"dzapp"}>
            <svg
              className={"dziso"}
              viewBox={"0 0 160 160"}
              aria-hidden={"true"}
              focusable={"false"}
            >
              <rect
                width={"160"}
                height={"160"}
                rx={"42"}
                fill={"var(--dzib,#FDCFB4)"}
              ></rect>
              <g
                fill={"var(--dzif,#0E44A8)"}
                transform={
                  "translate(80 80) scale(0.0649) translate(-1071.4 -1074.0)"
                }
              >
                <path
                  d={
                    "M 1397.81 181.597 L 1399.37 181.418 C 1474.76 173.457 1515.96 228.576 1563.34 275.986 L 1682.37 395.158 L 1743.41 456.216 C 1776.8 489.111 1807.74 515.126 1811.93 565.504 C 1814.86 597.072 1804.83 628.474 1784.16 652.509 C 1743.3 699.895 1672.96 706.531 1622.03 672.015 C 1601.79 658.297 1584.49 641.12 1566.16 625.051 C 1565.48 648.301 1566.54 670.225 1566.53 693.128 L 1566.03 820.5 L 1565.96 1201.18 L 1566.01 1328.71 C 1566.03 1384.22 1567.44 1428.77 1556.24 1484.08 C 1539.52 1569.65 1502.85 1650.07 1449.21 1718.8 C 1343.97 1854.25 1188.8 1941.82 1018.45 1961.88 C 852.575 1983.08 680.919 1941.51 547.942 1838.79 C 490.881 1797.23 440.168 1737.52 403.618 1677.59 C 303.703 1513.77 308.583 1298.03 402.048 1132.52 C 486.662 981.888 627.919 871.279 794.445 825.257 C 909.155 793.2 1031.18 799.329 1142.1 842.717 C 1177.06 856.432 1201.54 869.496 1233.67 887.693 L 1233.95 626.07 C 1199.68 657.443 1168.99 690.651 1120.41 695.89 C 1091.13 699.049 1060.52 690.24 1037.54 671.926 C 1014.07 652.902 999.219 625.259 996.305 595.191 C 988.752 524.109 1032.42 490.262 1078.13 446.305 L 1171.17 356.674 L 1269.16 262.171 C 1309.76 222.942 1337.58 187.223 1397.81 181.597 z M 939.37 1639.14 C 1079.22 1635.35 1201.99 1511.69 1199.66 1370.5 C 1198.63 1308.17 1167.11 1246.11 1122.13 1204.19 C 1077.39 1161.88 1012.51 1134.82 950.39 1137.32 C 949.569 1137.35 948.749 1137.4 947.929 1137.46 C 802.864 1143.5 681.492 1266.03 687.879 1413.05 C 690.854 1475.64 718.482 1534.5 764.727 1576.78 C 808.91 1617.09 875.858 1642.57 935.684 1639.39 C 936.913 1639.32 938.142 1639.24 939.37 1639.14 z"
                  }
                ></path>
              </g>
            </svg>
          </span>
          <span
            className={"f"}
            style={{ right: "22px", bottom: "40px" } as CSSProperties}
          >
            <svg
              viewBox={"0 0 24 24"}
              aria-hidden={"true"}
              fill={"currentColor"}
            >
              <path
                d={
                  "M12 20.3s-7.3-4.4-9.2-8.9C1.3 7.9 3.4 4.6 6.8 4.6c2.1 0 3.5 1.1 5.2 3 1.7-1.9 3.1-3 5.2-3 3.4 0 5.5 3.3 4 6.8-1.9 4.5-9.2 8.9-9.2 8.9z"
                }
              ></path>
            </svg>
          </span>
          <span
            className={"f f2"}
            style={
              {
                right: "40px",
                bottom: "30px",
                width: "22px",
                height: "22px",
              } as CSSProperties
            }
          >
            <svg
              viewBox={"0 0 24 24"}
              aria-hidden={"true"}
              fill={"currentColor"}
            >
              <path
                d={
                  "M12 20.3s-7.3-4.4-9.2-8.9C1.3 7.9 3.4 4.6 6.8 4.6c2.1 0 3.5 1.1 5.2 3 1.7-1.9 3.1-3 5.2-3 3.4 0 5.5 3.3 4 6.8-1.9 4.5-9.2 8.9-9.2 8.9z"
                }
              ></path>
            </svg>
          </span>
          <span
            className={"f f3"}
            style={
              {
                left: "30px",
                bottom: "44px",
                width: "24px",
                height: "24px",
              } as CSSProperties
            }
          >
            <svg
              viewBox={"0 0 24 24"}
              aria-hidden={"true"}
              fill={"currentColor"}
            >
              <path
                d={
                  "M12 20.3s-7.3-4.4-9.2-8.9C1.3 7.9 3.4 4.6 6.8 4.6c2.1 0 3.5 1.1 5.2 3 1.7-1.9 3.1-3 5.2-3 3.4 0 5.5 3.3 4 6.8-1.9 4.5-9.2 8.9-9.2 8.9z"
                }
              ></path>
            </svg>
          </span>
        </div>
        <h3>
          {"Tu tienda merece "}
          <em>{"su aaah."}</em>
        </h3>
        <p>{"Escríbenos y te armamos una demo con tus propios productos."}</p>
        <p className={"snote"}>{"ese aaah ya tiene nombre: deslizapp"}</p>
        <div className={"scta"}>
          <a className={"swa"} href={contacto}>
            {"Escríbenos por WhatsApp"}
          </a>
          <button className={"splans"} data-plans={true}>
            {"Ver planes"}
          </button>
          <button className={"sagain"} data-sagain={true}>
            {"Ver otra vez"}
          </button>
        </div>
      </section>
    );
  return null;
}
export function ArteFinal({
  contacto,
  activo = false,
}: {
  contacto: string;
  activo?: boolean;
}) {
  return (
    <article
      className={"reel ir" + (activo ? " on" : "")}
      id={"r-deslizapp"}
      data-id={"deslizapp"}
      aria-label={"Deslizapp: catálogos como este para tu tienda"}
    >
      <div className={"media irm"} data-media={"deslizapp"}>
        <div className={"irbg"} aria-hidden={"true"}>
          <i></i>
          <i></i>
          <i></i>
        </div>
        <div className={"deco"} aria-hidden={"true"}>
          <span
            className={"di c2"}
            style={
              {
                left: "56%",
                top: "7%",
                width: "22px",
                height: "22px",
                "--r": "0deg",
                "--dd": "3.00s",
                "--dl": "0s",
              } as CSSProperties
            }
          >
            <svg viewBox={"0 0 24 24"} fill={"currentColor"}>
              <path
                d={
                  "M12 0c.9 6.2 5.1 10.9 12 12-6.9 1.1-11.1 5.8-12 12-.9-6.2-5.1-10.9-12-12 6.9-1.1 11.1-5.8 12-12z"
                }
              ></path>
            </svg>
          </span>
          <span
            className={"di c2"}
            style={
              {
                left: "52%",
                top: "40%",
                width: "24px",
                height: "24px",
                "--r": "0deg",
                "--dd": "3.37s",
                "--dl": "-0.9s",
              } as CSSProperties
            }
          >
            <svg
              viewBox={"0 0 24 24"}
              fill={"none"}
              stroke={"currentColor"}
              strokeWidth={"1.8"}
              strokeLinejoin={"round"}
            >
              <path
                d={
                  "M12 1.5c.9 5.6 4.8 9.5 10.5 10.5-5.7 1-9.6 4.9-10.5 10.5C11.1 16.9 7.2 13 1.5 12 7.2 11 11.1 7.1 12 1.5z"
                }
              ></path>
            </svg>
          </span>
          <span
            className={"di c2"}
            style={
              {
                left: "78%",
                top: "24%",
                width: "28px",
                height: "28px",
                "--r": "15deg",
                "--dd": "3.74s",
                "--dl": "-1.8s",
              } as CSSProperties
            }
          >
            <svg
              viewBox={"0 0 30 30"}
              fill={"none"}
              stroke={"currentColor"}
              strokeWidth={"3.6"}
              strokeLinecap={"round"}
            >
              <path d={"M4 12 11 16M9 4l6 9M20 3l-1 10"}></path>
            </svg>
          </span>
          <span
            className={"di c1"}
            style={
              {
                left: "4%",
                top: "36%",
                width: "26px",
                height: "26px",
                "--r": "-10deg",
                "--dd": "4.11s",
                "--dl": "-2.7s",
              } as CSSProperties
            }
          >
            <svg
              viewBox={"0 0 24 22"}
              fill={"none"}
              stroke={"currentColor"}
              strokeWidth={"2.4"}
              strokeLinejoin={"round"}
            >
              <path
                d={
                  "M12 20s-8.2-4.9-10.2-9.8C.3 6.4 2.6 2.2 6.6 2.2c2.3 0 3.9 1.2 5.4 3.2 1.5-2 3.1-3.2 5.4-3.2 4 0 6.3 4.2 4.8 8C20.2 15.1 12 20 12 20z"
                }
              ></path>
            </svg>
          </span>
          <span
            className={"di c1"}
            style={
              {
                left: "84%",
                top: "34%",
                width: "38px",
                height: "38px",
                "--r": "10deg",
                "--dd": "4.48s",
                "--dl": "-0.6s",
              } as CSSProperties
            }
          >
            <svg
              viewBox={"0 0 48 44"}
              fill={"none"}
              stroke={"currentColor"}
              strokeWidth={"4"}
              strokeLinejoin={"round"}
            >
              <path
                d={
                  "M9 4h30a7 7 0 0 1 7 7v14a7 7 0 0 1-7 7H22l-10 9 1-9H9a7 7 0 0 1-7-7V11a7 7 0 0 1 7-7z"
                }
              ></path>
            </svg>
          </span>
          <span
            className={"di c1"}
            style={
              {
                left: "90%",
                top: "90%",
                width: "18px",
                height: "18px",
                "--r": "0deg",
                "--dd": "3.25s",
                "--dl": "-1.5s",
              } as CSSProperties
            }
          >
            <svg viewBox={"0 0 24 24"} fill={"currentColor"}>
              <path
                d={
                  "M12 0c.9 6.2 5.1 10.9 12 12-6.9 1.1-11.1 5.8-12 12-.9-6.2-5.1-10.9-12-12 6.9-1.1 11.1-5.8 12-12z"
                }
              ></path>
            </svg>
          </span>
          <span
            className={"di c3"}
            style={
              {
                left: "62%",
                top: "4%",
                width: "20px",
                height: "20px",
                "--r": "12deg",
                "--dd": "3.62s",
                "--dl": "-2.4s",
              } as CSSProperties
            }
          >
            <svg viewBox={"0 0 24 22"} fill={"currentColor"}>
              <path
                d={
                  "M12 21s-8.6-5.1-10.7-10.3C-.3 6.6 2.2 1.5 6.6 1.5c2.4 0 4 1.2 5.4 3.2 1.4-2 3-3.2 5.4-3.2 4.4 0 6.9 5.1 5.3 9.2C20.6 15.9 12 21 12 21z"
                }
              ></path>
            </svg>
          </span>
        </div>
        <div className={"irfloat"} aria-hidden={"true"}>
          <span className={"f fcom"}>
            <svg
              viewBox={"0 0 24 24"}
              aria-hidden={"true"}
              fill={"none"}
              stroke={"currentColor"}
              strokeWidth={"1.9"}
              strokeLinejoin={"round"}
            >
              <path
                d={
                  "M20.7 11.6a8.6 8.6 0 0 1-12.4 7.7L3.4 20.6l1.3-4.6a8.6 8.6 0 1 1 16-4.4z"
                }
              ></path>
            </svg>
          </span>
          <span className={"f fwa"}>
            <svg
              viewBox={"0 0 24 24"}
              aria-hidden={"true"}
              fill={"currentColor"}
            >
              <path
                d={
                  "M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.1l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.8 11.9 11.9 0 0 0 4.6 4c1.7.7 2.3.8 3.2.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.2-.2-.5-.3z"
                }
              ></path>
            </svg>
          </span>
          <span className={"f fx2"}>{"×2"}</span>
          <span className={"f h"}>
            <svg
              viewBox={"0 0 24 24"}
              aria-hidden={"true"}
              fill={"currentColor"}
            >
              <path
                d={
                  "M12 20.3s-7.3-4.4-9.2-8.9C1.3 7.9 3.4 4.6 6.8 4.6c2.1 0 3.5 1.1 5.2 3 1.7-1.9 3.1-3 5.2-3 3.4 0 5.5 3.3 4 6.8-1.9 4.5-9.2 8.9-9.2 8.9z"
                }
              ></path>
            </svg>
          </span>
          <span className={"f h h2"}>
            <svg
              viewBox={"0 0 24 24"}
              aria-hidden={"true"}
              fill={"currentColor"}
            >
              <path
                d={
                  "M12 20.3s-7.3-4.4-9.2-8.9C1.3 7.9 3.4 4.6 6.8 4.6c2.1 0 3.5 1.1 5.2 3 1.7-1.9 3.1-3 5.2-3 3.4 0 5.5 3.3 4 6.8-1.9 4.5-9.2 8.9-9.2 8.9z"
                }
              ></path>
            </svg>
          </span>
          <span className={"f h h3"}>
            <svg
              viewBox={"0 0 24 24"}
              aria-hidden={"true"}
              fill={"currentColor"}
            >
              <path
                d={
                  "M12 20.3s-7.3-4.4-9.2-8.9C1.3 7.9 3.4 4.6 6.8 4.6c2.1 0 3.5 1.1 5.2 3 1.7-1.9 3.1-3 5.2-3 3.4 0 5.5 3.3 4 6.8-1.9 4.5-9.2 8.9-9.2 8.9z"
                }
              ></path>
            </svg>
          </span>
          <span className={"f fsend"}>
            <svg
              viewBox={"0 0 24 24"}
              aria-hidden={"true"}
              fill={"none"}
              stroke={"currentColor"}
              strokeWidth={"1.9"}
              strokeLinejoin={"round"}
            >
              <path
                d={"M21.5 3 9.9 11.3M21.5 3l-6.8 18.1-4.8-9.8L3 7.4z"}
              ></path>
            </svg>
          </span>
        </div>
        <div className={"irlogo"}>
          <svg
            className={"dzword dzanim"}
            data-za={"reel"}
            viewBox={"80 124 2020 488"}
            aria-hidden={"true"}
            focusable={"false"}
          >
            <g fill={"currentColor"}>
              <path
                className={"dzl"}
                style={{ "--i": "0" } as CSSProperties}
                d={
                  "M 282.722 259.823 C 283.541 235.527 282.474 210.493 282.749 186.108 C 282.931 169.96 285.742 155.631 297.881 143.9 C 307.656 134.392 320.866 129.253 334.496 129.655 C 354.588 130.101 380.86 145.088 383.737 166.625 C 386.548 187.678 385.245 214.253 385.083 236.01 C 384.777 277.158 386.027 318.892 384.968 359.974 C 384.598 364.088 383.245 378.433 384.199 381.429 C 364.648 532.277 143.616 554.2 95.3531 430.954 C 82.932 398.892 83.9181 363.182 98.0898 331.853 C 113.595 297.499 142.119 270.716 177.381 257.403 C 213.234 243.7 247.424 244.096 282.722 259.823 z M 239.545 431.145 C 266.86 427.118 285.795 401.786 281.923 374.448 C 278.051 347.11 252.827 328.032 225.468 331.748 C 197.888 335.494 178.622 360.967 182.525 388.525 C 186.427 416.084 212.009 435.205 239.545 431.145 z"
                }
              ></path>
              <path
                className={"dzl"}
                style={{ "--i": "1" } as CSSProperties}
                d={
                  "M 386.209 359.948 C 391.291 324.813 405.28 295.081 434.631 273.266 C 490.341 231.859 580.098 238.399 622.449 296.043 C 639.453 319.188 657.719 368.98 628.608 390.249 C 615.045 400.159 588.482 397.796 571.739 398.499 C 541.181 399.783 509.699 398.577 479.165 400.301 C 485.315 414.555 493.065 423.559 508.013 429.442 C 522.746 435.131 539.14 434.709 553.561 428.268 C 565.435 423.076 573.877 413.434 586.728 409.887 C 604.255 404.817 627.068 409.326 634.988 427.738 C 648.866 460.001 613.08 481.751 588.183 492.346 C 519.049 521.767 426.54 504.533 394.971 429.491 C 391.111 420.317 386.214 403.932 385.912 393.452 C 386.348 382.26 385.644 371.089 386.209 359.948 z M 476.525 348.793 C 491.631 348.961 506.739 348.738 521.833 348.124 C 532.858 347.973 545.482 348.071 556.333 347.169 C 549.057 325.445 533.693 313.518 510.203 317.389 C 492.379 321.622 482.315 331.349 476.525 348.793 z"
                }
              ></path>
              <path
                className={"dzl"}
                style={{ "--i": "2" } as CSSProperties}
                d={
                  "M 746.708 246.369 C 776.669 244.862 812.705 248.451 836.662 268.289 C 852.947 281.775 854.998 308.051 840.281 323.58 C 835.711 328.339 830.001 331.854 823.693 333.79 C 796.328 342.46 781.862 314.749 755.11 315.854 C 742.276 314.869 736.97 331.028 750.381 335.319 C 792.609 348.83 850.456 356.591 855.275 412.328 C 860.384 471.418 806.946 501.664 753.972 506.083 C 751.346 506.287 748.716 506.424 746.083 506.495 C 710.738 507.557 643.95 494.681 643.115 450.026 C 642.924 439.35 646.99 429.037 654.415 421.364 C 683.495 391.229 714.68 433.571 744.894 433.486 C 756.964 433.452 765.347 419.156 751.287 413.346 C 725.16 402.55 694.919 398.362 673.474 378.357 C 645.541 352.718 646.555 310.253 669.711 281.901 C 689.181 258.074 717.138 249.446 746.708 246.369 z"
                }
              ></path>
              <path
                className={"dzl"}
                style={{ "--i": "3" } as CSSProperties}
                d={
                  "M 863.516 167.966 C 873.737 137.007 899.73 123.047 932.125 132.508 C 952.868 138.566 966.402 159.263 965.685 180.148 C 965.75 196.062 965.859 211.762 965.836 227.564 L 965.881 308.347 L 965.882 399.361 C 965.88 414.505 965.947 429.72 965.879 444.843 C 965.792 464.387 966.794 480.031 951.256 494.257 C 926.073 517.312 881.114 512.064 866.395 479.708 C 865.286 477.263 864.347 474.744 863.583 472.169 C 863.726 471.696 863.857 471.22 863.977 470.74 C 865.849 463.228 865.157 382.774 865.173 370.622 L 865.188 232.915 C 865.152 213.216 865.123 193.353 865.303 173.641 C 865.321 171.635 864.547 169.684 863.516 167.966 z"
                }
              ></path>
              <path
                className={"dzl"}
                style={{ "--i": "4" } as CSSProperties}
                d={
                  "M 1064.61 478.091 C 1062.19 482.312 1059.43 487.005 1056.1 490.565 C 1047.53 499.765 1035.66 505.18 1023.1 505.617 C 994.08 506.576 976.821 485.044 976.997 457.242 C 977.272 413.793 976.717 370.28 976.906 326.828 C 976.989 307.589 974.875 290.194 989.328 275.211 C 997.857 266.437 1009.57 261.482 1021.81 261.472 C 1041.3 261.305 1062.98 275.377 1066.05 295.058 C 1068.53 311.003 1067.54 331.298 1067.57 347.608 L 1067.45 454.406 C 1067.43 463.79 1067.11 469.002 1064.61 478.091 z M 979.893 440.324 C 980.04 429.183 980.411 417.145 979.912 406.096 L 979.19 405.368 C 979.149 410.959 978.586 436.757 979.893 440.324 z"
                }
              ></path>
              <path
                className={"dzl"}
                style={{ "--i": "5" } as CSSProperties}
                d={
                  "M 1018.37 160.415 C 1043.22 158.306 1065.1 176.673 1067.34 201.514 C 1069.57 226.354 1051.31 248.329 1026.48 250.686 C 1001.48 253.059 979.311 234.643 977.063 209.627 C 974.815 184.611 993.341 162.538 1018.37 160.415 z"
                }
              ></path>
              <path
                className={"dzl"}
                style={{ "--i": "6" } as CSSProperties}
                d={
                  "M 1174.62 329.945 C 1149.69 329.708 1105.1 335.752 1086.99 317.984 C 1072.42 303.697 1073.14 274.082 1088.57 260.509 C 1101.23 248.521 1116.35 249.212 1132.45 249.383 C 1173.79 249.821 1214.99 249.634 1256.32 249.483 C 1268.9 249.438 1281.21 253.178 1289.98 262.534 C 1297.43 270.612 1301.33 281.329 1300.83 292.302 C 1300.12 310.677 1289.72 322.98 1277.19 335.139 C 1249.18 362.311 1223.19 395.168 1195.23 422.078 C 1218.71 422.253 1246.82 420.628 1269.81 423.687 C 1287 425.976 1301.25 445.413 1301.14 463.128 C 1301.09 474.191 1296.67 484.787 1288.85 492.606 C 1272.65 508.574 1250.61 503.54 1229.91 504.395 C 1223.02 504.679 1215.61 504.362 1208.67 504.343 C 1179.85 504.457 1151.04 504.424 1122.23 504.244 C 1096.13 503.91 1077.14 494.016 1073.49 466.086 C 1073.29 459.51 1073.55 456.393 1074.35 449.836 C 1081.27 424.553 1098.62 410.602 1116.13 392.027 L 1174.62 329.945 z"
                }
              ></path>
              <path
                className={"dzl"}
                style={{ "--i": "7" } as CSSProperties}
                d={
                  "M 1476.05 481.966 C 1439.8 509.542 1395.86 513.903 1355.02 492.965 C 1326.26 478.01 1304.68 452.184 1295.06 421.233 C 1283.97 387.449 1286.88 350.63 1303.14 319.009 C 1319.8 287.355 1348.31 263.584 1382.45 252.895 C 1450.75 231.191 1531.36 260.64 1554.28 332.812 C 1558.48 348.445 1560.35 362.188 1560.15 378.52 C 1559.78 407.954 1561.44 437.844 1559.41 467.19 C 1558.75 476.707 1552.1 486.858 1545.62 493.572 C 1522.56 513.415 1491.7 508.095 1476.05 481.966 z M 1431.41 421.381 C 1456.72 416.437 1473.22 391.889 1468.24 366.579 C 1463.26 341.27 1438.69 324.803 1413.39 329.819 C 1388.14 334.825 1371.71 359.337 1376.68 384.595 C 1381.65 409.854 1406.14 426.315 1431.41 421.381 z"
                }
              ></path>
              <path
                className={"dzl"}
                style={{ "--i": "8" } as CSSProperties}
                d={
                  "M 1709.81 248.403 C 1735.56 246.956 1760.99 254.733 1781.52 270.34 C 1863.73 333.091 1832.91 489.747 1722.23 503.184 C 1697.28 506.35 1672.1 499.431 1652.28 483.962 C 1651.74 503.416 1653.72 556.712 1650.84 572.547 C 1647.68 583.678 1642.02 592.928 1632.25 599.408 C 1622.85 605.558 1611.39 607.717 1600.4 605.409 C 1589.83 603.186 1580.6 596.794 1574.81 587.68 C 1564.74 572.031 1567.75 541.564 1567.8 522.487 L 1567.8 448.538 L 1567.81 345.15 C 1567.82 333.639 1567.92 321.947 1567.87 310.453 C 1567.78 288.79 1567.62 269.963 1588.17 257.275 C 1597.94 251.283 1609.72 249.488 1620.83 252.294 C 1633.93 255.503 1641.33 263.361 1648.03 274.385 C 1669.23 257.885 1682.62 251.187 1709.81 248.403 z M 1696.48 422.219 C 1722.65 421.412 1743.24 399.586 1742.52 373.409 C 1741.8 347.232 1720.04 326.57 1693.87 327.202 C 1667.56 327.838 1646.78 349.721 1647.5 376.021 C 1648.23 402.322 1670.18 423.03 1696.48 422.219 z"
                }
              ></path>
              <path
                className={"dzl"}
                style={{ "--i": "9" } as CSSProperties}
                d={
                  "M 1979.02 248.419 C 2002.13 247.63 2026.15 255.548 2044.8 268.907 C 2101.6 309.369 2107.21 399.958 2067.81 454.308 C 2032.54 502.949 1968.76 521.207 1918.28 484.006 C 1918.51 508.512 1921.59 560.468 1913.96 581.496 C 1910.91 588.446 1904.35 595.385 1898.05 599.51 C 1888.62 605.692 1877.09 607.788 1866.08 605.32 C 1854.91 602.868 1845.2 596.022 1839.14 586.326 C 1830.04 571.924 1832.4 539.665 1832.41 522.171 L 1832.51 447.004 C 1832.22 410.992 1832.19 374.978 1832.41 338.965 C 1832.44 329.369 1831.47 288.105 1834.59 280.083 C 1848.33 244.771 1892.68 239.942 1913.31 274.512 C 1935.66 256.511 1950.42 250.385 1979.02 248.419 z M 1968.4 421.448 C 1994.25 416.696 2011.33 391.854 2006.51 366.014 C 2001.69 340.174 1976.8 323.159 1950.98 328.045 C 1925.24 332.914 1908.3 357.69 1913.11 383.435 C 1917.91 409.18 1942.64 426.183 1968.4 421.448 z"
                }
              ></path>
            </g>
          </svg>
          <span className={"irapp"} aria-hidden={"true"}>
            <svg
              className={"dziso"}
              viewBox={"0 0 160 160"}
              aria-hidden={"true"}
              focusable={"false"}
            >
              <rect
                width={"160"}
                height={"160"}
                rx={"42"}
                fill={"var(--dzib,#FDCFB4)"}
              ></rect>
              <g
                fill={"var(--dzif,#0E44A8)"}
                transform={
                  "translate(80 80) scale(0.0649) translate(-1071.4 -1074.0)"
                }
              >
                <path
                  d={
                    "M 1397.81 181.597 L 1399.37 181.418 C 1474.76 173.457 1515.96 228.576 1563.34 275.986 L 1682.37 395.158 L 1743.41 456.216 C 1776.8 489.111 1807.74 515.126 1811.93 565.504 C 1814.86 597.072 1804.83 628.474 1784.16 652.509 C 1743.3 699.895 1672.96 706.531 1622.03 672.015 C 1601.79 658.297 1584.49 641.12 1566.16 625.051 C 1565.48 648.301 1566.54 670.225 1566.53 693.128 L 1566.03 820.5 L 1565.96 1201.18 L 1566.01 1328.71 C 1566.03 1384.22 1567.44 1428.77 1556.24 1484.08 C 1539.52 1569.65 1502.85 1650.07 1449.21 1718.8 C 1343.97 1854.25 1188.8 1941.82 1018.45 1961.88 C 852.575 1983.08 680.919 1941.51 547.942 1838.79 C 490.881 1797.23 440.168 1737.52 403.618 1677.59 C 303.703 1513.77 308.583 1298.03 402.048 1132.52 C 486.662 981.888 627.919 871.279 794.445 825.257 C 909.155 793.2 1031.18 799.329 1142.1 842.717 C 1177.06 856.432 1201.54 869.496 1233.67 887.693 L 1233.95 626.07 C 1199.68 657.443 1168.99 690.651 1120.41 695.89 C 1091.13 699.049 1060.52 690.24 1037.54 671.926 C 1014.07 652.902 999.219 625.259 996.305 595.191 C 988.752 524.109 1032.42 490.262 1078.13 446.305 L 1171.17 356.674 L 1269.16 262.171 C 1309.76 222.942 1337.58 187.223 1397.81 181.597 z M 939.37 1639.14 C 1079.22 1635.35 1201.99 1511.69 1199.66 1370.5 C 1198.63 1308.17 1167.11 1246.11 1122.13 1204.19 C 1077.39 1161.88 1012.51 1134.82 950.39 1137.32 C 949.569 1137.35 948.749 1137.4 947.929 1137.46 C 802.864 1143.5 681.492 1266.03 687.879 1413.05 C 690.854 1475.64 718.482 1534.5 764.727 1576.78 C 808.91 1617.09 875.858 1642.57 935.684 1639.39 C 936.913 1639.32 938.142 1639.24 939.37 1639.14 z"
                  }
                ></path>
              </g>
            </svg>
          </span>
          <span className={"irrot"} aria-hidden={"true"}>
            <span>{"Desliza."}</span>
            <span>{"Aaah."}</span>
            <span>{"Escribe."}</span>
          </span>
        </div>
        <div className={"shade ov"}></div>
        <div className={"topmeta ov dzmeta"}>
          <span>{"Hecho con"}</span>
          <svg
            className={"dzword"}
            viewBox={"80 124 2020 488"}
            aria-hidden={"true"}
            focusable={"false"}
          >
            <g fill={"currentColor"}>
              <path
                d={
                  "M 282.722 259.823 C 283.541 235.527 282.474 210.493 282.749 186.108 C 282.931 169.96 285.742 155.631 297.881 143.9 C 307.656 134.392 320.866 129.253 334.496 129.655 C 354.588 130.101 380.86 145.088 383.737 166.625 C 386.548 187.678 385.245 214.253 385.083 236.01 C 384.777 277.158 386.027 318.892 384.968 359.974 C 384.598 364.088 383.245 378.433 384.199 381.429 C 364.648 532.277 143.616 554.2 95.3531 430.954 C 82.932 398.892 83.9181 363.182 98.0898 331.853 C 113.595 297.499 142.119 270.716 177.381 257.403 C 213.234 243.7 247.424 244.096 282.722 259.823 z M 239.545 431.145 C 266.86 427.118 285.795 401.786 281.923 374.448 C 278.051 347.11 252.827 328.032 225.468 331.748 C 197.888 335.494 178.622 360.967 182.525 388.525 C 186.427 416.084 212.009 435.205 239.545 431.145 z"
                }
              ></path>
              <path
                d={
                  "M 386.209 359.948 C 391.291 324.813 405.28 295.081 434.631 273.266 C 490.341 231.859 580.098 238.399 622.449 296.043 C 639.453 319.188 657.719 368.98 628.608 390.249 C 615.045 400.159 588.482 397.796 571.739 398.499 C 541.181 399.783 509.699 398.577 479.165 400.301 C 485.315 414.555 493.065 423.559 508.013 429.442 C 522.746 435.131 539.14 434.709 553.561 428.268 C 565.435 423.076 573.877 413.434 586.728 409.887 C 604.255 404.817 627.068 409.326 634.988 427.738 C 648.866 460.001 613.08 481.751 588.183 492.346 C 519.049 521.767 426.54 504.533 394.971 429.491 C 391.111 420.317 386.214 403.932 385.912 393.452 C 386.348 382.26 385.644 371.089 386.209 359.948 z M 476.525 348.793 C 491.631 348.961 506.739 348.738 521.833 348.124 C 532.858 347.973 545.482 348.071 556.333 347.169 C 549.057 325.445 533.693 313.518 510.203 317.389 C 492.379 321.622 482.315 331.349 476.525 348.793 z"
                }
              ></path>
              <path
                d={
                  "M 746.708 246.369 C 776.669 244.862 812.705 248.451 836.662 268.289 C 852.947 281.775 854.998 308.051 840.281 323.58 C 835.711 328.339 830.001 331.854 823.693 333.79 C 796.328 342.46 781.862 314.749 755.11 315.854 C 742.276 314.869 736.97 331.028 750.381 335.319 C 792.609 348.83 850.456 356.591 855.275 412.328 C 860.384 471.418 806.946 501.664 753.972 506.083 C 751.346 506.287 748.716 506.424 746.083 506.495 C 710.738 507.557 643.95 494.681 643.115 450.026 C 642.924 439.35 646.99 429.037 654.415 421.364 C 683.495 391.229 714.68 433.571 744.894 433.486 C 756.964 433.452 765.347 419.156 751.287 413.346 C 725.16 402.55 694.919 398.362 673.474 378.357 C 645.541 352.718 646.555 310.253 669.711 281.901 C 689.181 258.074 717.138 249.446 746.708 246.369 z"
                }
              ></path>
              <path
                d={
                  "M 863.516 167.966 C 873.737 137.007 899.73 123.047 932.125 132.508 C 952.868 138.566 966.402 159.263 965.685 180.148 C 965.75 196.062 965.859 211.762 965.836 227.564 L 965.881 308.347 L 965.882 399.361 C 965.88 414.505 965.947 429.72 965.879 444.843 C 965.792 464.387 966.794 480.031 951.256 494.257 C 926.073 517.312 881.114 512.064 866.395 479.708 C 865.286 477.263 864.347 474.744 863.583 472.169 C 863.726 471.696 863.857 471.22 863.977 470.74 C 865.849 463.228 865.157 382.774 865.173 370.622 L 865.188 232.915 C 865.152 213.216 865.123 193.353 865.303 173.641 C 865.321 171.635 864.547 169.684 863.516 167.966 z"
                }
              ></path>
              <path
                d={
                  "M 1064.61 478.091 C 1062.19 482.312 1059.43 487.005 1056.1 490.565 C 1047.53 499.765 1035.66 505.18 1023.1 505.617 C 994.08 506.576 976.821 485.044 976.997 457.242 C 977.272 413.793 976.717 370.28 976.906 326.828 C 976.989 307.589 974.875 290.194 989.328 275.211 C 997.857 266.437 1009.57 261.482 1021.81 261.472 C 1041.3 261.305 1062.98 275.377 1066.05 295.058 C 1068.53 311.003 1067.54 331.298 1067.57 347.608 L 1067.45 454.406 C 1067.43 463.79 1067.11 469.002 1064.61 478.091 z M 979.893 440.324 C 980.04 429.183 980.411 417.145 979.912 406.096 L 979.19 405.368 C 979.149 410.959 978.586 436.757 979.893 440.324 z"
                }
              ></path>
              <path
                d={
                  "M 1018.37 160.415 C 1043.22 158.306 1065.1 176.673 1067.34 201.514 C 1069.57 226.354 1051.31 248.329 1026.48 250.686 C 1001.48 253.059 979.311 234.643 977.063 209.627 C 974.815 184.611 993.341 162.538 1018.37 160.415 z"
                }
              ></path>
              <path
                d={
                  "M 1174.62 329.945 C 1149.69 329.708 1105.1 335.752 1086.99 317.984 C 1072.42 303.697 1073.14 274.082 1088.57 260.509 C 1101.23 248.521 1116.35 249.212 1132.45 249.383 C 1173.79 249.821 1214.99 249.634 1256.32 249.483 C 1268.9 249.438 1281.21 253.178 1289.98 262.534 C 1297.43 270.612 1301.33 281.329 1300.83 292.302 C 1300.12 310.677 1289.72 322.98 1277.19 335.139 C 1249.18 362.311 1223.19 395.168 1195.23 422.078 C 1218.71 422.253 1246.82 420.628 1269.81 423.687 C 1287 425.976 1301.25 445.413 1301.14 463.128 C 1301.09 474.191 1296.67 484.787 1288.85 492.606 C 1272.65 508.574 1250.61 503.54 1229.91 504.395 C 1223.02 504.679 1215.61 504.362 1208.67 504.343 C 1179.85 504.457 1151.04 504.424 1122.23 504.244 C 1096.13 503.91 1077.14 494.016 1073.49 466.086 C 1073.29 459.51 1073.55 456.393 1074.35 449.836 C 1081.27 424.553 1098.62 410.602 1116.13 392.027 L 1174.62 329.945 z"
                }
              ></path>
              <path
                d={
                  "M 1476.05 481.966 C 1439.8 509.542 1395.86 513.903 1355.02 492.965 C 1326.26 478.01 1304.68 452.184 1295.06 421.233 C 1283.97 387.449 1286.88 350.63 1303.14 319.009 C 1319.8 287.355 1348.31 263.584 1382.45 252.895 C 1450.75 231.191 1531.36 260.64 1554.28 332.812 C 1558.48 348.445 1560.35 362.188 1560.15 378.52 C 1559.78 407.954 1561.44 437.844 1559.41 467.19 C 1558.75 476.707 1552.1 486.858 1545.62 493.572 C 1522.56 513.415 1491.7 508.095 1476.05 481.966 z M 1431.41 421.381 C 1456.72 416.437 1473.22 391.889 1468.24 366.579 C 1463.26 341.27 1438.69 324.803 1413.39 329.819 C 1388.14 334.825 1371.71 359.337 1376.68 384.595 C 1381.65 409.854 1406.14 426.315 1431.41 421.381 z"
                }
              ></path>
              <path
                d={
                  "M 1709.81 248.403 C 1735.56 246.956 1760.99 254.733 1781.52 270.34 C 1863.73 333.091 1832.91 489.747 1722.23 503.184 C 1697.28 506.35 1672.1 499.431 1652.28 483.962 C 1651.74 503.416 1653.72 556.712 1650.84 572.547 C 1647.68 583.678 1642.02 592.928 1632.25 599.408 C 1622.85 605.558 1611.39 607.717 1600.4 605.409 C 1589.83 603.186 1580.6 596.794 1574.81 587.68 C 1564.74 572.031 1567.75 541.564 1567.8 522.487 L 1567.8 448.538 L 1567.81 345.15 C 1567.82 333.639 1567.92 321.947 1567.87 310.453 C 1567.78 288.79 1567.62 269.963 1588.17 257.275 C 1597.94 251.283 1609.72 249.488 1620.83 252.294 C 1633.93 255.503 1641.33 263.361 1648.03 274.385 C 1669.23 257.885 1682.62 251.187 1709.81 248.403 z M 1696.48 422.219 C 1722.65 421.412 1743.24 399.586 1742.52 373.409 C 1741.8 347.232 1720.04 326.57 1693.87 327.202 C 1667.56 327.838 1646.78 349.721 1647.5 376.021 C 1648.23 402.322 1670.18 423.03 1696.48 422.219 z"
                }
              ></path>
              <path
                d={
                  "M 1979.02 248.419 C 2002.13 247.63 2026.15 255.548 2044.8 268.907 C 2101.6 309.369 2107.21 399.958 2067.81 454.308 C 2032.54 502.949 1968.76 521.207 1918.28 484.006 C 1918.51 508.512 1921.59 560.468 1913.96 581.496 C 1910.91 588.446 1904.35 595.385 1898.05 599.51 C 1888.62 605.692 1877.09 607.788 1866.08 605.32 C 1854.91 602.868 1845.2 596.022 1839.14 586.326 C 1830.04 571.924 1832.4 539.665 1832.41 522.171 L 1832.51 447.004 C 1832.22 410.992 1832.19 374.978 1832.41 338.965 C 1832.44 329.369 1831.47 288.105 1834.59 280.083 C 1848.33 244.771 1892.68 239.942 1913.31 274.512 C 1935.66 256.511 1950.42 250.385 1979.02 248.419 z M 1968.4 421.448 C 1994.25 416.696 2011.33 391.854 2006.51 366.014 C 2001.69 340.174 1976.8 323.159 1950.98 328.045 C 1925.24 332.914 1908.3 357.69 1913.11 383.435 C 1917.91 409.18 1942.64 426.183 1968.4 421.448 z"
                }
              ></path>
            </g>
          </svg>
        </div>
        <div className={"cap ov"}>
          <div className={"who"}>{"deslizapp"}</div>
          <h2>
            {"Ese "}
            <em>{"aaah"}</em>
            {" ya tiene nombre."}
          </h2>
          <p className={"txt"}>
            {
              "Y tu tienda puede tener el suyo. Tus clientes ya saben usarla; solo falta que exista."
            }
          </p>
          <div className={"irbtns"}>
            <button type={"button"} className={"ihow"} data-vv={true}>
              {"¿Cómo funciona?"}
            </button>
            <a
              className={"iwa"}
              href={contacto}
              target={"_blank"}
              rel={"noopener"}
            >
              <svg
                viewBox={"0 0 24 24"}
                aria-hidden={"true"}
                fill={"currentColor"}
              >
                <path
                  d={
                    "M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.1l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.8 11.9 11.9 0 0 0 4.6 4c1.7.7 2.3.8 3.2.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.2-.2-.5-.3z"
                  }
                ></path>
              </svg>
              {"Escríbenos"}
            </a>
          </div>
        </div>
      </div>
    </article>
  );
}
export function MarcaDeslizapp() {
  return (
    <svg
      className={"dzword"}
      viewBox={"80 124 2020 488"}
      aria-hidden={"true"}
      focusable={"false"}
    >
      <g fill={"currentColor"}>
        <path
          d={
            "M 282.722 259.823 C 283.541 235.527 282.474 210.493 282.749 186.108 C 282.931 169.96 285.742 155.631 297.881 143.9 C 307.656 134.392 320.866 129.253 334.496 129.655 C 354.588 130.101 380.86 145.088 383.737 166.625 C 386.548 187.678 385.245 214.253 385.083 236.01 C 384.777 277.158 386.027 318.892 384.968 359.974 C 384.598 364.088 383.245 378.433 384.199 381.429 C 364.648 532.277 143.616 554.2 95.3531 430.954 C 82.932 398.892 83.9181 363.182 98.0898 331.853 C 113.595 297.499 142.119 270.716 177.381 257.403 C 213.234 243.7 247.424 244.096 282.722 259.823 z M 239.545 431.145 C 266.86 427.118 285.795 401.786 281.923 374.448 C 278.051 347.11 252.827 328.032 225.468 331.748 C 197.888 335.494 178.622 360.967 182.525 388.525 C 186.427 416.084 212.009 435.205 239.545 431.145 z"
          }
        ></path>
        <path
          d={
            "M 386.209 359.948 C 391.291 324.813 405.28 295.081 434.631 273.266 C 490.341 231.859 580.098 238.399 622.449 296.043 C 639.453 319.188 657.719 368.98 628.608 390.249 C 615.045 400.159 588.482 397.796 571.739 398.499 C 541.181 399.783 509.699 398.577 479.165 400.301 C 485.315 414.555 493.065 423.559 508.013 429.442 C 522.746 435.131 539.14 434.709 553.561 428.268 C 565.435 423.076 573.877 413.434 586.728 409.887 C 604.255 404.817 627.068 409.326 634.988 427.738 C 648.866 460.001 613.08 481.751 588.183 492.346 C 519.049 521.767 426.54 504.533 394.971 429.491 C 391.111 420.317 386.214 403.932 385.912 393.452 C 386.348 382.26 385.644 371.089 386.209 359.948 z M 476.525 348.793 C 491.631 348.961 506.739 348.738 521.833 348.124 C 532.858 347.973 545.482 348.071 556.333 347.169 C 549.057 325.445 533.693 313.518 510.203 317.389 C 492.379 321.622 482.315 331.349 476.525 348.793 z"
          }
        ></path>
        <path
          d={
            "M 746.708 246.369 C 776.669 244.862 812.705 248.451 836.662 268.289 C 852.947 281.775 854.998 308.051 840.281 323.58 C 835.711 328.339 830.001 331.854 823.693 333.79 C 796.328 342.46 781.862 314.749 755.11 315.854 C 742.276 314.869 736.97 331.028 750.381 335.319 C 792.609 348.83 850.456 356.591 855.275 412.328 C 860.384 471.418 806.946 501.664 753.972 506.083 C 751.346 506.287 748.716 506.424 746.083 506.495 C 710.738 507.557 643.95 494.681 643.115 450.026 C 642.924 439.35 646.99 429.037 654.415 421.364 C 683.495 391.229 714.68 433.571 744.894 433.486 C 756.964 433.452 765.347 419.156 751.287 413.346 C 725.16 402.55 694.919 398.362 673.474 378.357 C 645.541 352.718 646.555 310.253 669.711 281.901 C 689.181 258.074 717.138 249.446 746.708 246.369 z"
          }
        ></path>
        <path
          d={
            "M 863.516 167.966 C 873.737 137.007 899.73 123.047 932.125 132.508 C 952.868 138.566 966.402 159.263 965.685 180.148 C 965.75 196.062 965.859 211.762 965.836 227.564 L 965.881 308.347 L 965.882 399.361 C 965.88 414.505 965.947 429.72 965.879 444.843 C 965.792 464.387 966.794 480.031 951.256 494.257 C 926.073 517.312 881.114 512.064 866.395 479.708 C 865.286 477.263 864.347 474.744 863.583 472.169 C 863.726 471.696 863.857 471.22 863.977 470.74 C 865.849 463.228 865.157 382.774 865.173 370.622 L 865.188 232.915 C 865.152 213.216 865.123 193.353 865.303 173.641 C 865.321 171.635 864.547 169.684 863.516 167.966 z"
          }
        ></path>
        <path
          d={
            "M 1064.61 478.091 C 1062.19 482.312 1059.43 487.005 1056.1 490.565 C 1047.53 499.765 1035.66 505.18 1023.1 505.617 C 994.08 506.576 976.821 485.044 976.997 457.242 C 977.272 413.793 976.717 370.28 976.906 326.828 C 976.989 307.589 974.875 290.194 989.328 275.211 C 997.857 266.437 1009.57 261.482 1021.81 261.472 C 1041.3 261.305 1062.98 275.377 1066.05 295.058 C 1068.53 311.003 1067.54 331.298 1067.57 347.608 L 1067.45 454.406 C 1067.43 463.79 1067.11 469.002 1064.61 478.091 z M 979.893 440.324 C 980.04 429.183 980.411 417.145 979.912 406.096 L 979.19 405.368 C 979.149 410.959 978.586 436.757 979.893 440.324 z"
          }
        ></path>
        <path
          d={
            "M 1018.37 160.415 C 1043.22 158.306 1065.1 176.673 1067.34 201.514 C 1069.57 226.354 1051.31 248.329 1026.48 250.686 C 1001.48 253.059 979.311 234.643 977.063 209.627 C 974.815 184.611 993.341 162.538 1018.37 160.415 z"
          }
        ></path>
        <path
          d={
            "M 1174.62 329.945 C 1149.69 329.708 1105.1 335.752 1086.99 317.984 C 1072.42 303.697 1073.14 274.082 1088.57 260.509 C 1101.23 248.521 1116.35 249.212 1132.45 249.383 C 1173.79 249.821 1214.99 249.634 1256.32 249.483 C 1268.9 249.438 1281.21 253.178 1289.98 262.534 C 1297.43 270.612 1301.33 281.329 1300.83 292.302 C 1300.12 310.677 1289.72 322.98 1277.19 335.139 C 1249.18 362.311 1223.19 395.168 1195.23 422.078 C 1218.71 422.253 1246.82 420.628 1269.81 423.687 C 1287 425.976 1301.25 445.413 1301.14 463.128 C 1301.09 474.191 1296.67 484.787 1288.85 492.606 C 1272.65 508.574 1250.61 503.54 1229.91 504.395 C 1223.02 504.679 1215.61 504.362 1208.67 504.343 C 1179.85 504.457 1151.04 504.424 1122.23 504.244 C 1096.13 503.91 1077.14 494.016 1073.49 466.086 C 1073.29 459.51 1073.55 456.393 1074.35 449.836 C 1081.27 424.553 1098.62 410.602 1116.13 392.027 L 1174.62 329.945 z"
          }
        ></path>
        <path
          d={
            "M 1476.05 481.966 C 1439.8 509.542 1395.86 513.903 1355.02 492.965 C 1326.26 478.01 1304.68 452.184 1295.06 421.233 C 1283.97 387.449 1286.88 350.63 1303.14 319.009 C 1319.8 287.355 1348.31 263.584 1382.45 252.895 C 1450.75 231.191 1531.36 260.64 1554.28 332.812 C 1558.48 348.445 1560.35 362.188 1560.15 378.52 C 1559.78 407.954 1561.44 437.844 1559.41 467.19 C 1558.75 476.707 1552.1 486.858 1545.62 493.572 C 1522.56 513.415 1491.7 508.095 1476.05 481.966 z M 1431.41 421.381 C 1456.72 416.437 1473.22 391.889 1468.24 366.579 C 1463.26 341.27 1438.69 324.803 1413.39 329.819 C 1388.14 334.825 1371.71 359.337 1376.68 384.595 C 1381.65 409.854 1406.14 426.315 1431.41 421.381 z"
          }
        ></path>
        <path
          d={
            "M 1709.81 248.403 C 1735.56 246.956 1760.99 254.733 1781.52 270.34 C 1863.73 333.091 1832.91 489.747 1722.23 503.184 C 1697.28 506.35 1672.1 499.431 1652.28 483.962 C 1651.74 503.416 1653.72 556.712 1650.84 572.547 C 1647.68 583.678 1642.02 592.928 1632.25 599.408 C 1622.85 605.558 1611.39 607.717 1600.4 605.409 C 1589.83 603.186 1580.6 596.794 1574.81 587.68 C 1564.74 572.031 1567.75 541.564 1567.8 522.487 L 1567.8 448.538 L 1567.81 345.15 C 1567.82 333.639 1567.92 321.947 1567.87 310.453 C 1567.78 288.79 1567.62 269.963 1588.17 257.275 C 1597.94 251.283 1609.72 249.488 1620.83 252.294 C 1633.93 255.503 1641.33 263.361 1648.03 274.385 C 1669.23 257.885 1682.62 251.187 1709.81 248.403 z M 1696.48 422.219 C 1722.65 421.412 1743.24 399.586 1742.52 373.409 C 1741.8 347.232 1720.04 326.57 1693.87 327.202 C 1667.56 327.838 1646.78 349.721 1647.5 376.021 C 1648.23 402.322 1670.18 423.03 1696.48 422.219 z"
          }
        ></path>
        <path
          d={
            "M 1979.02 248.419 C 2002.13 247.63 2026.15 255.548 2044.8 268.907 C 2101.6 309.369 2107.21 399.958 2067.81 454.308 C 2032.54 502.949 1968.76 521.207 1918.28 484.006 C 1918.51 508.512 1921.59 560.468 1913.96 581.496 C 1910.91 588.446 1904.35 595.385 1898.05 599.51 C 1888.62 605.692 1877.09 607.788 1866.08 605.32 C 1854.91 602.868 1845.2 596.022 1839.14 586.326 C 1830.04 571.924 1832.4 539.665 1832.41 522.171 L 1832.51 447.004 C 1832.22 410.992 1832.19 374.978 1832.41 338.965 C 1832.44 329.369 1831.47 288.105 1834.59 280.083 C 1848.33 244.771 1892.68 239.942 1913.31 274.512 C 1935.66 256.511 1950.42 250.385 1979.02 248.419 z M 1968.4 421.448 C 1994.25 416.696 2011.33 391.854 2006.51 366.014 C 2001.69 340.174 1976.8 323.159 1950.98 328.045 C 1925.24 332.914 1908.3 357.69 1913.11 383.435 C 1917.91 409.18 1942.64 426.183 1968.4 421.448 z"
          }
        ></path>
      </g>
    </svg>
  );
}
export function IsotipoDeslizapp() {
  return (
    <svg
      className={"dziso"}
      viewBox={"0 0 160 160"}
      aria-hidden={"true"}
      focusable={"false"}
    >
      <rect
        width={"160"}
        height={"160"}
        rx={"42"}
        fill={"var(--dzib,#FDCFB4)"}
      ></rect>
      <g
        fill={"var(--dzif,#0E44A8)"}
        transform={"translate(80 80) scale(0.0649) translate(-1071.4 -1074.0)"}
      >
        <path
          d={
            "M 1397.81 181.597 L 1399.37 181.418 C 1474.76 173.457 1515.96 228.576 1563.34 275.986 L 1682.37 395.158 L 1743.41 456.216 C 1776.8 489.111 1807.74 515.126 1811.93 565.504 C 1814.86 597.072 1804.83 628.474 1784.16 652.509 C 1743.3 699.895 1672.96 706.531 1622.03 672.015 C 1601.79 658.297 1584.49 641.12 1566.16 625.051 C 1565.48 648.301 1566.54 670.225 1566.53 693.128 L 1566.03 820.5 L 1565.96 1201.18 L 1566.01 1328.71 C 1566.03 1384.22 1567.44 1428.77 1556.24 1484.08 C 1539.52 1569.65 1502.85 1650.07 1449.21 1718.8 C 1343.97 1854.25 1188.8 1941.82 1018.45 1961.88 C 852.575 1983.08 680.919 1941.51 547.942 1838.79 C 490.881 1797.23 440.168 1737.52 403.618 1677.59 C 303.703 1513.77 308.583 1298.03 402.048 1132.52 C 486.662 981.888 627.919 871.279 794.445 825.257 C 909.155 793.2 1031.18 799.329 1142.1 842.717 C 1177.06 856.432 1201.54 869.496 1233.67 887.693 L 1233.95 626.07 C 1199.68 657.443 1168.99 690.651 1120.41 695.89 C 1091.13 699.049 1060.52 690.24 1037.54 671.926 C 1014.07 652.902 999.219 625.259 996.305 595.191 C 988.752 524.109 1032.42 490.262 1078.13 446.305 L 1171.17 356.674 L 1269.16 262.171 C 1309.76 222.942 1337.58 187.223 1397.81 181.597 z M 939.37 1639.14 C 1079.22 1635.35 1201.99 1511.69 1199.66 1370.5 C 1198.63 1308.17 1167.11 1246.11 1122.13 1204.19 C 1077.39 1161.88 1012.51 1134.82 950.39 1137.32 C 949.569 1137.35 948.749 1137.4 947.929 1137.46 C 802.864 1143.5 681.492 1266.03 687.879 1413.05 C 690.854 1475.64 718.482 1534.5 764.727 1576.78 C 808.91 1617.09 875.858 1642.57 935.684 1639.39 C 936.913 1639.32 938.142 1639.24 939.37 1639.14 z"
          }
        ></path>
      </g>
    </svg>
  );
}
