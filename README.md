# DearTuft OS

DearTuft 的内部经营系统。用来记 Instagram 询盘、跟进、定制订单、手工广告和周/月复盘。界面是中文，导航用英文：Overview、Customers、Marketing、Orders、Weekly Review、Monthly Review、Settings。

不做 Shopify、Meta、Instagram 同步，不发邮件，不导 CSV，没有 AI，客户列表不是看板。产品规则在 [SPEC.md](SPEC.md)。

## 本地先跑起来

没有 Supabase 时，应用使用本地 JSON（`data/local-db.json`，已 gitignore）和三个演示账号。这只适合本机演示，不要部署这种模式。

```bash
npm install
npm run dev
```

打开 [http://127.0.0.1:43123](http://127.0.0.1:43123)。

| 角色 | 邮箱 | 密码 |
| --- | --- | --- |
| 创始人 admin | admin@deartuft.local | deartuft-admin |
| 客服 cs | cs@deartuft.local | deartuft-cs |
| 内容 content | content@deartuft.local | deartuft-content |

```bash
npm test
npm run typecheck
npm run build
```

## 接到 Supabase

1. 新建一个 Supabase 项目。
2. 在 SQL Editor 里执行 [`supabase/migrations/20261027140000_init.sql`](supabase/migrations/20261027140000_init.sql)，或者用 CLI：`supabase db push`。
3. 可选：`supabase db reset` 会在迁移之后跑 [`supabase/seed.sql`](supabase/seed.sql)。种子数据全部带 `is_demo`，名字以【Demo】开头。应用里更方便的做法是用创始人账号打开 Settings，点「载入 Demo」。那个按钮按 Asia/Shanghai 的今天生成日期，总览默认不把 Demo 算进指标。
4. 复制 `.env.example` 为 `.env.local`，填入：

```bash
NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
```

不要把 service role key 放进这个应用。权限靠 RLS 和页面上的角色检查。

5. 在 Supabase Auth 里打开邮箱密码登录。配置好之后，登录页可以在「登录 / 注册」之间切换。第一个注册成功的用户一定是 admin，哪怕注册时带了别的角色。之后再邀请的人，如果 `raw_user_meta_data.role` 是 `content` 或 `cs`，就按这个角色建档；再写 `admin` 也不会再生出一位创始人，会落到客服。角色之后在 Settings 里改，最后一位创始人不能被降级。

本地填了这两个变量之后，登录页不再显示演示账号，改走 Supabase Auth。

## 部署到 Vercel

- Framework 选 Next.js，安装命令 `npm install`，构建命令 `npm run build`。
- 环境变量只需要 `NEXT_PUBLIC_SUPABASE_URL` 和 `NEXT_PUBLIC_SUPABASE_ANON_KEY`。
- Vercel 上如果这两个变量是空的，登录页会提示去配置，不会去写服务器上的 JSON 文件。
- `LOCAL_SESSION_SECRET` 只给本地模式的 cookie 签名，生产不需要。

## 角色

| | admin | cs | content |
| --- | --- | --- | --- |
| 客户、询盘、跟进 | 读写 | 读写 | 只读 |
| 订单、收款、成本、利润 | 读写 | 读写 | 看不到 |
| 广告和内容 | 读写 | 只读 | 读写 |
| 周复盘、月复盘文字 | 读写 | 读写 | 只读 |
| 汇率、月目标、角色 | 读写 | 不能打开 | 不能打开 |

客服保存订单时，汇率由数据库函数读取，不需要打开 Settings。内容角色的总览只保留询盘和广告，不拿 0 冒充订单和利润。

## 金额和指标

- 美元存整数美分（`$1.00` = `100`）。人民币存整数分。
- 汇率快照是「1 美元兑换多少人民币 × 1_000_000」。`7.20` 存成 `7200000`。
- 换算：`usd_cents = round(cny_fen * 1_000_000 / fx_cny_per_usd_e6)`。100 分 = 1 元，100 美分 = 1 美元，所以分除以汇率直接得到美分。
- 订单在创建时写入当时汇率。之后改 Settings 不会回写旧订单。编辑订单时可以勾选「改用当前汇率重新快照」。
- 应付 = 成交金额 − 优惠。
- 净销售额 = 应付 − 退款。已取消的订单不进区间净销售额。已退款状态仍计入净销售额（退款把它减下来），但不算有效付费。
- 累计收款 = 非退款款项 − 退款，按到账日。
- 未收余额 = 应付 − 已收。退款不会把未收加回去。
- 广告前贡献利润 = 净销售额 − 可变成本（制作、物流、其他按订单汇率从人民币换成美元，支付手续费本来就是美元）。追加成本行是在表头之外再加，不要把同一笔填两次。
- 有效付费订单：状态是已确认、制作中、已发货或已完成，并且已收款项盖住应付，或者定金加全款盖住约定定金。已取消、已退款都不是。
- 北极星：区间内新增的有效付费订单里，广告前贡献利润大于 0 的张数。默认月目标是 2026-11 为 2，2026-12 为 5，2027-01 为 8。2026 年 10 月没有默认目标，总览会显示「未设」。
- 广告花费只加总每日广告表，是组合层数字，不会平均摊到订单上。
- 订单上的「归因广告」成本是可选项。没填就是未归因，利润后的那一格不会假装已经扣过广告。归因成本大于本期组合花费时，两个数都照实显示，不互相冲销。
- 混合 CAC = 组合花费 ÷ 有效付费订单，标签是非归因。归因 CAC 只用标了归因广告的那些有效付费订单。分母为 0 时显示 —。
- 当期漏斗按区间里发生的事件计数，不要求同一个人走完全程。条数和人数分开。
- 同期群看首次询盘日落在区间里的客户。30 天和 60 天成交率只统计窗口已经结束的人。窗口还没走完的人只出现在「至今已付款」，避免把还没到期的客户算成失败。

来源字段可以空着。系统不会猜测这条询盘来自哪条广告。

## 走一遍：客户 → 跟进 → 订单 → 广告 → 总览

用创始人账号。总览先是空的，卡片上的数字都是从库里算的。

1. Customers → 新建客户。姓名填一个真实备注名，Instagram 随便用一个未占用的账号。询盘日期默认是今天（上海时区），勾上「这是有效询盘」，保存。
2. 打开这个客户，加一条跟进。任务写清楚，下次跟进日默认今天。回到 Overview，选「本月」：新增询盘和有效询盘变成 1，侧栏出现今天的跟进。
3. 在客户页点「新建订单」。产品选 3D 挂件，成交金额 `179`，约定定金 `60`，制作成本 `400`（人民币），物流 `80`，支付手续费 `0.60`，下单日是今天，状态保持已确认。保存。此时还没有收款，所以它还不是有效付费订单，未收是 `$179.00`。
4. 在订单页把定金记下来：类型定金，金额 `60`，到账日今天。汇率快照会停在保存订单时的 `7.20`（除非你改过设置）。广告前利润约为 `$111.73`：净销售额 `$179.00`，制作成本换成 `$55.56`，物流 `$11.11`，手续费 `$0.60`。未收是 `$119.00`。收款是 `$60.00`。这三列不是同一个数。
5. Marketing 加一行今天的广告。花费 `20`，展示 `10000`，点击 `200`。不要在订单上填归因广告。
6. 回到 Overview，日期用「本月」。北极星是 1，有效付费订单是 1，净销售额 `$179.00`，本期收款 `$60.00`，未收 `$119.00`，广告花费 `$20.00`，广告前利润约 `$111.73`，混合 CAC `$20.00`，归因 CAC 是 —。广告没有被摊进这张订单。

客服账号能做第 1–4 步，不能改广告和设置。内容账号能做第 5 步，能看客户，看不到订单金额。

## 库表

`profiles`、`customers`（规范化 Instagram 唯一）、`customer_status_history`、`inquiries`、`follow_ups`、`orders`、`order_payments`、`order_cost_lines`、`ad_daily_stats`、`content_posts`、`weekly_reviews`、`monthly_reviews`、`app_settings`。

流失原因：价格高、工期、运费、信任、没有预算、随便看看、选了别人、不回复、其他。已流失可以改回任意阶段，原因会清掉。
