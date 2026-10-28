"use client";

import { useState } from "react";

import { saveCustomer } from "@/app/actions/crm";
import { BindForm } from "@/components/bind-form";
import { Field, Select } from "@/components/bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { LOST_REASON_LABEL, PLATFORM_LABEL, PRODUCT_HINT, PRODUCT_LABEL, STAGE_LABEL } from "@/lib/labels";
import { centsToInput } from "@/lib/money";
import { LOST_REASONS, PLATFORMS, PRODUCTS, STAGES, type Customer } from "@/lib/types";

export function CustomerForm({ customer, today = "" }: { customer?: Customer; today?: string }) {
  const [stage, setStage] = useState(customer?.stage ?? "new_inquiry");
  return (
    <BindForm action={saveCustomer} className="grid gap-4">
      {(pending) => (
        <>
          {customer ? <input type="hidden" name="id" value={customer.id} /> : null}
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="姓名 / 备注名">
              <Input name="name" required defaultValue={customer?.name ?? ""} placeholder="例如 Mia 的妈妈" />
            </Field>
            <Field label="销售阶段">
              <Select name="stage" value={stage} onChange={(event) => setStage(event.target.value as Customer["stage"])}>
                {STAGES.map((item) => (
                  <option key={item} value={item}>
                    {STAGE_LABEL[item]}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Instagram" hint="去掉 @ 后全局唯一。没有账号就留空。">
              <Input name="instagram_handle" defaultValue={customer?.instagram_handle ?? ""} placeholder="@name" />
            </Field>
            <Field label="TikTok">
              <Input name="tiktok_handle" defaultValue={customer?.tiktok_handle ?? ""} />
            </Field>
            <Field label="主页链接">
              <Input name="profile_url" defaultValue={customer?.profile_url ?? ""} placeholder="https://" />
            </Field>
            <Field label="国家">
              <Input name="country" defaultValue={customer?.country ?? ""} placeholder="US" />
            </Field>
            <Field label="联系方式">
              <Input name="contact" defaultValue={customer?.contact ?? ""} placeholder="邮箱、WhatsApp 或微信" />
            </Field>
            <Field label="首次询盘日">
              <Input type="date" name="first_inquiry_date" defaultValue={customer?.first_inquiry_date ?? today} />
            </Field>
            <Field label="获客平台" hint="没有可靠来源就留空，不要猜。">
              <Select name="acquisition_platform" defaultValue={customer?.acquisition_platform ?? ""}>
                <option value="">未知 / 不归因</option>
                {PLATFORMS.map((item) => (
                  <option key={item} value={item}>
                    {PLATFORM_LABEL[item]}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="来源内容" hint="只有客户明确说出来才填。">
              <Input name="source_content" defaultValue={customer?.source_content ?? ""} />
            </Field>
            <Field label="来源广告活动">
              <Input name="source_campaign" defaultValue={customer?.source_campaign ?? ""} />
            </Field>
            <Field label="最新意向">
              <Input name="latest_intent" defaultValue={customer?.latest_intent ?? ""} />
            </Field>
          </div>
          {stage === "lost" ? (
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="流失原因">
                <Select name="lost_reason" defaultValue={customer?.lost_reason ?? ""} required>
                  <option value="">请选择</option>
                  {LOST_REASONS.map((item) => (
                    <option key={item} value={item}>
                      {LOST_REASON_LABEL[item]}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="其他说明" hint="选「其他」时写下原话。流失后可以再改回任意阶段。">
                <Input name="lost_reason_custom" defaultValue={customer?.lost_reason_custom ?? ""} />
              </Field>
            </div>
          ) : null}
          <fieldset className="grid gap-2">
            <legend className="text-sm font-medium">感兴趣的产品</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {PRODUCTS.map((product) => (
                <label key={product} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    name="products"
                    value={product}
                    defaultChecked={customer?.interested_products.includes(product)}
                  />
                  <span>
                    {PRODUCT_LABEL[product]}
                    <span className="ml-2 text-xs text-muted-foreground">{PRODUCT_HINT[product]}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="宠物种类">
              <Input name="pet_type" defaultValue={customer?.pet_type ?? ""} />
            </Field>
            <Field label="是否在世">
              <Select name="pet_alive" defaultValue={customer?.pet_alive == null ? "" : customer.pet_alive ? "yes" : "no"}>
                <option value="">未知</option>
                <option value="yes">在世</option>
                <option value="no">已离世</option>
              </Select>
            </Field>
            <Field label="购买用途">
              <Input name="purchase_purpose" defaultValue={customer?.purchase_purpose ?? ""} />
            </Field>
            <Field label="数量">
              <Input name="quantity" inputMode="numeric" defaultValue={customer?.quantity ?? ""} />
            </Field>
            <Field label="尺寸">
              <Input name="size_note" defaultValue={customer?.size_note ?? ""} />
            </Field>
            <Field label="预算（USD）">
              <Input name="budget" inputMode="decimal" defaultValue={centsToInput(customer?.budget_usd_cents)} placeholder="179.00" />
            </Field>
          </div>
          <Field label="特殊要求">
            <Textarea name="special_requirements" defaultValue={customer?.special_requirements ?? ""} />
          </Field>
          <Field label="备注">
            <Textarea name="notes" defaultValue={customer?.notes ?? ""} />
          </Field>
          {!customer ? (
            <fieldset className="grid gap-3 rounded-xl border border-border p-4">
              <label className="flex items-center gap-2 text-sm font-medium">
                <input type="checkbox" name="create_inquiry" defaultChecked />
                同时记第一条询盘
              </label>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="询盘日期">
                  <Input type="date" name="inquiry_date" defaultValue={today} />
                </Field>
                <Field label="询盘平台">
                  <Select name="inquiry_platform" defaultValue="ig">
                    {PLATFORMS.map((item) => (
                      <option key={item} value={item}>
                        {PLATFORM_LABEL[item]}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="产品意向">
                  <Input name="inquiry_product" />
                </Field>
                <label className="flex items-center gap-2 text-sm md:mt-7">
                  <input type="checkbox" name="inquiry_valid" />
                  这是有效询盘
                </label>
                <Field label="来源内容（可空）">
                  <Input name="inquiry_source_content" />
                </Field>
                <Field label="来源广告（可空）">
                  <Input name="inquiry_source_campaign" />
                </Field>
              </div>
              <Field label="询盘备注">
                <Textarea name="inquiry_notes" />
              </Field>
            </fieldset>
          ) : null}
          <div>
            <Button type="submit" disabled={pending}>
              {pending ? "保存中…" : "保存客户"}
            </Button>
          </div>
        </>
      )}
    </BindForm>
  );
}
