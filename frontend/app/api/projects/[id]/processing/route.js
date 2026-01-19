import { NextResponse } from "next/server"

const BACKEND_BASE = "http://127.0.0.1:8000/api/projects"

export async function POST(request, { params }) {
  try {
    const { id } = params
    const body = await request.json()
    const { transformations, before_stats, after_stats, processing_time } = body

    // Adapt payload
    // Backend expects: steps, result_preview
    const backendPayload = {
        steps: transformations,
        result_preview: { before_stats, after_stats, processing_time }
    }

    const res = await fetch(`${BACKEND_BASE}/${id}/processing`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(backendPayload)
    })
    
    if (!res.ok) {
         const err = await res.text();
         throw new Error(err || "Failed to save processing")
    }
    const processing = await res.json()
    return NextResponse.json(processing, { status: 201 })
  } catch (error) {
    console.error("Error saving processing:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
