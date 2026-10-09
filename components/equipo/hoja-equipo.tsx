"use client";

import { useRef, useState } from "react";
import { useConsulta, useTiendaActiva } from "@/lib/data/consulta";
import { mensajeDeError } from "@/lib/data/errores";
import { useData } from "@/lib/data/provider";
import {
  correoValido,
  inicialesPersona,
  mensajeInvitacion,
  NIVELES,
  NOMBRE_NIVEL,
  NOTA_MAX,
  textoVence,
  urlUnirse,
  type EnlaceEquipo,
  type MiembroEquipo,
  type Nivel,
  type SolicitudEquipo,
} from "@/lib/equipo";
import { Hoja } from "../hoja";
import { useToast } from "../toast";
import { Boton, Campo, Etiqueta, GrupoOpciones } from "../ui";
import { IconoPersona, IconoSobre } from "../iconos";

const OPCIONES_NIVEL = NIVELES.map((n) => ({ id: n.id, texto: n.nombre }));

/**
 * «Tu equipo» (solo la dueña): quién está, quién espera su visto bueno, los enlaces activos e invitar por enlace o por correo.
 * La base exige todo (`equipo_de_tienda`, `aprobar_miembro`…); aquí solo se muestra y se llama. Hoja "grande": tiene campos.
 */
export function HojaEquipo({ abierta, alCerrar }: { abierta: boolean; alCerrar: () => void }) {
  const { tiendaId, tienda } = useTiendaActiva();
  return (
    <Hoja abierta={abierta} alCerrar={alCerrar} titulo="Tu equipo" altura="grande">
      {abierta && <Contenido key={tiendaId} tiendaId={tiendaId} nombreTienda={tienda?.nombre ?? "tu tienda"} />}
    </Hoja>
  );
}

type Formulario = null | "enlace" | "correo";

