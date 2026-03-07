import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "momentum-grid-frontend",
    timestamp: new Date().toISOString()
  });
}
