import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { getSupabaseEnv } from "@/lib/supabase/env";
import type { Database } from "@/lib/types/database";

function getSafeNextPath(raw: string | null) {
  if (raw && raw.startsWith("/")) {
    return raw;
  }
  return "/dashboard";
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const nextPath = getSafeNextPath(requestUrl.searchParams.get("next"));
  const errorRedirect = new URL("/login?error=Google%20sign-in%20failed", requestUrl.origin);

  if (!code) {
    return NextResponse.redirect(errorRedirect);
  }

  const { url, anonKey } = getSupabaseEnv();
  const response = NextResponse.redirect(new URL(nextPath, requestUrl.origin));

  const supabase = createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      }
    }
  });

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(errorRedirect);
  }

  const { data: accountId, error: ensureError } = await supabase.rpc("ensure_my_account");
  if (ensureError || !accountId) {
    return NextResponse.redirect(new URL("/login?error=missing-account", requestUrl.origin));
  }

  await supabase.rpc("update_my_last_signed_in");

  return response;
}
