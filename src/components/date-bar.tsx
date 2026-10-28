import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PRESET_LABEL } from "@/lib/labels";
import { PRESETS, type Preset } from "@/lib/dates";
import { cn } from "@/lib/utils";

export function DateBar({
  path,
  preset,
  from,
  to,
  includeDemo,
  demoCount,
}: {
  path: string;
  preset: Preset;
  from: string;
  to: string;
  includeDemo: boolean;
  demoCount?: number;
}) {
  const demo = includeDemo ? "&demo=1" : "";
  return (
    <div className="mb-6 grid gap-3">
      <div className="flex flex-wrap items-center gap-2">
        {PRESETS.filter((item) => item !== "custom").map((item) => (
          <Link
            key={item}
            href={`${path}?preset=${item}${demo}`}
            className={cn(
              "rounded-lg px-2.5 py-1.5 text-sm",
              preset === item ? "bg-primary text-primary-foreground" : "bg-card ring-1 ring-foreground/10",
            )}
          >
            {PRESET_LABEL[item]}
          </Link>
        ))}
        <form method="get" className="flex flex-wrap items-center gap-2">
          <input type="hidden" name="preset" value="custom" />
          {includeDemo ? <input type="hidden" name="demo" value="1" /> : null}
          <Input type="date" name="from" defaultValue={from} className="w-36" />
          <Input type="date" name="to" defaultValue={to} className="w-36" />
          <Button type="submit" variant="outline" size="sm">
            应用
          </Button>
        </form>
      </div>
      <div className="text-xs text-muted-foreground">
        {from} 至 {to}，按 Asia/Shanghai 的“今天”计算预设。
        {demoCount ? (
          <>
            {" "}
            库里有 Demo 记录。
            {includeDemo ? (
              <Link className="ml-1 underline" href={`${path}?preset=${preset}&from=${from}&to=${to}`}>
                只看正式数据
              </Link>
            ) : (
              <Link className="ml-1 underline" href={`${path}?preset=${preset}&from=${from}&to=${to}&demo=1`}>
                把 Demo 计入指标
              </Link>
            )}
          </>
        ) : null}
      </div>
    </div>
  );
}
