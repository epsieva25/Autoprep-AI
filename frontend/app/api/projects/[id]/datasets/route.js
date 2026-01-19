import { NextResponse } from "next/server"

const BACKEND_BASE = "http://127.0.0.1:8000/api/projects"

export async function POST(request, { params }) {
  try {
    const { id } = params
    const body = await request.json()
    const { type, data, metadata } = body

    // Adapt payload for Python backend
    // Frontend sends: { type, data: rows[], metadata: { columns: ... } }
    // Backend expects: { columns: ..., rows: ... }
    const backendPayload = {
        columns: metadata?.columns || [],
        rows: data
    }

    const res = await fetch(`${BACKEND_BASE}/${id}/datasets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(backendPayload)
    })
    
    if (!res.ok) {
         const err = await res.text();
         throw new Error(err || "Failed to save dataset")
    }
    const dataset = await res.json()
    return NextResponse.json(dataset, { status: 201 })
  } catch (error) {
    console.error("Error saving dataset:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
