import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { runtimeMode } from "@/lib/env";
import { LOCAL_COOKIE, readSession } from "@/lib/session";

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const isLogin = pathname.startsWith("/login");
  const mode = runtimeMode();

  if (mode === "supabase") {
    let response = NextResponse.next({ request });
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
            response = NextResponse.next({ request });
            for (const { name, value, options } of cookiesToSet) response.cookies.set(name, value, options);
          },
        },
      },
    );
    const { data } = await supabase.auth.getUser();
    if (!data.user && !isLogin) return NextResponse.redirect(new URL("/login", request.url));
    if (data.user && isLogin) return NextResponse.redirect(new URL("/", request.url));
    return response;
  }

  const session = mode === "local" ? await readSession(request.cookies.get(LOCAL_COOKIE)?.value) : null;
  if (!session && !isLogin) return NextResponse.redirect(new URL("/login", request.url));
  if (session && isLogin) return NextResponse.redirect(new URL("/", request.url));
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
