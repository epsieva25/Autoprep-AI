import { NextResponse } from "next/server"

const BACKEND_URL = "http://127.0.0.1:8000/api/projects"

export async function GET() {
  try {
    const res = await fetch(BACKEND_URL, { cache: "no-store" })
    if (!res.ok) {
        const err = await res.text();
        throw new Error(err || "Failed to fetch from backend")
    }
    const projects = await res.json()
    return NextResponse.json(projects)
  } catch (error) {
    console.error("Error fetching projects:", error)
    return NextResponse.json({ error: "Failed to fetch projects" }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const body = await request.json()
    const res = await fetch(BACKEND_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
    })
    
    if (!res.ok) {
         const err = await res.text();
         throw new Error(err || "Failed to create project")
    }
    const project = await res.json()
    return NextResponse.json(project, { status: 201 })
  } catch (error) {
    console.error("Error creating project:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
