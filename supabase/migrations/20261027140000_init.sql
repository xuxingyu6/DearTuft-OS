-- DearTuft OS initial schema.
-- Money: USD integer cents, CNY integer fen.
-- FX snapshot: CNY per 1 USD * 1e6 (7.20 => 7200000).
-- usd_cents = round(cny_fen * 1000000 / fx_cny_per_usd_e6).

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function public.normalize_ig_handle(raw text)
returns text
language sql
immutable
as $$
  select nullif(
    regexp_replace(
      lower(regexp_replace(trim(coalesce(raw, '')), '^@+', '')),
      '[^a-z0-9._]',
      '',
      'g'
    ),
    ''
  );
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Profiles
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text not null default '',
  role text not null default 'cs' check (role in ('admin', 'cs', 'content')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.current_app_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_app_role() = 'admin';
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested text;
  assigned text;
  admin_count int;
begin
  requested := coalesce(new.raw_user_meta_data->>'role', '');
  select count(*) into admin_count from public.profiles where role = 'admin';
  -- The first account is always admin, even if metadata asks for another role.
  -- Later signups honor cs/content. A later request for admin is ignored.
  if admin_count = 0 then
    assigned := 'admin';
  elsif requested = 'content' then
    assigned := 'content';
  elsif requested = 'cs' then
    assigned := 'cs';
  else
    assigned := 'cs';
  end if;

  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data->>'full_name', split_part(coalesce(new.email, 'user'), '@', 1)),
    assigned
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.prevent_role_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role then
    if auth.uid() is not null and not public.is_admin() then
      raise exception 'only admin can change roles';
    end if;
    if old.role = 'admin' and new.role is distinct from 'admin' then
      if (select count(*) from public.profiles where role = 'admin' and id <> old.id) < 1 then
        raise exception 'cannot remove the last admin';
      end if;
    end if;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_role_guard
  before update on public.profiles
  for each row execute function public.prevent_role_change();

-- ---------------------------------------------------------------------------
-- Customers, inquiries, follow-ups
-- ---------------------------------------------------------------------------

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  instagram_handle text,
  instagram_handle_norm text,
  tiktok_handle text,
  profile_url text,
  country text,
  contact text,
  first_inquiry_date date,
  acquisition_platform text check (acquisition_platform is null or acquisition_platform in ('ig', 'fb', 'tiktok', 'youtube', 'other')),
  source_content text,
  source_campaign text,
  interested_products text[] not null default '{}',
  pet_type text,
  pet_alive boolean,
  purchase_purpose text,
  quantity integer check (quantity is null or quantity >= 0),
  size_note text,
  special_requirements text,
  budget_usd_cents bigint check (budget_usd_cents is null or budget_usd_cents >= 0),
  notes text,
  stage text not null default 'new_inquiry' check (stage in ('new_inquiry', 'valid_inquiry', 'quoted', 'considering', 'pending_payment', 'paid', 'lost')),
  latest_intent text,
  lost_reason text check (lost_reason is null or lost_reason in ('price_high', 'lead_time', 'shipping', 'trust', 'no_budget', 'curious', 'competitor', 'no_reply', 'other')),
  lost_reason_custom text,
  is_demo boolean not null default false,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint customers_lost_reason_ck check (
    (stage <> 'lost' and lost_reason is null) or (stage = 'lost' and lost_reason is not null)
  )
);

create unique index customers_ig_norm_uidx
  on public.customers (instagram_handle_norm)
  where instagram_handle_norm is not null;

create index customers_stage_idx on public.customers (stage);
create index customers_country_idx on public.customers (country);

create or replace function public.customers_before_write()
returns trigger
language plpgsql
as $$
begin
  new.instagram_handle_norm := public.normalize_ig_handle(new.instagram_handle);
  new.updated_at := now();
  if new.stage is distinct from 'lost' then
    new.lost_reason := null;
    new.lost_reason_custom := null;
  end if;
  return new;
