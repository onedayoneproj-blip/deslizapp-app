#!/usr/bin/env bash
# PostgreSQL local desechable; nunca usa conexión/credenciales de producción.
set -euo pipefail
cd "$(dirname "$0")/.."
inventario_container="deslizapp-replay-inventario-$$"
trap 'docker rm -f "$inventario_container" >/dev/null 2>&1 || true' EXIT
docker run -d --name "$inventario_container" -e POSTGRES_PASSWORD=solo_prueba_desechable -e POSTGRES_DB=replay_provisional postgres:17.6-alpine >/dev/null
for intento in {1..40}; do
 if docker exec "$inventario_container" pg_isready -h 127.0.0.1 -U postgres >/dev/null 2>&1;then break;fi
 sleep .2
done
psql_local(){ docker exec -i "$inventario_container" psql -U postgres -d replay_provisional -v ON_ERROR_STOP=1 "$@"; }
psql_local < scripts/preparar-replay-inventario.sql >/dev/null
for archivo in supabase/migrations/*.sql;do psql_local < "$archivo" >/dev/null;done
psql_local < scripts/probar-inventario-db.sql >/dev/null
psql_local < scripts/probar-inventario-provisional-db.sql >/dev/null
# Dos conexiones con la misma base: la segunda debe esperar y rechazar la base anterior.
psql_local -c "begin;set role authenticated;set request.jwt.claim.sub='11111111-1111-4111-8111-111111111111';select stock from guardar_producto_inventario('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','cccccccc-cccc-4ccc-8ccc-cccccccccccc','{}',0,1,'reposicion',null,'10000000-0000-4000-8000-000000000009',false);select pg_sleep(1);commit;" >/tmp/"$inventario_container"-uno.log 2>&1 &
primero=$!
sleep .2
psql_local -c "begin;set role authenticated;set request.jwt.claim.sub='11111111-1111-4111-8111-111111111111';select stock from guardar_producto_inventario('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','cccccccc-cccc-4ccc-8ccc-cccccccccccc','{}',0,2,'reposicion',null,'10000000-0000-4000-8000-000000000010',false);commit;" >/tmp/"$inventario_container"-dos.log 2>&1 &
segundo=$!
wait "$primero"
if wait "$segundo";then echo 'Falló: aceptó dos propuestas sobre la misma base';exit 1;fi
rg -q 'stock_base_cambio' /tmp/"$inventario_container"-dos.log
psql_local -c "do \$\$ begin if (select stock from productos where id='cccccccc-cccc-4ccc-8ccc-cccccccccccc')<>1 or (select count(*) from ajustes_inventario where id in('10000000-0000-4000-8000-000000000009','10000000-0000-4000-8000-000000000010'))<>1 then raise exception 'Concurrencia incorrecta';end if;end \$\$;" >/dev/null
rm -f /tmp/"$inventario_container"-{uno,dos}.log
echo 'Pasó: replay completo, RLS, ficha+ajuste, idempotencia, rollback, despacho/devolución y concurrencia.'
