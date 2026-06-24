import { NextResponse } from "next/server";

import { requireAppContext } from "@/lib/server-context";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { supabase, user } = await requireAppContext();

    const { data: profile, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (error) {
      return NextResponse.json(
        { error: error.message, details: error.details, hint: error.hint },
        { status: 500 }
      );
    }

    const columns = profile ? Object.keys(profile) : [];

    return NextResponse.json({
      columns,
      sample: profile,
      expected: [
        "id",
        "full_name",
        "email",
        "role",
        "timezone",
        "is_active",
        "created_at",
        "last_signed_in_at"
      ]
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
