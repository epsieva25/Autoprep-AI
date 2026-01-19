import { NextResponse } from "next/server"

export async function GET() {
  try {
    const res = await fetch("http://127.0.0.1:8000/health", { cache: "no-store" })
    if (!res.ok) {
        throw new Error("Backend unavailable")
    }
    const data = await res.json()
    return NextResponse.json({
      status: "ok",
      database: "connected (sqlite)",
      backend_response: data,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        message: "Service unavailable",
        error: error.message,
      },
      { status: 500 },
    )
  }
}
