"use client";

import { useMemo, useState } from "react";

import { saveOrder } from "@/app/actions/orders";
import { BindForm } from "@/components/bind-form";
import { Field, Select } from "@/components/bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ORDER_STATUS_LABEL, PRODUCT_HINT, PRODUCT_LABEL } from "@/lib/labels";
import { centsToInput, formatFx } from "@/lib/money";
import { ORDER_STATUSES, PRODUCTS, type Order } from "@/lib/types";

export function OrderForm({
  customers,
  order,
  currentFxE6,
  presetCustomerId,
  today = "",
}: {
  customers: { id: string; name: string; isDemo: boolean }[];
  order?: Order;
  currentFxE6: number;
  presetCustomerId?: string;
  today?: string;
}) {
  const [product, setProduct] = useState(order?.product_code ?? "3d_charm");
  const hint = useMemo(() => PRODUCT_HINT[product], [product]);
  return (
    <BindForm action={saveOrder} className="grid gap-4">
      {(pending) => (
        <>
          {order ? <input type="hidden" name="id" value={order.id} /> : null}
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="客户">
              <Select name="customer_id" defaultValue={order?.customer_id ?? presetCustomerId ?? ""} required>
                <option value="">请选择</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name}
                    {customer.isDemo ? "（Demo）" : ""}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="产品" hint={hint}>
              <Select
                name="product_code"
                value={product}
                onChange={(event) => setProduct(event.target.value as Order["product_code"])}
              >
                {PRODUCTS.map((item) => (
                  <option key={item} value={item}>
                    {PRODUCT_LABEL[item]}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="产品说明">
              <Input name="product_name" defaultValue={order?.product_name ?? PRODUCT_LABEL[product]} />
            </Field>
            <Field label="尺寸">
              <Input name="size_note" defaultValue={order?.size_note ?? ""} />
            </Field>
            <Field label="数量">
              <Input name="quantity" inputMode="numeric" defaultValue={order?.quantity ?? 1} />
            </Field>
            <Field label="状态下单">
              <Select name="status" defaultValue={order?.status ?? "confirmed"}>
                {ORDER_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {ORDER_STATUS_LABEL[status]}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="成交金额 USD" hint="不含代收税。">
              <Input name="gross" inputMode="decimal" defaultValue={centsToInput(order?.gross_amount_usd_cents ?? 0)} />
            </Field>
            <Field label="优惠 USD">
              <Input name="discount" inputMode="decimal" defaultValue={centsToInput(order?.discount_usd_cents ?? 0)} />
            </Field>
            <Field label="约定定金 USD" hint="这是约定金额，不是已经收到的现金。">
              <Input name="deposit" inputMode="decimal" defaultValue={centsToInput(order?.agreed_deposit_usd_cents ?? 0)} />
            </Field>
            <Field label="制作成本 CNY">
              <Input name="production" inputMode="decimal" defaultValue={centsToInput(order?.production_cost_cny_fen ?? 0)} />
            </Field>
            <Field label="物流成本 CNY">
              <Input name="shipping" inputMode="decimal" defaultValue={centsToInput(order?.shipping_cost_cny_fen ?? 0)} />
            </Field>
            <Field label="支付手续费 USD">
              <Input name="fee" inputMode="decimal" defaultValue={centsToInput(order?.payment_fee_usd_cents ?? 0)} />
            </Field>
            <Field label="其他可变成本 CNY">
              <Input name="other_cost" inputMode="decimal" defaultValue={centsToInput(order?.other_cost_cny_fen ?? 0)} />
            </Field>
            <Field label="下单日">
              <Input type="date" name="order_date" required defaultValue={order?.order_date ?? today} />
            </Field>
            <Field label="预计发货">
              <Input type="date" name="expected_ship_date" defaultValue={order?.expected_ship_date ?? ""} />
            </Field>
            <Field label="实际发货">
              <Input type="date" name="actual_ship_date" defaultValue={order?.actual_ship_date ?? ""} />
            </Field>
            <Field label="评价日期">
              <Input type="date" name="review_on" defaultValue={order?.review_on ?? ""} />
            </Field>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="has_review" defaultChecked={order?.has_review} />
            已收到评价或推荐
          </label>
          <Field label="备注">
            <Textarea name="notes" defaultValue={order?.notes ?? ""} />
          </Field>
          <p className="text-xs leading-5 text-muted-foreground">
            {order
              ? `本单汇率快照 ${formatFx(order.fx_cny_per_usd_e6)}（1 USD = ${formatFx(order.fx_cny_per_usd_e6)} CNY）。当前设置为 ${formatFx(currentFxE6)}。`
              : `保存时会写入当前汇率 ${formatFx(currentFxE6)}。之后改设置不会回写这张订单。`}
            人民币成本按这笔快照换成美元后再算贡献利润。广告花费不要填在这里。
          </p>
          {order ? (
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="refresh_fx" />
              改用当前汇率重新快照
            </label>
          ) : null}
          <div>
            <Button type="submit" disabled={pending}>
              {pending ? "保存中…" : "保存订单"}
            </Button>
          </div>
        </>
      )}
    </BindForm>
  );
}
