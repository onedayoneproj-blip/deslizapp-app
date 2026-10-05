# Dos sesiones reales del replay desechable, sin conexión a producción.
import os, subprocess, time
cmd=['docker','exec','-i',os.environ['PANEL_REPLAY_CONTAINER'],'psql','-U','postgres','-d','replay_provisional','-v','ON_ERROR_STOP=1','-At']
def run(sql):
 p=subprocess.run(cmd,input=sql,text=True,capture_output=True); assert p.returncode==0,p.stderr; return p.stdout.strip()
def start(sql):
 p=subprocess.Popen(cmd,stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True);p.stdin.write(sql);p.stdin.close();return p
run("""insert into auth.users(id,email) values ('21000000-0000-4000-8000-000000000001','eliminar@fixture.invalid');
insert into public.tiendas(id,nombre,slug,estado) values ('11000000-0000-4000-8000-000000000001','Fixture','fixture-eliminar','activa');
insert into public.miembros(usuario_id,tienda_id) values ('21000000-0000-4000-8000-000000000001','11000000-0000-4000-8000-000000000001');
insert into public.productos(id,tienda_id,nombre,precio,stock) values ('31000000-0000-4000-8000-000000000001','11000000-0000-4000-8000-000000000001','Primero',100,3),('31000000-0000-4000-8000-000000000002','11000000-0000-4000-8000-000000000001','Segundo',100,3);
insert into public.pedidos(id,tienda_id,estado,total) values ('71000000-0000-4000-8000-000000000001','11000000-0000-4000-8000-000000000001','nuevo',100);""")
auth="select set_config('request.jwt.claim.sub','21000000-0000-4000-8000-000000000001',true);set local role authenticated;"
def rpc(n): return "select public.eliminar_producto('11000000-0000-4000-8000-000000000001','31000000-0000-4000-8000-00000000000%d');"%n
def item(n): return "insert into public.pedido_items(pedido_id,producto_id,nombre_producto,cantidad,precio_unitario) values ('71000000-0000-4000-8000-000000000001','31000000-0000-4000-8000-00000000000%d','Snapshot',1,100);"%n
for n in [1,2]:
 first=item(n) if n==1 else rpc(n)
 second=rpc(n) if n==1 else item(n)
 a=start('begin;'+auth+first+'select pg_sleep(1.5);commit;');time.sleep(.25)
 b=start('begin;'+auth+second+'commit;');time.sleep(.25)
 assert int(run("select count(*) from pg_stat_activity where datname='replay_provisional' and wait_event_type='Lock';"))>=1,'Sin espera Lock'
 a.wait();b.wait();assert a.returncode==0,a.stderr.read();assert b.returncode!=0,b.stdout.read()
 expected='producto_con_pendientes' if n==1 else 'producto_eliminado_o_ajeno';assert expected in b.stderr.read()
 assert run("select eliminado_en is null from public.productos where id='31000000-0000-4000-8000-00000000000%d';"%n)==('t' if n==1 else 'f')
print('Pasó: pedido concurrente bloquea eliminación; eliminación concurrente bloquea nueva línea; espera Lock comprobada en ambos órdenes.')
