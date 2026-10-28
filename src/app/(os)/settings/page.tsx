import { Suspense } from "react";

import { clearDemoData, loadDemoData } from "@/app/actions/settings";
import { requireUser } from "@/lib/auth";
import { PageHeader, Panel } from "@/components/bits";
import { RoleForm, SettingsForm } from "@/components/record-forms";
import { Button } from "@/components/ui/button";
import { getDb } from "@/lib/db";
import { ROLE_LABEL } from "@/lib/labels";
import { can } from "@/lib/permissions";

export default function SettingsPage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">正在读取设置…</p>}>
      <Settings />
    </Suspense>
  );
}

async function Settings() {
  const user = await requireUser();
  if (!can(user.role, "settings.read")) {
    return (
      <PageHeader
        eyebrow="Settings"
        title="设置仅创始人可看"
        description="汇率和月度目标属于敏感财务配置。客服下单时会用到当时的汇率快照，但不能打开或修改这里。"
      />
    );
  }
  const snapshot = await (await getDb()).loadSnapshot();
  return (
    <>
      <PageHeader eyebrow="Settings" title="设置" description="汇率和月目标只存在这里。订单保存自己的汇率，避免以后改汇率把旧利润算乱。" />
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="汇率与月目标">
          <SettingsForm fxE6={snapshot.fxE6} targets={snapshot.targets} />
        </Panel>
        <div className="grid content-start gap-6">
          <Panel title="成员角色">
            <ul className="grid gap-3">
              {snapshot.profiles.map((profile) => (
                <li key={profile.id} className="grid gap-1">
                  <div className="text-sm">
                    <span className="font-medium">{profile.full_name}</span>
                    <span className="ml-2 text-muted-foreground">{profile.email}</span>
                    <span className="ml-2 text-xs text-muted-foreground">{ROLE_LABEL[profile.role]}</span>
                  </div>
                  <RoleForm profile={profile} />
                </li>
              ))}
            </ul>
          </Panel>
          <Panel title="Demo 数据">
            <p className="mb-3 text-sm text-muted-foreground">所有演示记录都带 Demo 标记，名字以【Demo】开头。总览默认不把它们算进指标。</p>
            <div className="flex flex-wrap gap-2">
              <form action={loadDemoData}><Button type="submit" variant="outline">载入 Demo</Button></form>
              <form action={clearDemoData}><Button type="submit" variant="destructive">清除 Demo</Button></form>
            </div>
          </Panel>
        </div>
      </div>
    </>
  );
}
