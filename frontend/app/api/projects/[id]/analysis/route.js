import { NextResponse } from "next/server"

const BACKEND_BASE = "http://127.0.0.1:8000/api/projects"

export async function POST(request, { params }) {
  try {
    const { id } = params
    const body = await request.json()
    const { quality_score, issues_detected, column_analysis, ai_insights } = body

    // Adapt payload
    // Backend expects: summary, details
    const backendPayload = {
        summary: { quality_score, issues_detected },
        details: { column_analysis, ai_insights }
    }

    const res = await fetch(`${BACKEND_BASE}/${id}/analysis`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(backendPayload)
    })
    
    if (!res.ok) {
         const err = await res.text();
         throw new Error(err || "Failed to save analysis")
    }
    const analysis = await res.json()
    return NextResponse.json(analysis, { status: 201 })
  } catch (error) {
    console.error("Error saving analysis:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
