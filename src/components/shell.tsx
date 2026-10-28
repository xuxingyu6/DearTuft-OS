"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarClock, CalendarRange, LayoutDashboard, Menu, Megaphone, Receipt, Settings, Users } from "lucide-react";

import { signOut } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ROLE_LABEL } from "@/lib/labels";
import type { Role, SessionUser } from "@/lib/types";
import { cn } from "@/lib/utils";

const NAV: { href: string; label: string; zh: string; icon: typeof Users; roles?: Role[] }[] = [
  { href: "/", label: "Overview", zh: "总览", icon: LayoutDashboard },
  { href: "/customers", label: "Customers", zh: "客户", icon: Users },
  { href: "/marketing", label: "Marketing", zh: "营销", icon: Megaphone },
  { href: "/orders", label: "Orders", zh: "订单", icon: Receipt, roles: ["admin", "cs"] },
  { href: "/weekly-review", label: "Weekly Review", zh: "周复盘", icon: CalendarRange },
  { href: "/monthly-review", label: "Monthly Review", zh: "月复盘", icon: CalendarClock },
  { href: "/settings", label: "Settings", zh: "设置", icon: Settings, roles: ["admin"] },
];

function active(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

function NavLinks({ items, pathname, onNavigate }: { items: typeof NAV; pathname: string; onNavigate?: () => void }) {
  return (
    <nav className="flex flex-col gap-1 px-3">
      {items.map((item) => {
        const Icon = item.icon;
        const on = active(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm",
              on ? "bg-primary text-primary-foreground" : "text-foreground/80 hover:bg-muted",
            )}
          >
            <Icon className="size-4" />
            <span className="font-medium">{item.label}</span>
            <span className={cn("ml-auto text-xs", on ? "text-primary-foreground/80" : "text-muted-foreground")}>{item.zh}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function Brand() {
  return (
    <Link href="/" className="flex items-center gap-2 px-4 py-4">
      <span className="grid size-8 place-items-center rounded-lg bg-primary text-xs font-semibold text-primary-foreground">Dt</span>
      <span>
        <span className="block text-sm font-semibold tracking-tight">DearTuft OS</span>
        <span className="block text-xs text-muted-foreground">内部经营</span>
      </span>
    </Link>
  );
}

function Footer({ user }: { user: SessionUser }) {
  return (
    <div className="mt-auto border-t border-border p-3">
      <div className="px-2 text-sm font-medium">{user.fullName}</div>
      <div className="px-2 text-xs text-muted-foreground">
        {ROLE_LABEL[user.role]} · {user.email}
      </div>
      <form action={signOut} className="mt-2">
        <Button type="submit" variant="ghost" size="sm" className="w-full justify-start">
          退出
        </Button>
      </form>
    </div>
  );
}

export function Shell({ user, children }: { user: SessionUser; children: React.ReactNode }) {
  const pathname = usePathname();
  const items = NAV.filter((item) => !item.roles || item.roles.includes(user.role));
  return (
    <div className="min-h-screen bg-background text-foreground">
      <aside className="fixed inset-y-0 left-0 hidden w-60 flex-col border-r border-border bg-card md:flex">
        <Brand />
        <NavLinks items={items} pathname={pathname} />
        <Footer user={user} />
      </aside>
      <div className="md:pl-60">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-background/90 px-4 py-3 backdrop-blur md:hidden">
          <Sheet>
            <SheetTrigger render={<Button variant="outline" size="icon" aria-label="打开导航" />}>
              <Menu />
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0">
              <SheetHeader className="p-0">
                <SheetTitle className="sr-only">导航</SheetTitle>
                <Brand />
              </SheetHeader>
              <NavLinks items={items} pathname={pathname} />
              <Footer user={user} />
            </SheetContent>
          </Sheet>
          <span className="text-sm font-semibold">DearTuft OS</span>
        </header>
        <main className="mx-auto w-full max-w-6xl px-4 py-6 md:px-8 md:py-8">{children}</main>
      </div>
    </div>
  );
}

export function ShellFallback() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-4 py-10 text-sm text-muted-foreground">正在打开 DearTuft OS…</div>
    </div>
  );
}
