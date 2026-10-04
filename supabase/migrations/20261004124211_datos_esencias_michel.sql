-- Catálogo conectado, migración 4 de 4 (docs/prompts/catalogo-base.md §4). GENERADA por scripts/generar-datos-esencias-michel.mjs
-- desde el arreglo PRODUCTS de public/catalogos/esencias-michel.html: no la edites a mano.
-- Solo Esencias Michel: slug (los mismos del HTML, así los enlaces ya compartidos siguen sirviendo) y detalles.
-- No toca precios, stock, fotos ni visibilidad. Mirsaal valentine y Zakat Z36 no están en el HTML: conservan su slug.
do $$
declare
  t uuid;
  n integer;
begin
  select id into t from public.tiendas where slug = 'esencias-michel';
  if t is null then
    return; -- otra base (por ejemplo, una local): no hay nada que llenar
  end if;
  update public.productos set slug = 'mayar', detalles = '{"marca":"Lattafa","para":"ella","tamano_ml":100,"concentracion":"edp","familia":"Floral frutal fresca","ocasiones":["Día","Oficina","Verano","Salidas casuales"],"notas_salida":["Higo","mandarina verde","melón","agua de coco"],"notas_corazon":["Loto","nenúfar","jazmín"],"notas_fondo":["Ambroxan","almizcle","sándalo","vainilla"],"descripcion":"Mi amor, este es de mis favoritos. Huele fresquito y limpio, como acabadita de bañar, con un toque cremoso que enamora. Pa'' diario, y te van a preguntar qué tienes puesto."}'::jsonb
  where tienda_id = t and nombre = 'Mayar Natural Intense';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'esencias_michel: % productos se llaman %', n, 'Mayar Natural Intense'; end if;
  update public.productos set slug = 'zakat', detalles = '{"marca":"Zakat","para":"unisex","tamano_ml":100,"concentracion":"edp","familia":"Aromática amaderada","ocasiones":["Oficina","Día","Noches casuales","Todo el año"],"notas_salida":["Bergamota","cilantro"],"notas_corazon":["Lavanda","geranio","ámbar"],"notas_fondo":["Cedro","almizcle","pachulí"],"descripcion":"Te queda chulo a ti y a él también. Arranca fresco, la lavanda le da carácter y el cedro deja una estela que dura y dura. Y ese frasco negro está brutal."}'::jsonb
  where tienda_id = t and nombre = 'Zakat';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'esencias_michel: % productos se llaman %', n, 'Zakat'; end if;
  update public.productos set slug = 'majestic', detalles = '{"marca":"Le Falcone","para":"unisex","tamano_ml":100,"concentracion":"edp","familia":"Frutal floral amaderada","ocasiones":["Citas","Cenas","Ocasiones especiales","Todo el año"],"notas_salida":["Melocotón","pera","casis"],"notas_corazon":["Frambuesa","lirio de los valles","maracuyá"],"notas_fondo":["Almizcle","sándalo","vainilla","pachulí","heliotropo"],"descripcion":"Te lo recomiendo con los ojos cerrados. Huele a perfume carísimo: frutas jugosas con un fondo cremoso de vainilla y sándalo. El que yo me pondría pa'' una cita."}'::jsonb
  where tienda_id = t and nombre = 'Majestic';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'esencias_michel: % productos se llaman %', n, 'Majestic'; end if;
  update public.productos set slug = 'parade', detalles = '{"marca":"Urban Collection","para":"ella","tamano_ml":100,"concentracion":"edp","familia":"Ámbar floral","ocasiones":["Oficina","Cenas","Noche"],"notas_salida":["Pera","mandarina","bergamota"],"notas_corazon":["Azahar","jazmín"],"notas_fondo":["Vainilla bourbon","almizcle blanco","benjuí","ámbar"],"descripcion":"Elegante y con mucho estilo. Pera, azahar y un fondito de vainilla que se te queda pegadito a la piel. Pa'' la oficina o una cena bonita."}'::jsonb
  where tienda_id = t and nombre = 'Parade';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'esencias_michel: % productos se llaman %', n, 'Parade'; end if;
  update public.productos set slug = 'urbantoy', detalles = '{"marca":"Urban Collection","para":"ella","tamano_ml":96,"concentracion":"edp","familia":"Floral frutal dulce","ocasiones":["Día","Salidas casuales","Verano","Regalo"],"notas_salida":["Frutas confitadas","naranja amarga","limón"],"notas_corazon":["Chicle","rosa","melocotón","arándano","canela"],"notas_fondo":["Almizcle","ambroxan","cedro"],"descripcion":"¡Mira este osito, qué cosa más linda! Huele a chicle, frutas confitadas y rosa. Dulce, divertido y perfecto pa'' regalar."}'::jsonb
  where tienda_id = t and nombre = 'Urban Toy Bubble Gum';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'esencias_michel: % productos se llaman %', n, 'Urban Toy Bubble Gum'; end if;
  update public.productos set slug = 'she', detalles = '{"marca":"Fragrance Couture","para":"ella","tamano_ml":100,"concentracion":"edp","familia":"Chipre frutal","ocasiones":["Oficina","Cenas","Todo el año"],"notas_salida":["Casis"],"notas_corazon":["Rosa","fresia"],"notas_fondo":["Vainilla","pachulí","ambroxan","maderas"],"descripcion":"Un clásico que no falla. Casis jugoso, rosa y vainilla: elegante y segura, va con tacones o con tenis."}'::jsonb
  where tienda_id = t and nombre = 'Shé';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'esencias_michel: % productos se llaman %', n, 'Shé'; end if;
  update public.productos set slug = 'oxana', detalles = '{"marca":"Amaran","para":"unisex","tamano_ml":100,"concentracion":"edp","familia":"Oriental floral con café","ocasiones":["Noche","Fiestas","Citas"],"notas_salida":["Pera","azahar","pimienta rosa"],"notas_corazon":["Jazmín","café","almendra amarga","regaliz"],"notas_fondo":["Pachulí","vainilla","cedro","madera de cachemira"],"descripcion":"Este es pa'' la noche. Café con vainilla y flores blancas, adictivo y misterioso. Y es unisex, se lo puedes regalar a él."}'::jsonb
  where tienda_id = t and nombre = 'Oxana Black';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'esencias_michel: % productos se llaman %', n, 'Oxana Black'; end if;
  update public.productos set slug = 'wildflower', detalles = '{"marca":"Fragrance Couture","para":"ella","tamano_ml":100,"concentracion":"edp","familia":"Floral fresca","ocasiones":["Día","Oficina","Primavera y verano","Regalo"],"notas_salida":["Fresa","hoja de violeta","toronja"],"notas_corazon":["Gardenia","violeta","jazmín"],"notas_fondo":["Almizcle","vainilla","maderas blancas"],"descripcion":"Un ramito de flores en un frasco. Delicado, fresquito y luminoso, y ese frasco dorado es precioso pa'' regalar."}'::jsonb
  where tienda_id = t and nombre = 'Wild Flower Gold';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'esencias_michel: % productos se llaman %', n, 'Wild Flower Gold'; end if;
  update public.productos set slug = 'kiara', detalles = '{"marca":"Fragrance Couture","para":"ella","tamano_ml":100,"concentracion":"edp","familia":"Floral frutal gourmand","ocasiones":["Día","Universidad","Salidas casuales"],"notas_salida":["Mandarina","orquídea","heliotropo"],"notas_corazon":["Acorde goloso","frutas tropicales"],"notas_fondo":["Vainilla","almizcle","sándalo"],"descripcion":"Rosadito, dulce y cremoso. Mandarina y frutas tropicales con vainilla al final. Rico, alegre y pa'' todos los días."}'::jsonb
  where tienda_id = t and nombre = 'Kiara Pink';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'esencias_michel: % productos se llaman %', n, 'Kiara Pink'; end if;
  update public.productos set slug = 'asad-bourbon', detalles = '{"marca":"Lattafa","familia":"Dulces","descripcion":"¿Te llama la atención? Escríbeme y te cuento más de este perfume."}'::jsonb
  where tienda_id = t and nombre = 'Lattafa Asad Bourbon';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'esencias_michel: % productos se llaman %', n, 'Lattafa Asad Bourbon'; end if;
  update public.productos set slug = 'pistache-absolu', detalles = '{"marca":"Orientica","familia":"Florales","descripcion":"¿Te llama la atención? Escríbeme y te cuento más de este perfume."}'::jsonb
  where tienda_id = t and nombre = 'Orientica Pistache Absolu';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'esencias_michel: % productos se llaman %', n, 'Orientica Pistache Absolu'; end if;
  update public.productos set slug = 'yara-rosa', detalles = '{"marca":"Lattafa","familia":"Dulces","descripcion":"¿Te llama la atención? Escríbeme y te cuento más de este perfume."}'::jsonb
  where tienda_id = t and nombre = 'Lattafa Yara rosa';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'esencias_michel: % productos se llaman %', n, 'Lattafa Yara rosa'; end if;
  update public.productos set slug = 'delilah', detalles = '{"marca":"Maison Alhambra","familia":"Dulces","descripcion":"¿Te llama la atención? Escríbeme y te cuento más de este perfume."}'::jsonb
  where tienda_id = t and nombre = 'Maison Alhambra Delilah';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'esencias_michel: % productos se llaman %', n, 'Maison Alhambra Delilah'; end if;
end
$$;
