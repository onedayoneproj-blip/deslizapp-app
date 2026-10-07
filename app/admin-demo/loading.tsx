// Con este límite, Next precarga el marco del admin y el cambio de pantalla es inmediato: el contenido llega después.
// Mismo esqueleto que EstadoAdmin (components/admin/estado.tsx).
export default function CargandoAdmin() {
  return (
    <div aria-label="Cargando" className="space-y-3" role="status">
      <div className="h-28 animate-pulse rounded-radio-l bg-superficie-hundida" />
      <div className="h-24 animate-pulse rounded-radio-l bg-superficie-hundida" />
    </div>
  );
}
