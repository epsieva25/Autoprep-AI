import { NextResponse } from "next/server"

const BACKEND_BASE = "http://127.0.0.1:8000/api/projects"

export async function GET(_request, { params }) {
  try {
    const { id } = params
    
    // Fetch project details
    const projRes = await fetch(`${BACKEND_BASE}/${id}`, { cache: "no-store" })
    if (!projRes.ok) {
        if (projRes.status === 404) return NextResponse.json({ error: "Project not found" }, { status: 404 })
        throw new Error("Failed to fetch project")
    }
    const project = await projRes.json()

    // Fetch related data in parallel
    const [datasetsRes, analysisRes, processingRes] = await Promise.all([
        fetch(`${BACKEND_BASE}/${id}/datasets`, { cache: "no-store" }),
        fetch(`${BACKEND_BASE}/${id}/analysis`, { cache: "no-store" }),
        fetch(`${BACKEND_BASE}/${id}/processing`, { cache: "no-store" })
    ])

    const datasets = datasetsRes.ok ? await datasetsRes.json() : []
    const analysis_results = analysisRes.ok ? await analysisRes.json() : []
    const processing_history = processingRes.ok ? await processingRes.json() : []

    // Combine
    const fullProject = {
        ...project,
        datasets,
        analysis_results,
        processing_history
    }

    return NextResponse.json({ project: fullProject })
  } catch (error) {
    console.error("Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(request, { params }) {
  try {
    const { id } = params
    const body = await request.json()
    
    const res = await fetch(`${BACKEND_BASE}/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
    })

    if (!res.ok) {
         const err = await res.text();
         throw new Error(err || "Failed to update project")
    }
    
    // Fetch updated project to return
    const updatedRes = await fetch(`${BACKEND_BASE}/${id}`, { cache: "no-store" })
    const updatedProject = await updatedRes.json()

    return NextResponse.json({ project: updatedProject })
  } catch (error) {
    console.error("Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(_request, { params }) {
  try {
    const { id } = params
    const res = await fetch(`${BACKEND_BASE}/${id}`, { method: "DELETE" })
    
    if (!res.ok) {
         throw new Error("Failed to delete project")
    }

    return NextResponse.json({ message: "Project deleted successfully" })
  } catch (error) {
    console.error("Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