end;
$$;

create trigger customers_before_write
  before insert or update on public.customers
  for each row execute function public.customers_before_write();

create table public.customer_status_history (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers (id) on delete cascade,
  from_stage text,
  to_stage text not null,
  lost_reason text,
  note text,
  changed_by uuid references public.profiles (id),
  changed_at timestamptz not null default now()
);

create index customer_status_history_customer_idx
  on public.customer_status_history (customer_id, changed_at);

create table public.inquiries (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers (id) on delete cascade,
  inquiry_date date not null,
  platform text not null check (platform in ('ig', 'fb', 'tiktok', 'youtube', 'other')),
  source_content text,
  source_campaign text,
  is_valid boolean not null default false,
  product_interest text,
  notes text,
  is_demo boolean not null default false,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

create index inquiries_date_idx on public.inquiries (inquiry_date);
create index inquiries_customer_idx on public.inquiries (customer_id);

create table public.follow_ups (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers (id) on delete cascade,
  inquiry_id uuid references public.inquiries (id) on delete set null,
  task text not null,
  content text,
  next_follow_up_on date,
  latest_intent text,
  completed boolean not null default false,
  completed_at timestamptz,
  is_demo boolean not null default false,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

create index follow_ups_open_idx on public.follow_ups (completed, next_follow_up_on);

-- ---------------------------------------------------------------------------
-- Orders, payments, cost lines
-- ---------------------------------------------------------------------------

create sequence public.order_number_seq;

create or replace function public.next_order_number(p_order_date date)
returns text
language plpgsql
as $$
begin
  return 'DT-' || to_char(p_order_date, 'YYYYMM') || '-' || lpad(nextval('public.order_number_seq')::text, 4, '0');
end;
$$;

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers (id) on delete restrict,
  order_number text not null unique,
  product_code text not null check (product_code in ('2d_charm', '3d_charm', 'figurine', 'frame', 'scarf_hat', 'other')),
  product_name text not null default '',
  size_note text,
  quantity integer not null default 1 check (quantity > 0),
  gross_amount_usd_cents bigint not null default 0 check (gross_amount_usd_cents >= 0),
  discount_usd_cents bigint not null default 0 check (discount_usd_cents >= 0),
  agreed_deposit_usd_cents bigint not null default 0 check (agreed_deposit_usd_cents >= 0),
  production_cost_cny_fen bigint not null default 0 check (production_cost_cny_fen >= 0),
  shipping_cost_cny_fen bigint not null default 0 check (shipping_cost_cny_fen >= 0),
  payment_fee_usd_cents bigint not null default 0 check (payment_fee_usd_cents >= 0),
  other_cost_cny_fen bigint not null default 0 check (other_cost_cny_fen >= 0),
  fx_cny_per_usd_e6 bigint not null check (fx_cny_per_usd_e6 > 0),
  order_date date not null,
  expected_ship_date date,
  actual_ship_date date,
  status text not null default 'confirmed' check (status in ('confirmed', 'in_production', 'shipped', 'completed', 'cancelled', 'refunded')),
  has_review boolean not null default false,
  review_on date,
  notes text,
  is_demo boolean not null default false,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint orders_discount_ck check (discount_usd_cents <= gross_amount_usd_cents)
);

comment on column public.orders.gross_amount_usd_cents is '成交金额，整数美分。1 USD = 100 cents。';
comment on column public.orders.fx_cny_per_usd_e6 is '保存时汇率快照：1 USD 兑换多少 CNY，乘 1e6。7.20 存为 7200000。usd_cents = round(cny_fen * 1000000 / fx)。';
comment on column public.orders.production_cost_cny_fen is '制作成本，人民币分。';
comment on column public.orders.payment_fee_usd_cents is '支付手续费，美元美分。';

create index orders_date_idx on public.orders (order_date);
create index orders_customer_idx on public.orders (customer_id);

create trigger orders_updated_at
  before update on public.orders
  for each row execute function public.set_updated_at();

create table public.order_payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  kind text not null check (kind in ('deposit', 'balance', 'full', 'refund', 'other')),
  amount_usd_cents bigint not null check (amount_usd_cents > 0),
  paid_on date not null,
  note text,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

create index order_payments_order_idx on public.order_payments (order_id, paid_on);

create table public.order_cost_lines (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  category text not null check (category in ('production', 'shipping', 'payment_fee', 'other', 'attributed_ad')),
  currency text not null check (currency in ('USD', 'CNY')),
  amount_minor bigint not null check (amount_minor > 0),
  note text,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

comment on table public.order_cost_lines is '追加成本。attributed_ad 是可选的订单级归因广告成本，不会从广告日表自动分摊。主成本仍在 orders 上，不要把同一笔填两次。';

create index order_cost_lines_order_idx on public.order_cost_lines (order_id);

-- ---------------------------------------------------------------------------
-- Marketing
-- ---------------------------------------------------------------------------

create table public.ad_daily_stats (
  id uuid primary key default gen_random_uuid(),
  stat_date date not null,
  platform text not null check (platform in ('ig', 'fb', 'tiktok', 'youtube', 'other')),
  campaign_name text not null default '',
  creative_name text not null default '',
  spend_usd_cents bigint not null default 0 check (spend_usd_cents >= 0),
  impressions integer not null default 0 check (impressions >= 0),
  clicks integer not null default 0 check (clicks >= 0),
  new_inquiries integer not null default 0 check (new_inquiries >= 0),
  valid_inquiries integer not null default 0 check (valid_inquiries >= 0),
  attributed_orders integer not null default 0 check (attributed_orders >= 0),
  note text,
  is_demo boolean not null default false,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.ad_daily_stats is '组合层广告花费。Dashboard 的广告花费只加总本表。不要再平均分摊到订单。';

create index ad_daily_stats_date_idx on public.ad_daily_stats (stat_date);

create trigger ad_daily_stats_updated_at
  before update on public.ad_daily_stats
  for each row execute function public.set_updated_at();

create table public.content_posts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  platform text not null check (platform in ('ig', 'fb', 'tiktok', 'youtube', 'other')),
  published_on date not null,
  url text,
  content_type text not null check (content_type in ('process', 'finished', 'memorial', 'review', 'intro', 'other')),
  views integer not null default 0 check (views >= 0),
  likes integer not null default 0 check (likes >= 0),
  comments integer not null default 0 check (comments >= 0),
  valid_inquiries integer not null default 0 check (valid_inquiries >= 0),
  orders_count integer not null default 0 check (orders_count >= 0),
  note text,
  is_demo boolean not null default false,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index content_posts_date_idx on public.content_posts (published_on);

create trigger content_posts_updated_at
  before update on public.content_posts
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Reviews and settings
-- ---------------------------------------------------------------------------

create table public.weekly_reviews (
  id uuid primary key default gen_random_uuid(),
  week_start date not null unique,
  answers jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles (id),
  updated_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint weekly_monday_ck check (extract(isodow from week_start) = 1)
);

create trigger weekly_reviews_updated_at
  before update on public.weekly_reviews
  for each row execute function public.set_updated_at();

create table public.monthly_reviews (
  id uuid primary key default gen_random_uuid(),
  month_start date not null unique,
  answers jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles (id),
  updated_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint monthly_first_ck check (extract(day from month_start) = 1)
);

create trigger monthly_reviews_updated_at
  before update on public.monthly_reviews
  for each row execute function public.set_updated_at();

create table public.app_settings (
  key text primary key,
  value jsonb not null,
  updated_by uuid references public.profiles (id),
  updated_at timestamptz not null default now()
);

insert into public.app_settings (key, value) values
  ('fx', '{"cny_per_usd_e6": 7200000}'::jsonb),
  ('monthly_targets', '{"2026-11": 2, "2026-12": 5, "2027-01": 8}'::jsonb);

create or replace function public.current_fx_cny_per_usd_e6()
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((value->>'cny_per_usd_e6')::bigint, 7200000)
  from public.app_settings
  where key = 'fx';
$$;

create or replace function public.monthly_order_targets()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select value from public.app_settings where key = 'monthly_targets'),
    '{"2026-11": 2, "2026-12": 5, "2027-01": 8}'::jsonb
  );
$$;

-- ---------------------------------------------------------------------------
-- RLS
-- admin: everything
-- cs: CRM + orders + reviews. Read marketing. No settings writes. No settings reads.
-- content: marketing writes. Read customers/inquiries/reviews. No orders. No settings.
-- FX rate and monthly targets for the dashboard are exposed only through
-- security-definer functions, not by opening app_settings.
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.customers enable row level security;
alter table public.customer_status_history enable row level security;
alter table public.inquiries enable row level security;
alter table public.follow_ups enable row level security;
alter table public.orders enable row level security;
alter table public.order_payments enable row level security;
alter table public.order_cost_lines enable row level security;
alter table public.ad_daily_stats enable row level security;
alter table public.content_posts enable row level security;
alter table public.weekly_reviews enable row level security;
alter table public.monthly_reviews enable row level security;
alter table public.app_settings enable row level security;

create policy profiles_select on public.profiles
  for select to authenticated using (true);

create policy profiles_update_admin on public.profiles
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy customers_select on public.customers
  for select to authenticated using (true);
create policy customers_insert on public.customers
  for insert to authenticated
  with check (public.current_app_role() in ('admin', 'cs'));
create policy customers_update on public.customers
  for update to authenticated
  using (public.current_app_role() in ('admin', 'cs'))
  with check (public.current_app_role() in ('admin', 'cs'));
create policy customers_delete on public.customers
  for delete to authenticated
  using (public.current_app_role() in ('admin', 'cs'));

create policy history_select on public.customer_status_history
  for select to authenticated using (true);
create policy history_insert on public.customer_status_history
  for insert to authenticated
  with check (public.current_app_role() in ('admin', 'cs'));
create policy history_delete on public.customer_status_history
  for delete to authenticated
  using (public.current_app_role() in ('admin', 'cs'));

create policy inquiries_select on public.inquiries
  for select to authenticated using (true);
create policy inquiries_insert on public.inquiries
  for insert to authenticated
  with check (public.current_app_role() in ('admin', 'cs'));
create policy inquiries_update on public.inquiries
  for update to authenticated
  using (public.current_app_role() in ('admin', 'cs'))
  with check (public.current_app_role() in ('admin', 'cs'));
create policy inquiries_delete on public.inquiries
  for delete to authenticated
  using (public.current_app_role() in ('admin', 'cs'));

create policy follow_ups_select on public.follow_ups
  for select to authenticated using (true);
create policy follow_ups_insert on public.follow_ups
  for insert to authenticated
  with check (public.current_app_role() in ('admin', 'cs'));
create policy follow_ups_update on public.follow_ups
  for update to authenticated
  using (public.current_app_role() in ('admin', 'cs'))
  with check (public.current_app_role() in ('admin', 'cs'));
create policy follow_ups_delete on public.follow_ups
  for delete to authenticated
  using (public.current_app_role() in ('admin', 'cs'));

create policy orders_select on public.orders
  for select to authenticated
  using (public.current_app_role() in ('admin', 'cs'));
create policy orders_insert on public.orders
  for insert to authenticated
  with check (public.current_app_role() in ('admin', 'cs'));
create policy orders_update on public.orders
  for update to authenticated
  using (public.current_app_role() in ('admin', 'cs'))
  with check (public.current_app_role() in ('admin', 'cs'));
create policy orders_delete on public.orders
  for delete to authenticated
  using (public.current_app_role() in ('admin', 'cs'));

create policy payments_select on public.order_payments
  for select to authenticated
  using (public.current_app_role() in ('admin', 'cs'));
create policy payments_insert on public.order_payments
  for insert to authenticated
  with check (public.current_app_role() in ('admin', 'cs'));
create policy payments_update on public.order_payments
  for update to authenticated
  using (public.current_app_role() in ('admin', 'cs'))
  with check (public.current_app_role() in ('admin', 'cs'));
create policy payments_delete on public.order_payments
  for delete to authenticated
  using (public.current_app_role() in ('admin', 'cs'));

create policy cost_lines_select on public.order_cost_lines
  for select to authenticated
  using (public.current_app_role() in ('admin', 'cs'));
create policy cost_lines_insert on public.order_cost_lines
  for insert to authenticated
  with check (public.current_app_role() in ('admin', 'cs'));
create policy cost_lines_delete on public.order_cost_lines
  for delete to authenticated
  using (public.current_app_role() in ('admin', 'cs'));

create policy ads_select on public.ad_daily_stats
  for select to authenticated using (true);
create policy ads_insert on public.ad_daily_stats
  for insert to authenticated
  with check (public.current_app_role() in ('admin', 'content'));
create policy ads_update on public.ad_daily_stats
  for update to authenticated
  using (public.current_app_role() in ('admin', 'content'))
  with check (public.current_app_role() in ('admin', 'content'));
create policy ads_delete on public.ad_daily_stats
  for delete to authenticated
  using (public.current_app_role() in ('admin', 'content'));

create policy posts_select on public.content_posts
  for select to authenticated using (true);
create policy posts_insert on public.content_posts
  for insert to authenticated
  with check (public.current_app_role() in ('admin', 'content'));
create policy posts_update on public.content_posts
  for update to authenticated
  using (public.current_app_role() in ('admin', 'content'))
  with check (public.current_app_role() in ('admin', 'content'));
create policy posts_delete on public.content_posts
  for delete to authenticated
  using (public.current_app_role() in ('admin', 'content'));

create policy weekly_select on public.weekly_reviews
  for select to authenticated using (true);
create policy weekly_insert on public.weekly_reviews
  for insert to authenticated
  with check (public.current_app_role() in ('admin', 'cs'));
create policy weekly_update on public.weekly_reviews
  for update to authenticated
  using (public.current_app_role() in ('admin', 'cs'))
  with check (public.current_app_role() in ('admin', 'cs'));

create policy monthly_select on public.monthly_reviews
  for select to authenticated using (true);
create policy monthly_insert on public.monthly_reviews
  for insert to authenticated
  with check (public.current_app_role() in ('admin', 'cs'));
create policy monthly_update on public.monthly_reviews
  for update to authenticated
  using (public.current_app_role() in ('admin', 'cs'))
  with check (public.current_app_role() in ('admin', 'cs'));

create policy settings_select on public.app_settings
  for select to authenticated using (public.is_admin());
create policy settings_insert on public.app_settings
  for insert to authenticated with check (public.is_admin());
create policy settings_update on public.app_settings
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;

revoke all on function public.current_app_role() from public, anon;
revoke all on function public.is_admin() from public, anon;
revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.prevent_role_change() from public, anon, authenticated;
revoke all on function public.normalize_ig_handle(text) from public, anon;
revoke all on function public.next_order_number(date) from public, anon;
revoke all on function public.current_fx_cny_per_usd_e6() from public, anon;
revoke all on function public.monthly_order_targets() from public, anon;

grant execute on function public.current_app_role() to authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.normalize_ig_handle(text) to authenticated;
grant execute on function public.next_order_number(date) to authenticated;
grant execute on function public.current_fx_cny_per_usd_e6() to authenticated;
grant execute on function public.monthly_order_targets() to authenticated;

-- Default privileges on some Supabase projects grant anon before RLS is the
-- only gate. Deny the table grants explicitly. Security-definer functions
-- above are the only non-admin path to FX and targets.
revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;
