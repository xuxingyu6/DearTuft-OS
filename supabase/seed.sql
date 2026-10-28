-- Optional DEMO rows. This file is not a migration.
-- `supabase db reset` runs it after migrations, as the database owner.
-- Prefer Settings → 载入 Demo inside the app: that loader dates rows to
-- Asia/Shanghai today and marks every row is_demo. These rows use
-- current_date so a reset near "today" still lands in the current month.
-- Names are prefixed 【Demo】. The dashboard ignores them unless ?demo=1.

insert into public.customers (
  id, name, instagram_handle, tiktok_handle, profile_url, country, contact,
  first_inquiry_date, acquisition_platform, interested_products, pet_type, pet_alive,
  purchase_purpose, quantity, size_note, budget_usd_cents, notes, stage, latest_intent,
  lost_reason, is_demo
) values
  (
    '10000000-0000-4000-8000-000000000001', '【Demo】Luna', '@demo_luna', null,
    'https://instagram.com/demo_luna', 'US', 'luna.demo@example.com',
    current_date - 12, 'ig', array['3d_charm'], '狗', true,
    '日常纪念', 1, '中号', 20000, '演示客户，不是真实订单。', 'quoted', '在比较价格',
    null, true
  ),
  (
    '10000000-0000-4000-8000-000000000002', '【Demo】Mochi', '@demo_mochi', null,
    'https://instagram.com/demo_mochi', 'CA', 'mochi.demo@example.com',
    current_date - 6, 'ig', array['3d_charm'], '猫', true,
    '日常纪念', 1, '中号', 17900, '演示客户，不是真实订单。', 'paid', '已付定金',
    null, true
  ),
  (
    '10000000-0000-4000-8000-000000000003', '【Demo】Kiki', '@demo_kiki', null,
    null, 'UK', null,
    current_date - 9, 'ig', array['2d_charm'], '狗', false,
    '纪念', 1, '中号', 20000, '演示客户，不是真实订单。', 'lost', null,
    'price_high', true
  )
on conflict (id) do nothing;

insert into public.inquiries (
  id, customer_id, inquiry_date, platform, is_valid, product_interest, notes, is_demo
) values
  ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', current_date - 12, 'ig', true, '3D 挂件', '演示询盘', true),
  ('20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000002', current_date - 6, 'ig', true, '3D 挂件', '演示询盘', true),
  ('20000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000003', current_date - 9, 'tiktok', false, '2D 挂件', '演示：只是问问价格', true)
on conflict (id) do nothing;

insert into public.follow_ups (
  id, customer_id, inquiry_id, task, content, next_follow_up_on, latest_intent, is_demo
) values
  ('30000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', '确认是否接受 $179 报价', '演示跟进，已逾期。', current_date - 3, '在比较价格', true),
  ('30000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000002', '确认宠物照片是否清晰', '演示跟进，到期日是今天。', current_date, '已付定金', true)
on conflict (id) do nothing;

insert into public.orders (
  id, customer_id, order_number, product_code, product_name, size_note, quantity,
  gross_amount_usd_cents, discount_usd_cents, agreed_deposit_usd_cents,
  production_cost_cny_fen, shipping_cost_cny_fen, payment_fee_usd_cents, other_cost_cny_fen,
  fx_cny_per_usd_e6, order_date, expected_ship_date, status, notes, is_demo
) values (
  '40000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000002',
  'DT-DEMO-0001',
  '3d_charm',
  '3D 挂件',
  '标准',
  1,
  17900,
  0,
  6000,
  40000,
  8000,
  60,
  0,
  7200000,
  current_date - 4,
  current_date + 14,
  'confirmed',
  '演示订单。定金已收，尾款未收。未填写归因广告。',
  true
)
on conflict (id) do nothing;

insert into public.order_payments (id, order_id, kind, amount_usd_cents, paid_on, note)
values (
  '50000000-0000-4000-8000-000000000001',
  '40000000-0000-4000-8000-000000000001',
  'deposit',
  6000,
  current_date - 4,
  '演示定金'
)
on conflict (id) do nothing;

insert into public.customer_status_history (id, customer_id, from_stage, to_stage, lost_reason, note, changed_at)
values
  ('81000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', null, 'new_inquiry', null, 'Demo', (current_date - 12)::timestamptz),
  ('81000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', 'new_inquiry', 'quoted', null, 'Demo', (current_date - 11)::timestamptz),
  ('81000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000002', null, 'new_inquiry', null, 'Demo', (current_date - 6)::timestamptz),
  ('81000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000002', 'new_inquiry', 'paid', null, 'Demo', (current_date - 4)::timestamptz),
  ('81000000-0000-4000-8000-000000000005', '10000000-0000-4000-8000-000000000003', null, 'new_inquiry', null, 'Demo', (current_date - 9)::timestamptz),
  ('81000000-0000-4000-8000-000000000006', '10000000-0000-4000-8000-000000000003', 'new_inquiry', 'lost', 'price_high', 'Demo', (current_date - 8)::timestamptz)
on conflict (id) do nothing;

insert into public.ad_daily_stats (
  id, stat_date, platform, campaign_name, creative_name, spend_usd_cents,
  impressions, clicks, new_inquiries, valid_inquiries, attributed_orders, note, is_demo
) values (
  '60000000-0000-4000-8000-000000000001',
  current_date - 4,
  'ig',
  '【Demo】十月纪念',
  '制作过程 15s',
  2000,
  10000,
  200,
  2,
  1,
  0,
  '演示广告。归因订单数留 0，避免假装这单已经归因。',
  true
)
on conflict (id) do nothing;

insert into public.content_posts (
  id, title, platform, published_on, url, content_type, views, likes, comments,
  valid_inquiries, orders_count, note, is_demo
) values (
  '70000000-0000-4000-8000-000000000001',
  '【Demo】挂件制作过程',
  'ig',
  current_date - 8,
  'https://instagram.com/p/demo',
  'process',
  12000,
  340,
  18,
  1,
  0,
  '演示内容。询盘和订单数是手填，不从 CRM 自动回写。',
  true
)
on conflict (id) do nothing;
