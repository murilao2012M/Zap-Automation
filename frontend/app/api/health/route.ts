import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    success: true,
    message: "Frontend online",
    data: {
      app: "zap-automation-frontend",
      environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "development",
      api_url: process.env.NEXT_PUBLIC_API_URL ?? "",
    },
  });
}
