// Identificador del despliegue que está sirviendo el servidor. La app lo compara con el
// identificador con el que se compiló para saber si hay una versión nueva publicada.
export function GET() {
  return Response.json(
    { despliegue: process.env.NEXT_PUBLIC_ID_DESPLIEGUE },
    { headers: { "Cache-Control": "no-store, max-age=0" } },
  );
}
