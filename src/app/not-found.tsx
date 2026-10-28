import Link from "next/link";

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center px-4">
      <div className="max-w-md text-sm">
        <h1 className="text-lg font-semibold">没有这一页</h1>
        <p className="mt-2 text-muted-foreground">客户或订单可能已被删除。</p>
        <Link href="/" className="mt-4 inline-block underline">回总览</Link>
      </div>
    </main>
  );
}