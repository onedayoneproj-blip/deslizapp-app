-- La nota del cliente se muestra como burbuja (estilo notas de Instagram) en su detalle: máximo 60 caracteres.
alter table public.clientes add constraint clientes_nota_largo check (nota is null or char_length(nota) <= 60);