function Contenido({ tiendaId, nombreTienda }: { tiendaId: string; nombreTienda: string }) {
  const { getEquipo } = useData();
  const { data: equipo, error, reintentar } = useConsulta(`equipo:${tiendaId}`, () => getEquipo(tiendaId));
  const [formulario, setFormulario] = useState<Formulario>(null);
  // El código de un enlace nuevo solo existe aquí, mientras la hoja está abierta (la base guarda solo su hash).
  const [recienCreados, setRecienCreados] = useState<Record<string, string>>({});
  const [ultimoCodigo, setUltimoCodigo] = useState<string | null>(null);

  if (error && !equipo) {
    return (
      <div className="flex flex-col gap-3" role="alert">
        <p>No pudimos abrir tu equipo.</p>
        <Boton jerarquia="secundario" onClick={reintentar}>Reintentar</Boton>
      </div>
    );
  }
  if (!equipo) return <p role="status" className="text-texto-secundario">Cargando tu equipo…</p>;

  const enlacesConCodigo = equipo.enlaces.map((e) => ({ ...e, codigo: recienCreados[e.id] ?? null }));

  return (
    <div className="flex flex-col gap-6 pb-4" data-hoja-equipo="">
      {equipo.solicitudes.length > 0 && (
        <section aria-labelledby="equipo-esperan">
          <h2 id="equipo-esperan" className="font-display text-destacado font-bold text-bosque">Esperan tu visto bueno</h2>
          <ul className="mt-2 flex flex-col gap-2">
            {equipo.solicitudes.map((s) => (
              <li key={s.id}><FilaSolicitud tiendaId={tiendaId} solicitud={s} /></li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="equipo-quienes">
        <h2 id="equipo-quienes" className="font-display text-destacado font-bold text-bosque">Quiénes están</h2>
        <ul className="mt-2 flex flex-col gap-2">
          {equipo.miembros.map((m) => (
            <li key={m.usuarioId}><FilaMiembro tiendaId={tiendaId} miembro={m} /></li>
          ))}
        </ul>
        {equipo.invitaciones.length > 0 && (
          <ul className="mt-2 flex flex-col gap-1.5 text-secundario text-texto-secundario" aria-label="Invitados por correo">
            {equipo.invitaciones.map((i) => (
              <li key={i.email}>
                <span className="font-bold text-texto">{i.email}</span> · {NOMBRE_NIVEL[i.nivel]} · entra cuando abra Deslizapp con ese correo
              </li>
            ))}
          </ul>
        )}
      </section>

      {ultimoCodigo && <EnlaceNuevo codigo={ultimoCodigo} nombreTienda={nombreTienda} alListo={() => setUltimoCodigo(null)} />}

      {formulario === null && (
        <div className="flex flex-col gap-2.5">
          <Boton anchoCompleto onClick={() => setFormulario("enlace")}>Invitar por enlace</Boton>
          <Boton anchoCompleto jerarquia="secundario" onClick={() => setFormulario("correo")}>Invitar por correo</Boton>
        </div>
      )}
      {formulario === "enlace" && (
        <FormularioEnlace
          tiendaId={tiendaId}
          alCancelar={() => setFormulario(null)}
          alCrear={(id, codigo) => {
            // `id` es null si no se pudo saber con certeza cuál fila es: el enlace igual se muestra aquí, solo que sin «Copiar» en la lista.
            if (id) setRecienCreados((r) => ({ ...r, [id]: codigo }));
            setUltimoCodigo(codigo);
            setFormulario(null);
          }}
        />
      )}
      {formulario === "correo" && <FormularioCorreo tiendaId={tiendaId} alTerminar={() => setFormulario(null)} />}

      {enlacesConCodigo.length > 0 && (
        <section aria-labelledby="equipo-enlaces">
          <h2 id="equipo-enlaces" className="font-display text-destacado font-bold text-bosque">Enlaces activos</h2>
          <p className="mt-1 text-secundario text-texto-secundario">Cada enlace sirve una sola vez. Se muestra solo al crearlo: si lo perdiste, cancélalo y crea otro.</p>
          <ul className="mt-2 flex flex-col gap-2">
            {enlacesConCodigo.map((e) => (
              <li key={e.id}><FilaEnlace tiendaId={tiendaId} enlace={e} nombreTienda={nombreTienda} /></li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function Persona({ nombre, email, foto }: { nombre: string; email: string; foto: string | null }) {
  return (
    <span className="flex min-w-0 flex-1 items-center gap-3">
      {foto ? (
        // eslint-disable-next-line @next/next/no-img-element -- foto de Google de la persona; no pasa por el optimizador
        <img src={foto} alt="" width={40} height={40} referrerPolicy="no-referrer" className="size-10 shrink-0 rounded-full object-cover" />
      ) : (
        <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-full bg-accion-suave font-display font-bold text-bosque">
          {inicialesPersona(nombre, email)}
        </span>
      )}
      <span className="min-w-0">
        <span className="block truncate font-extrabold">{nombre || email || "Sin nombre"}</span>
        {email && <span className="block truncate text-secundario text-texto-secundario">{email}</span>}
      </span>
    </span>
  );
}

function FilaSolicitud({ tiendaId, solicitud }: { tiendaId: string; solicitud: SolicitudEquipo }) {
  const { aprobarSolicitud, rechazarSolicitud } = useData();
  const toast = useToast();
  const [nivel, setNivel] = useState<Nivel>(solicitud.nivel);
  const aprobar = async () => {
    try {
      await aprobarSolicitud(tiendaId, solicitud.id, nivel);
      toast(`${solicitud.nombre || solicitud.email} ya es parte de tu equipo.`);
    } catch (e) {
      toast(mensajeDeError(e));
    }
  };
  const rechazar = async () => {
    try {
      await rechazarSolicitud(tiendaId, solicitud.id);
      toast("Listo. No entra a tu tienda.");
    } catch (e) {
      toast(mensajeDeError(e));
    }
  };
  return (
    <div className="rounded-radio-l border-2 border-atencion bg-atencion-suave p-3.5" data-solicitud="">
      <Persona nombre={solicitud.nombre} email={solicitud.email} foto={null} />
      <p className="mt-2 text-secundario text-texto-secundario">
        Abrió tu enlace{solicitud.nota ? ` «${solicitud.nota}»` : ""}. Elige qué podrá hacer:
      </p>
      <div className="mt-2 overflow-x-auto">
        <GrupoOpciones etiqueta={`Nivel de ${solicitud.nombre || solicitud.email}`} opciones={OPCIONES_NIVEL} valor={nivel} alCambiar={setNivel} compacta />
      </div>
      <p className="mt-1.5 text-secundario text-texto-secundario">{NIVELES.find((n) => n.id === nivel)?.detalle}</p>
      <div className="mt-3 flex gap-2">
        <Boton onClick={aprobar}>Aprobar</Boton>
        <Boton jerarquia="secundario" onClick={rechazar}>Rechazar</Boton>
      </div>
    </div>
  );
}

function FilaMiembro({ tiendaId, miembro }: { tiendaId: string; miembro: MiembroEquipo }) {
  const { cambiarNivelMiembro, quitarMiembro } = useData();
  const toast = useToast();
  const [confirmar, setConfirmar] = useState(false);
  const cambiar = async (nivel: Nivel) => {
    if (nivel === miembro.nivel) return;
    try {
      await cambiarNivelMiembro(tiendaId, miembro.usuarioId, nivel);
      toast(`${miembro.nombre || miembro.email} ahora es ${NOMBRE_NIVEL[nivel]}.`);
    } catch (e) {
      toast(mensajeDeError(e));
    }
  };
  const quitar = async () => {
    if (!confirmar) {
      setConfirmar(true);
      return;
    }
    try {
      await quitarMiembro(tiendaId, miembro.usuarioId);
      toast(`${miembro.nombre || miembro.email} ya no está en tu tienda.`);
    } catch (e) {
      setConfirmar(false);
      toast(mensajeDeError(e));
    }
  };
  return (
    <div className="rounded-radio-l border-[1.5px] border-linea bg-superficie p-3.5" data-miembro={miembro.rol}>
      <div className="flex items-center gap-2">
        <Persona nombre={miembro.nombre} email={miembro.email} foto={miembro.foto} />
        {miembro.rol === "dueno" ? <Etiqueta tono="exito">{miembro.soyYo ? "Tú · dueña" : "Dueña"}</Etiqueta> : <Etiqueta tono="neutro">{NOMBRE_NIVEL[miembro.nivel]}</Etiqueta>}
      </div>
      {miembro.rol === "staff" && (
        <>
          <div className="mt-3 overflow-x-auto">
            <GrupoOpciones etiqueta={`Nivel de ${miembro.nombre || miembro.email}`} opciones={OPCIONES_NIVEL} valor={miembro.nivel} alCambiar={(n) => void cambiar(n)} compacta />
          </div>
          <div className="mt-2 flex items-center justify-between gap-2">
            <p className="text-secundario text-texto-secundario">{NIVELES.find((n) => n.id === miembro.nivel)?.detalle}</p>
            <Boton jerarquia="terciario" tono="peligro" tamano="compacto" onClick={quitar}>
              {confirmar ? "Toca otra vez para quitar" : "Quitar"}
            </Boton>
          </div>
        </>
      )}
    </div>
  );
}

function FilaEnlace({ tiendaId, enlace, nombreTienda }: { tiendaId: string; enlace: EnlaceEquipo & { codigo: string | null }; nombreTienda: string }) {
  const { cancelarEnlaceEquipo } = useData();
  const toast = useToast();
  const cancelar = async () => {
    try {
      await cancelarEnlaceEquipo(tiendaId, enlace.id);
      toast("Enlace cancelado. Ya no sirve.");
    } catch (e) {
      toast(mensajeDeError(e));
    }
  };
  return (
    <div className="rounded-radio-l border-[1.5px] border-linea bg-superficie p-3.5" data-enlace="">
      <p className="font-extrabold">
        {NOMBRE_NIVEL[enlace.nivel]}
        {enlace.nota && <span className="font-normal text-texto-secundario"> · {enlace.nota}</span>}
      </p>
      <p className="text-secundario text-texto-secundario">{textoVence(enlace.venceEn)}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {enlace.codigo && <CompartirEnlace codigo={enlace.codigo} nombreTienda={nombreTienda} />}
        <Boton jerarquia="terciario" tono="peligro" tamano="compacto" onClick={cancelar}>Cancelar enlace</Boton>
      </div>
    </div>
  );
}

function CompartirEnlace({ codigo, nombreTienda }: { codigo: string; nombreTienda: string }) {
  const toast = useToast();
  const url = urlUnirse(window.location.origin, codigo);
  const texto = mensajeInvitacion(nombreTienda, url);
  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast("Enlace copiado.");
    } catch {
      toast("No se pudo copiar. Mantén presionado el enlace para copiarlo.");
    }
  };
  const compartir = async () => {
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ text: texto });
        return;
      } catch {
        // Cerró el menú de compartir: no pasa nada.
        return;
      }
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, "_blank", "noopener,noreferrer");
  };
  return (
    <>
      <Boton tamano="compacto" onClick={compartir}>Compartir</Boton>
      <Boton tamano="compacto" jerarquia="secundario" onClick={copiar}>Copiar</Boton>
    </>
  );
}

function EnlaceNuevo({ codigo, nombreTienda, alListo }: { codigo: string; nombreTienda: string; alListo: () => void }) {
  const url = urlUnirse(window.location.origin, codigo);
  return (
    <section className="rounded-radio-l border-2 border-accion bg-accion-suave p-3.5" aria-live="polite" data-enlace-nuevo="">
      <h2 className="font-display text-destacado font-bold text-bosque">Tu enlace está listo</h2>
      <p className="mt-1 text-secundario">Sirve una sola vez y vence en 7 días. Cuando la persona lo abra, aquí te aparece para que la apruebes.</p>
      <p className="mt-2 rounded-radio-m bg-superficie px-3 py-2 text-secundario break-all select-all" data-url-enlace="">{url}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <CompartirEnlace codigo={codigo} nombreTienda={nombreTienda} />
        <Boton tamano="compacto" jerarquia="terciario" onClick={alListo}>Listo</Boton>
      </div>
    </section>
  );
}

function FormularioEnlace({ tiendaId, alCancelar, alCrear }: { tiendaId: string; alCancelar: () => void; alCrear: (id: string | null, codigo: string) => void }) {
  const { crearEnlaceEquipo, getEquipo } = useData();
  const toast = useToast();
  const [nivel, setNivel] = useState<Nivel>("ayudante");
  const [nota, setNota] = useState("");
  const [creando, setCreando] = useState(false);
  // Candado síncrono: un segundo toque antes de volver a pintar tampoco crea otro enlace.
  const enCurso = useRef(false);
  const crear = async () => {
    if (enCurso.current) return;
    enCurso.current = true;
    setCreando(true);
    try {
      // La función de la base devuelve solo el código (a propósito: la firma no cambia). Para saber cuál fila es, se comparan los
      // enlaces de antes y de después: si aparece exactamente uno nuevo, es ese. Si no (otra pestaña creó otro al mismo tiempo, o la
      // lectura falló), NO se adivina: el enlace se muestra igual y la fila queda sin «Copiar».
      const antes = await getEquipo(tiendaId).then((e) => new Set(e.enlaces.map((x) => x.id))).catch(() => null);
      const codigo = await crearEnlaceEquipo(tiendaId, nivel, nota.trim() || null);
      let id: string | null = null;
      if (antes) {
        try {
          const nuevos = (await getEquipo(tiendaId)).enlaces.filter((x) => !antes.has(x.id));
          if (nuevos.length === 1) id = nuevos[0]!.id;
        } catch {
          // Se queda sin id: ver arriba.
        }
      }
      alCrear(id, codigo);
    } catch (e) {
      toast(mensajeDeError(e));
    } finally {
      enCurso.current = false;
      setCreando(false);
    }
  };
  return (
    <section className="flex flex-col gap-3 rounded-radio-l border-[1.5px] border-linea bg-superficie p-3.5" aria-label="Invitar por enlace">
      <GrupoOpciones titulo="¿Qué podrá hacer?" opciones={NIVELES.map((n) => ({ id: n.id, texto: n.nombre, descripcion: n.detalle }))} valor={nivel} alCambiar={setNivel} />
      <Campo
        etiqueta="Para quién (opcional)" icono={IconoPersona}
        placeholder="Para Ana"
        value={nota}
        maxLength={NOTA_MAX}
        enterKeyHint="done"
        onChange={(e) => setNota(e.target.value)}
        ayuda="Solo lo ves tú, para reconocer el enlace."
      />
      <div className="flex gap-2">
        <Boton cargando={creando} onClick={crear}>Crear enlace</Boton>
        <Boton jerarquia="secundario" deshabilitado={creando} onClick={alCancelar}>Cancelar</Boton>
      </div>
    </section>
  );
}

function FormularioCorreo({ tiendaId, alTerminar }: { tiendaId: string; alTerminar: () => void }) {
  const { invitarPorCorreo } = useData();
  const toast = useToast();
  const [nivel, setNivel] = useState<Nivel>("ayudante");
  const [correo, setCorreo] = useState("");
  const [tocado, setTocado] = useState(false);
  const error = tocado && !correoValido(correo) ? "Escribe un correo de Google, como ana@gmail.com." : undefined;
  const invitar = async () => {
    setTocado(true);
    if (!correoValido(correo)) return;
    try {
      await invitarPorCorreo(tiendaId, correo, nivel);
      toast("Listo. Cuando entre con Google con ese correo, ya estará en tu equipo.");
      alTerminar();
    } catch (e) {
      toast(mensajeDeError(e));
    }
  };
  return (
    <section className="flex flex-col gap-3 rounded-radio-l border-[1.5px] border-linea bg-superficie p-3.5" aria-label="Invitar por correo">
      <Campo
        etiqueta="Correo de Google" icono={IconoSobre}
        type="email"
        inputMode="email"
        autoComplete="email"
        autoCapitalize="none"
        enterKeyHint="done"
        value={correo}
        onChange={(e) => setCorreo(e.target.value)}
        onBlur={() => setTocado(true)}
        error={error}
        ayuda="No hace falta aprobarla: tú ya escribiste quién es."
      />
      <GrupoOpciones titulo="¿Qué podrá hacer?" opciones={NIVELES.map((n) => ({ id: n.id, texto: n.nombre, descripcion: n.detalle }))} valor={nivel} alCambiar={setNivel} />
      <div className="flex gap-2">
        <Boton onClick={invitar}>Invitar</Boton>
        <Boton jerarquia="secundario" onClick={alTerminar}>Cancelar</Boton>
      </div>
    </section>
  );
}
