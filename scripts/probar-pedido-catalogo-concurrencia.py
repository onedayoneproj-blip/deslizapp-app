import os,subprocess,time,pathlib
cmd=['docker','exec','-i',os.environ['PANEL_REPLAY_CONTAINER'],'psql','-U','postgres','-d','replay_provisional','-v','ON_ERROR_STOP=1','-At']
def run(sql):
 p=subprocess.run(cmd,input=sql,text=True,capture_output=True); assert p.returncode==0,p.stderr; return p.stdout
s=pathlib.Path('scripts/probar-pedido-catalogo-panel-db.sql').read_text().split("select set_config('request.jwt.claim.sub'")[0]
run(s+'commit;')
auth="select set_config('request.jwt.claim.sub','20000000-0000-4000-8000-000000000001',true); set local role authenticated;"
rpc="select (public.registrar_solicitud('50000000-0000-4000-8000-000000000001',null,'{\"nombre\":\"Concurrente\",\"telefono\":\"8095550188\"}',array['40000000-0000-4000-8000-000000000001']::uuid[],'{}')).id;"
a=subprocess.Popen(cmd,stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True);a.stdin.write('begin;'+auth+rpc+'select pg_sleep(2);commit;');a.stdin.close()
time.sleep(.35)
b=subprocess.Popen(cmd,stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True);b.stdin.write('begin;'+auth+rpc+'commit;');b.stdin.close();time.sleep(.35)
assert int(run("select count(*) from pg_stat_activity where datname='replay_provisional' and wait_event_type='Lock' and query like '%registrar_solicitud%';").strip())>=1,'No se comprobó solapamiento/bloqueo'
a.wait();b.wait();assert a.returncode==0,a.stderr.read();assert b.returncode!=0 and 'solicitud_no_registrable' in b.stderr.read()
assert run("select count(*) from public.pedidos where origen='catalogo';").strip()=='1'
assert run("select count(*) from public.clientes where nombre='Concurrente';").strip()=='1'
print('Pasó: dos sesiones solapadas, espera Lock comprobada, un pedido y un cliente.')
# Stock cambia mientras registrar espera al producto: rechazo y ninguna creación parcial.
run("update public.solicitudes_pedido set pedido_id=null,registrada_en=null;")
a=subprocess.Popen(cmd,stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True);a.stdin.write("begin;select 1 from public.productos where id='30000000-0000-4000-8000-000000000001' for update; update public.producto_variantes set stock=0 where id='40000000-0000-4000-8000-000000000002';select pg_sleep(2);commit;");a.stdin.close();time.sleep(.35)
b=subprocess.Popen(cmd,stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True);b.stdin.write('begin;'+auth+rpc+'commit;');b.stdin.close();time.sleep(.35)
assert int(run("select count(*) from pg_stat_activity where datname='replay_provisional' and wait_event_type='Lock' and query like '%registrar_solicitud%';").strip())>=1
a.wait();b.wait();assert a.returncode==0,a.stderr.read();assert b.returncode!=0 and 'disponibilidad_cambio' in b.stderr.read()
assert run("select count(*) from public.pedidos where origen='catalogo';").strip()=='1'
print('Pasó: cambio de stock concurrente, disponibilidad final verificada, no creó otro pedido.')
