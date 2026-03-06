import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "lifeflow-frontend",
    timestamp: new Date().toISOString()
  });
}
