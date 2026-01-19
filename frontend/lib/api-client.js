import { AppError } from "./error-handler"

const FLASK_BASE = (typeof process !== "undefined" && process.env && process.env.NEXT_PUBLIC_FLASK_API_URL) || ""
const FLASK_API_KEY = (typeof process !== "undefined" && process.env && process.env.NEXT_PUBLIC_FLASK_API_KEY) || ""

function withBase(endpoint) {
  if (!FLASK_BASE) return endpoint
  if (endpoint.startsWith("http")) return endpoint
  return `${FLASK_BASE.replace(/\/+$/, "")}${endpoint}`
}

function genId() {
  try {
    if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID()
  } catch (_) {}
  return Math.random().toString(36).slice(2)
}

function ls() {
  try {
    return typeof window !== "undefined" ? window.localStorage : null
  } catch {
    return null
  }
}

function lsGet(key, fallback) {
  const store = ls()
  if (!store) return fallback
  try {
    const v = store.getItem(key)
    return v ? JSON.parse(v) : fallback
  } catch {
    return fallback
  }
}

function lsSet(key, value) {
  const store = ls()
  if (!store) return
  try {
    store.setItem(key, JSON.stringify(value))
  } catch {}
}

export class ApiClient {
  static async request(endpoint, options = {}, retries = 1) {
    for (let i = 0; i <= retries; i++) {
      try {
        const response = await fetch(withBase(endpoint), {
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            ...(FLASK_API_KEY ? { "x-api-key": FLASK_API_KEY } : {}),
            ...(options.headers || {}),
          },
          ...options,
        })

        if (!response.ok) {
          let errorData = {}
          try {
            errorData = await response.json()
          } catch (_) {
            // ignore parse error
          }
          throw new AppError(
            errorData.error || `HTTP ${response.status}: ${response.statusText}`,
            errorData.code,
            response.status,
          )
        }

        // Allow empty body
        const text = await response.text()
        return text ? JSON.parse(text) : {}
      } catch (error) {
        // if final attempt or client error, rethrow
        if (i === retries) throw error
        if (error instanceof AppError && error.statusCode && error.statusCode < 500) {
          throw error
        }
        // simple backoff
        await new Promise((r) => setTimeout(r, 1000 * (i + 1)))
      }
    }
  }

  static get LS_KEYS() {
    return {
      projects: "autoprep_projects",
      datasets: (pid) => `autoprep_datasets_${pid}`,
      analysis: (pid) => `autoprep_analysis_${pid}`,
      processing: (pid) => `autoprep_processing_${pid}`,
    }
  }

  static get shouldFallbackLocal() {
    return !FLASK_BASE
  }

  // Project management
  static async getProjects() {
    try {
      return await this.request("/api/projects")
    } catch (err) {
      if (!this.shouldFallbackLocal) throw err
      return lsGet(this.LS_KEYS.projects, [])
    }
  }

  static async createProject(projectData) {
    try {
      return await this.request("/api/projects", {
        method: "POST",
        body: JSON.stringify(projectData),
      })
    } catch (err) {
      if (!this.shouldFallbackLocal) throw err
      // local fallback: create and store a minimal project
      const list = lsGet(this.LS_KEYS.projects, [])
      const id = genId()
      const item = {
        id,
        name: projectData?.name || "Untitled Project",
        description: projectData?.description || null,
        meta: projectData?.meta || null,
        created_at: new Date().toISOString(),
      }
      lsSet(this.LS_KEYS.projects, [item, ...list])
      return { id }
    }
  }

  static async getProject(id) {
    try {
      return await this.request(`/api/projects/${id}`)
    } catch (err) {
      if (!this.shouldFallbackLocal) throw err
      const list = lsGet(this.LS_KEYS.projects, [])
      const found = list.find((p) => p.id === id)
      if (!found) throw new AppError("Project not found locally", "NOT_FOUND", 404)
      return found
    }
  }

  static async updateProject(id, updates) {
    try {
      return await this.request(`/api/projects/${id}`, {
        method: "PUT",
        body: JSON.stringify(updates),
      })
    } catch (err) {
      if (!this.shouldFallbackLocal) throw err
      const list = lsGet(this.LS_KEYS.projects, [])
      const idx = list.findIndex((p) => p.id === id)
      if (idx >= 0) {
        list[idx] = { ...list[idx], ...updates }
        lsSet(this.LS_KEYS.projects, list)
      }
      return { ok: true }
    }
  }

  static async deleteProject(id) {
    try {
      return await this.request(`/api/projects/${id}`, {
        method: "DELETE",
      })
    } catch (err) {
      if (!this.shouldFallbackLocal) throw err
      const list = lsGet(this.LS_KEYS.projects, [])
      lsSet(
        this.LS_KEYS.projects,
        list.filter((p) => p.id !== id),
      )
      // also clear related local data
      lsSet(this.LS_KEYS.datasets(id), [])
      lsSet(this.LS_KEYS.analysis(id), [])
      lsSet(this.LS_KEYS.processing(id), [])
      return { ok: true }
    }
  }

  // Dataset management
  static async saveDataset(projectId, datasetData) {
    try {
      return await this.request(`/api/projects/${projectId}/datasets`, {
        method: "POST",
        body: JSON.stringify(datasetData),
      })
    } catch (err) {
      if (!this.shouldFallbackLocal) throw err
      const list = lsGet(this.LS_KEYS.datasets(projectId), [])
      const id = genId()
      list.unshift({
        id,
        ...datasetData,
        created_at: new Date().toISOString(),
      })
      lsSet(this.LS_KEYS.datasets(projectId), list)
      return { id }
    }
  }

  // Analysis results
  static async saveAnalysis(projectId, analysisData) {
    try {
      return await this.request(`/api/projects/${projectId}/analysis`, {
        method: "POST",
        body: JSON.stringify(analysisData),
      })
    } catch (err) {
      if (!this.shouldFallbackLocal) throw err
      const list = lsGet(this.LS_KEYS.analysis(projectId), [])
      const id = genId()
      list.unshift({
        id,
        ...analysisData,
        created_at: new Date().toISOString(),
      })
      lsSet(this.LS_KEYS.analysis(projectId), list)
      return { id }
    }
  }

  // Processing history
  static async saveProcessingHistory(projectId, processingData) {
    try {
      return await this.request(`/api/projects/${projectId}/processing`, {
        method: "POST",
        body: JSON.stringify(processingData),
      })
    } catch (err) {
      if (!this.shouldFallbackLocal) throw err
      const list = lsGet(this.LS_KEYS.processing(projectId), [])
      const id = genId()
      list.unshift({
        id,
        ...processingData,
        created_at: new Date().toISOString(),
      })
      lsSet(this.LS_KEYS.processing(projectId), list)
      return { id }
    }
  }
}
