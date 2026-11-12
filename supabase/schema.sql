-- Coado: tabelas do Supabase (PostgreSQL). Rode no SQL Editor do projeto.
-- Segue o modelo de dados da seção 4.3, com as colunas extras marcadas como (+).

create table if not exists usuarios (
  id bigint generated always as identity primary key,
  nome text not null,
  email text not null unique,
  senha_hash text not null,
  perfil text not null check (perfil in ('cliente', 'cafeteria')),
  saldo_graos integer not null default 0,
  bairro text,                         -- (+) localização usada no cálculo da distância
  latitude double precision,           -- (+)
  longitude double precision,          -- (+)
  criado_em timestamptz not null default now()
);

create table if not exists cafeterias (
  id bigint generated always as identity primary key,
  usuario_id bigint not null references usuarios(id) on delete cascade,
  nome text not null,
  endereco text not null,
  bairro text,                         -- (+)
  latitude double precision not null,
  longitude double precision not null,
  abre_as text not null,               -- 'HH:MM'
  fecha_as text not null,              -- 'HH:MM' ('24:00' = meia-noite)
  foto_url text
);

create table if not exists produtos (
  id bigint generated always as identity primary key,
  cafeteria_id bigint not null references cafeterias(id) on delete cascade,
  nome text not null,
  descricao text,
  preco numeric(10,2) not null check (preco > 0),
  estoque integer not null check (estoque >= 0),
  foto_url text
);

create table if not exists avaliacoes (
  id bigint generated always as identity primary key,
  pedido_id bigint not null unique,    -- uma avaliação por pedido (RN-004)
  nota integer not null check (nota between 1 and 5),
  comentario text,
  foto_url text,
  criado_em timestamptz not null default now()
);

create table if not exists posts (
  id bigint generated always as identity primary key,
  autor_id bigint not null references usuarios(id) on delete cascade,
  cafeteria_id bigint not null references cafeterias(id) on delete cascade, -- (+)
  produto_id bigint references produtos(id) on delete set null,
  avaliacao_id bigint references avaliacoes(id) on delete cascade,          -- (+)
  tipo text not null check (tipo in ('produto', 'avaliacao')),
  texto text,
  foto_url text,
  criado_em timestamptz not null default now()
);

create table if not exists curtidas (
  post_id bigint not null references posts(id) on delete cascade,
  usuario_id bigint not null references usuarios(id) on delete cascade,
  criado_em timestamptz not null default now(),
  primary key (post_id, usuario_id)
);

create table if not exists comentarios (
  id bigint generated always as identity primary key,
  post_id bigint not null references posts(id) on delete cascade,
  usuario_id bigint not null references usuarios(id) on delete cascade,
  texto text not null,
  criado_em timestamptz not null default now()
);

create table if not exists seguidores (
  cliente_id bigint not null references usuarios(id) on delete cascade,
  cafeteria_id bigint not null references cafeterias(id) on delete cascade,
  primary key (cliente_id, cafeteria_id)
);

create table if not exists pedidos (
  id bigint generated always as identity primary key,
  cliente_id bigint not null references usuarios(id),
  cafeteria_id bigint not null references cafeterias(id),
  subtotal numeric(10,2) not null,
  frete numeric(10,2) not null,
  desconto numeric(10,2) not null default 0,
  total numeric(10,2) not null,
  graos_usados integer not null default 0,   -- (+)
  graos_ganhos integer not null default 0,   -- (+)
  distancia_km numeric(5,1) not null,
  status text not null check (status in ('recebido','em_preparo','saiu_para_entrega','entregue','cancelado')),
  pagamento text not null default 'na_entrega', -- (+) pagamento online fora do escopo
  criado_em timestamptz not null default now(),
  entregue_em timestamptz
);

create table if not exists itens_pedido (
  id bigint generated always as identity primary key,
  pedido_id bigint not null references pedidos(id) on delete cascade,
  produto_id bigint not null references produtos(id),
  quantidade integer not null check (quantidade > 0),
  preco_unitario numeric(10,2) not null
);

-- A API acessa com a service role key (servidor). Mantenha o RLS ligado e sem
-- políticas públicas: o navegador nunca fala direto com o banco.
alter table usuarios enable row level security;
alter table cafeterias enable row level security;
alter table produtos enable row level security;
alter table posts enable row level security;
alter table curtidas enable row level security;
alter table comentarios enable row level security;
alter table seguidores enable row level security;
alter table pedidos enable row level security;
alter table itens_pedido enable row level security;
alter table avaliacoes enable row level security;
