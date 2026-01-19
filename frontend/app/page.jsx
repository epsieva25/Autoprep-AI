"use client"

import { useMemo, useState } from "react"
import Papa from "papaparse"
import { ApiClient } from "@/lib/api-client"
import MetricCard from "./MetricCard"
import ConnectionStatus from "@/components/connection-status"
import useSWR from "swr"

const SAMPLE_PIMA = `Pregnancies,Glucose,BloodPressure,SkinThickness,Insulin,BMI,DiabetesPedigreeFunction,Age,Outcome
6,148,72,35,0,33.6,0.627,50,1
1,85,66,29,0,26.6,0.351,31,0
8,183,64,0,0,23.3,0.672,32,1
1,89,66,23,94,28.1,0.167,21,0
0,137,40,35,168,43.1,2.288,33,1`

const SAMPLE_IRIS = `sepal_length,sepal_width,petal_length,petal_width,species
5.1,3.5,1.4,0.2,setosa
4.9,3.0,1.4,0.2,setosa
6.3,3.3,6.0,2.5,virginica
5.8,2.7,5.1,1.9,virginica
5.7,2.8,4.1,1.3,versicolor`

const SAMPLE_TITANIC = `Pclass,Sex,Age,SibSp,Parch,Fare,Embarked,Survived
3,male,22,1,0,7.25,S,0
1,female,38,1,0,71.2833,C,1
3,female,26,0,0,7.925,S,1
1,female,35,1,0,53.1,S,1
3,male,35,0,0,8.05,S,0`

const SAMPLE_MAP = {
  pima: { name: "Pima Diabetes", csv: SAMPLE_PIMA },
  iris: { name: "Iris", csv: SAMPLE_IRIS },
  titanic: { name: "Titanic (subset)", csv: SAMPLE_TITANIC },
}

export default function Page() {
  // State
  const [csvText, setCsvText] = useState("")
  const [data, setData] = useState([]) // array of objects
  const [headers, setHeaders] = useState([])
  const [processing, setProcessing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState("columns") // 'columns' | 'issues' | 'preview'
  const [dropActive, setDropActive] = useState(false)
  const [showProjects, setShowProjects] = useState(false)
  const [sampleChoice, setSampleChoice] = useState("pima")
  const [explainOpen, setExplainOpen] = useState(false)
  const [explainText, setExplainText] = useState("")

  // Options
  const [trimWhitespace, setTrimWhitespace] = useState(true)
  const [removeEmptyRows, setRemoveEmptyRows] = useState(true)
  const [imputeNumeric, setImputeNumeric] = useState(true)
  const [imputeCategorical, setImputeCategorical] = useState(false)

  const { data: savedProjects = [], mutate: refreshProjects } = useSWR(
    showProjects ? "/api/projects" : null,
    async () => {
      try {
        const list = await ApiClient.getProjects()
        return Array.isArray(list) ? list : []
      } catch (e) {
        console.error("[v0] fetch projects error:", e)
        return []
      }
    },
    { revalidateOnFocus: false },
  )

  // Helpers
  function parseCsv(text) {
    const res = Papa.parse(text, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: true,
    })
    if (res.errors?.length) {
      console.warn("[v0] PapaParse errors:", res.errors.slice(0, 3))
    }
    const rows = res.data || []
    const hdrs = res.meta?.fields || (rows[0] ? Object.keys(rows[0]) : [])
    setData(rows)
    setHeaders(hdrs)
  }

  async function handleFile(e) {
    setError(null)
    const file = e.target?.files?.[0]
    if (!file) return
    const text = await file.text()
    setCsvText(text)
    parseCsv(text)
  }

  function handlePaste(e) {
    setError(null)
    const text = e.target.value || ""
    setCsvText(text)
  }

  function applyFixes() {
    try {
      setProcessing(true)
      let rows = [...data]

      // Trim whitespace
      if (trimWhitespace) {
        rows = rows.map((r) => {
          const nr = {}
          for (const k in r) {
            const v = r[k]
            nr[k] = typeof v === "string" ? v.trim() : v
          }
          return nr
        })
      }

      // Remove empty rows (all values empty/null/undefined)
      if (removeEmptyRows) {
        rows = rows.filter((r) =>
          Object.values(r).some((v) => v !== null && v !== undefined && String(v).trim() !== ""),
        )
      }

      // Compute column stats
      const cols = headers
      const isNumberCol = {}
      cols.forEach((c) => {
        const nonNull = rows.map((r) => r[c]).filter((v) => v !== null && v !== undefined && String(v) !== "")
        const numeric = nonNull.every((v) => typeof v === "number")
        isNumberCol[c] = numeric
      })

      // Impute numeric mean
      if (imputeNumeric) {
        cols.forEach((c) => {
          if (!isNumberCol[c]) return
          const nums = rows.map((r) => r[c]).filter((v) => typeof v === "number")
          const mean = nums.length > 0 ? nums.reduce((a, b) => a + b, 0) / nums.length : 0
          rows = rows.map((r) => {
            const v = r[c]
            if (v === null || v === undefined || (typeof v !== "number" && String(v).trim() === "")) {
              return { ...r, [c]: mean }
            }
            return r
          })
        })
      }

      // Impute categorical mode
      if (imputeCategorical) {
        cols.forEach((c) => {
          if (isNumberCol[c]) return
          const freq = new Map()
          rows.forEach((r) => {
            const v = r[c]
            if (v === null || v === undefined || String(v).trim() === "") return
            const key = String(v)
            freq.set(key, (freq.get(key) || 0) + 1)
          })
          if (freq.size === 0) return
          const mode = [...freq.entries()].sort((a, b) => b[1] - a[1])[0][0]
          rows = rows.map((r) => {
            const v = r[c]
            if (v === null || v === undefined || String(v).trim() === "") {
              return { ...r, [c]: mode }
            }
            return r
          })
        })
      }

      setData(rows)
    } catch (err) {
      console.error("[v0] applyFixes error:", err)
      setError("Failed to apply fixes.")
    } finally {
      setProcessing(false)
    }
  }

  function downloadCsv(rows, name = "dataset.csv") {
    try {
      const csv = Papa.unparse(rows)
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = name
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error("[v0] downloadCsv error:", err)
      setError("Failed to download CSV.")
    }
  }

  const summary = useMemo(() => {
    const rowCount = data.length
    const colCount = headers.length
    let missing = 0
    data.forEach((r) => {
      headers.forEach((h) => {
        const v = r[h]
        if (v === null || v === undefined || String(v).trim() === "") missing++
      })
    })
    return { rowCount, colCount, missing }
  }, [data, headers])

  const totalCells = summary.rowCount * summary.colCount
  const qualityScore = useMemo(() => {
    if (totalCells === 0) return 100
    const pct = 100 - (summary.missing / Math.max(1, totalCells)) * 100
    return Math.max(0, Math.min(100, Math.round(pct)))
  }, [summary.missing, totalCells])

  const columnStats = useMemo(() => {
    return headers.map((h) => {
      const values = data.map((r) => r[h])
      const nonEmpty = values.filter((v) => v !== null && v !== undefined && String(v).trim() !== "")
      const missing = values.length - nonEmpty.length
      const isNumeric = nonEmpty.every((v) => typeof v === "number")
      const uniques = new Set(nonEmpty.map((v) => String(v))).size
      const sample = nonEmpty.slice(0, 3).map((v) => String(v))
      return { name: h, isNumeric, missing, uniques, sample }
    })
  }, [data, headers])

  function onDragOver(e) {
    e.preventDefault()
    e.stopPropagation()
    setDropActive(true)
  }

  function onDragLeave(e) {
    e.preventDefault()
    e.stopPropagation()
    setDropActive(false)
  }

  async function onDrop(e) {
    e.preventDefault()
    e.stopPropagation()
    setDropActive(false)
    const file = e.dataTransfer?.files?.[0]
    if (!file) return
    const text = await file.text()
    setCsvText(text)
    parseCsv(text)
  }

  async function saveProject() {
    if (data.length === 0) return

    try {
      setSaving(true)
      setError(null)

      // Create project
      const projectData = {
        name: `CSV Analysis ${new Date().toLocaleDateString()}`,
        description: `Processed dataset with ${summary.rowCount} rows and ${summary.colCount} columns`,
        original_filename: "dataset.csv",
        file_size: new Blob([csvText]).size,
        columns_count: summary.colCount,
        rows_count: summary.rowCount,
      }

      const project = await ApiClient.createProject(projectData)
      console.log("[v0] Created project:", project.id)

      // Save original dataset
      await ApiClient.saveDataset(project.id, {
        type: "original",
        data: data.slice(0, 1000), // Limit for demo
        metadata: { headers, totalRows: data.length },
      })

      // Save analysis results
      await ApiClient.saveAnalysis(project.id, {
        quality_score: qualityScore / 100,
        issues_detected: { missing_values: summary.missing },
        column_analysis: columnStats,
        ai_insights: { status: "completed" },
      })

      // Update saved projects panel if visible
      if (showProjects) await refreshProjects()
      alert(`Project saved successfully! ID: ${project.id}`)
    } catch (err) {
      console.error("[v0] Save project error:", err)
      setError("Failed to save project: " + err.message)
    } finally {
      setSaving(false)
    }
  }

  // Helper to load a saved project and rehydrate UI
  async function loadProject(id) {
    try {
      setError(null)
      const res = await ApiClient.getProject(id)
      const project = res?.project || res // support both shapes
      // prefer most recent "original" dataset
      const datasets = project?.datasets || []
      const original = datasets.find((d) => d.type === "original") || (datasets.length ? datasets[0] : null)
      if (!original?.data || !Array.isArray(original.data) || original.data.length === 0) {
        throw new Error("No dataset rows stored for this project")
      }
      const hdrs = original.metadata?.headers || Object.keys(original.data[0] || {})
      setHeaders(hdrs)
      setData(original.data)
      setActiveTab("preview")
      setShowProjects(false)
    } catch (e) {
      console.error("[v0] loadProject error:", e)
      setError("Failed to load saved project. " + (e.message || ""))
    }
  }

  // Load sample dataset
  function loadSample(choice = sampleChoice) {
    const selected = SAMPLE_MAP[choice] || SAMPLE_MAP.pima
    setCsvText(selected.csv)
    parseCsv(selected.csv)
  }

  // Helper to download text files (used for pipeline export)
  function downloadText(name, content, mime = "text/plain;charset=utf-8") {
    try {
      const blob = new Blob([content], { type: mime })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = name
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error("[v0] downloadText error:", err)
      setError("Failed to download file.")
    }
  }

  // Generate human-readable explanation of preprocessing decisions
  function buildExplanation() {
    const lines = []
    lines.push(`AutoPrepAI Explanation`)
    lines.push(`======================`)
    lines.push(`Rows: ${summary.rowCount}, Columns: ${summary.colCount}, Missing cells: ${summary.missing}`)
    lines.push(`Estimated quality score: ${qualityScore}%`)
    lines.push("")
    lines.push(`Selected preprocessing actions:`)
    lines.push(`- Trim whitespace: ${trimWhitespace ? "Yes" : "No"}`)
    lines.push(`- Remove empty rows: ${removeEmptyRows ? "Yes" : "No"}`)
    lines.push(`- Impute numeric mean: ${imputeNumeric ? "Yes" : "No"}`)
    lines.push(`- Impute categorical mode: ${imputeCategorical ? "Yes" : "No"}`)
    lines.push("")
    const numCols = columnStats.filter((c) => c.isNumeric).map((c) => c.name)
    const catCols = columnStats.filter((c) => !c.isNumeric).map((c) => c.name)
    if (numCols.length) lines.push(`Numeric columns (${numCols.length}): ${numCols.join(", ")}`)
    if (catCols.length) lines.push(`Categorical columns (${catCols.length}): ${catCols.join(", ")}`)
    lines.push("")
    lines.push(`Rationale:`)
    if (trimWhitespace)
      lines.push(`- Trimming whitespace removes accidental spaces that can create duplicate categories.`)
    if (removeEmptyRows) lines.push(`- Removing fully empty rows reduces noise and improves training stability.`)
    if (imputeNumeric)
      lines.push(`- Numeric missing values are filled with the column mean for a simple, explainable baseline.`)
    if (imputeCategorical) lines.push(`- Categorical missing values are filled with the most frequent category (mode).`)
    if (!trimWhitespace && !removeEmptyRows && !imputeNumeric && !imputeCategorical) {
      lines.push(`- No automatic fixes selected; dataset retained as-is.`)
    }
    return lines.join("\n")
  }

  // Generate a Python/pandas pipeline snippet reflecting selected options
  function buildPythonPipeline() {
    const objCols = columnStats.filter((c) => !c.isNumeric).map((c) => JSON.stringify(c.name))
    const numCols = columnStats.filter((c) => c.isNumeric).map((c) => JSON.stringify(c.name))

    const py = []
    py.push(`# Auto-generated by AutoPrepAI`)
    py.push(`import pandas as pd`)
    py.push(``)
    py.push(`# 1) Read input`)
    py.push(`df = pd.read_csv("input.csv")`)
    py.push(``)
    if (trimWhitespace && objCols.length) {
      py.push(`# 2) Trim whitespace in categorical/text columns`)
      py.push(`for col in [${objCols.join(", ")}]:`)
      py.push(`    if col in df.columns:`)
      py.push(`        df[col] = df[col].astype(str).str.strip()`)
      py.push(``)
    }
    if (removeEmptyRows) {
      py.push(`# 3) Remove fully empty rows`)
      py.push(`df.dropna(how="all", inplace=True)`)
      py.push(``)
    }
    if (imputeNumeric && numCols.length) {
      py.push(`# 4) Impute numeric columns with mean`)
      py.push(`for col in [${numCols.join(", ")}]:`)
      py.push(`    if col in df.columns:`)
      py.push(`        df[col] = df[col].fillna(df[col].mean())`)
      py.push(``)
    }
    if (imputeCategorical && objCols.length) {
      py.push(`# 5) Impute categorical columns with mode`)
      py.push(`for col in [${objCols.join(", ")}]:`)
      py.push(`    if col in df.columns:`)
      py.push(`        mode = df[col].mode()`)
      py.push(`        if not mode.empty:`)
      py.push(`            df[col] = df[col].fillna(mode.iloc[0])`)
      py.push(``)
    }
    py.push(`# 6) Write output`)
    py.push(`df.to_csv("output.csv", index=False)`)
    return py.join("\n")
  }

  // Explainability handlers
  function onExplainClick() {
    const txt = buildExplanation()
    setExplainText(txt)
    setExplainOpen(true)
  }

  function onDownloadPipeline() {
    const code = buildPythonPipeline()
    downloadText("pipeline.py", code, "text/x-python;charset=utf-8")
  }

  // UI
  return (
    <main className="min-h-dvh bg-background text-foreground">
      {/* Hero/Header */}
      <header className="pt-10 pb-6">
        <div className="mx-auto max-w-6xl px-6 flex items-start justify-between">
          <div className="text-center md:text-left">
            <h1 className="text-4xl md:text-5xl font-semibold text-emerald-400 text-balance">AutoPrepAI</h1>
            <p className="mt-3 text-sm md:text-base text-emerald-200/80 text-pretty">
              Intelligent CSV preprocessing powered by AI. Upload your data and let our algorithms automatically clean,
              analyze, and prepare it for machine learning.
            </p>
          </div>
          <div className="mt-2 flex items-center gap-3">
            {/* Toggle saved projects panel */}
            <button
              onClick={() => setShowProjects((s) => !s)}
              className="rounded-md border border-emerald-700/40 bg-emerald-950/30 px-3 py-1.5 text-xs text-emerald-200 hover:bg-emerald-900/30 transition"
            >
              {showProjects ? "Hide Projects" : "View Projects"}
            </button>
            <ConnectionStatus />
          </div>
        </div>
      </header>

      {showProjects && (
        <div className="mx-auto max-w-6xl px-6 pb-4">
          <div className="rounded-md border border-emerald-700/40 bg-emerald-950/40 p-4">
            <div className="flex items-center justify-between">
              <div className="font-medium text-emerald-200">Saved Projects</div>
              <button
                onClick={() => refreshProjects()}
                className="text-xs rounded-md border border-emerald-700/40 px-2 py-1 text-emerald-300 hover:bg-emerald-900/30"
              >
                Refresh
              </button>
            </div>
            <div className="mt-3 divide-y divide-emerald-800/40">
              {savedProjects.length === 0 ? (
                <div className="text-sm text-emerald-300/80">No projects found yet.</div>
              ) : (
                savedProjects.slice(0, 10).map((p) => (
                  <div key={p.id} className="py-2 flex items-center justify-between">
                    <div className="text-sm">
                      <div className="text-emerald-100">{p.name || "Untitled Project"}</div>
                      <div className="text-emerald-300/70">
                        {p.rows_count ?? "—"} rows • {p.columns_count ?? "—"} columns
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => loadProject(p.id)}
                        className="text-xs rounded-md bg-emerald-600 text-white px-2 py-1 hover:bg-emerald-500"
                      >
                        Load
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Professional error alert */}
      {error && (
        <div className="mx-auto max-w-6xl px-6 pb-4">
          <div className="rounded-md border border-red-500/40 bg-red-900/20 text-red-200 p-3 text-sm">{error}</div>
        </div>
      )}

      {/* EMPTY STATE: Upload card */}
      {data.length === 0 ? (
        <section className="mx-auto max-w-3xl px-6 pb-12">
          <div className="rounded-xl border border-emerald-700/40 bg-emerald-950/30 p-6 md:p-8">
            <h2 className="font-medium mb-2 text-emerald-200">Upload Your CSV File</h2>
            <p className="text-sm text-muted-foreground mb-6">
              Drop your CSV file here or click to browse. We'll analyze and preprocess it automatically.
            </p>

            {/* Replace emoji with accessible SVG icon and add keyboard support */}
            <div
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault()
                  document.getElementById("csv-file-input")?.click()
                }
              }}
              className={[
                "rounded-lg border-2 border-dashed p-10 text-center transition focus:outline-none focus:ring-2 focus:ring-emerald-500/50",
                dropActive ? "border-emerald-500 bg-emerald-900/20" : "border-emerald-700/40 bg-emerald-900/10",
              ].join(" ")}
              aria-label="Drop your CSV here or press Enter to browse files"
            >
              <div className="mx-auto mb-4 inline-flex h-14 w-14 items-center justify-center rounded-lg bg-emerald-900/30 text-emerald-400">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M7 3h6l5 5v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  />
                  <path d="M13 3v5a1 1 0 0 0 1 1h5" stroke="currentColor" strokeWidth="1.5" />
                </svg>
              </div>
              <div className="text-lg text-emerald-200">Drop your CSV file here</div>
              <label className="mt-2 block text-emerald-300/80 cursor-pointer underline">
                or click to browse
                <input
                  id="csv-file-input"
                  type="file"
                  accept=".csv,text/csv"
                  onChange={handleFile}
                  className="hidden"
                />
              </label>
            </div>

            <div className="mt-6">
              <textarea
                value={csvText}
                onChange={handlePaste}
                placeholder="Or paste CSV here..."
                className="w-full h-28 rounded-md border bg-background p-3 text-sm"
              />
              <div className="mt-3 flex flex-wrap gap-2 items-center">
                <button
                  onClick={() => parseCsv(csvText)}
                  className="px-3 py-2 rounded-md bg-emerald-600 text-white text-sm hover:bg-emerald-500 transition"
                >
                  Parse CSV
                </button>
                <button
                  onClick={() => {
                    setCsvText("")
                    setError(null)
                  }}
                  className="px-3 py-2 rounded-md border text-sm hover:bg-emerald-900/20 transition"
                >
                  Clear
                </button>

                {/* Professional sample dataset picker */}
                <div className="ml-auto flex items-center gap-2">
                  <label className="text-xs text-emerald-300/80">Load sample</label>
                  <select
                    value={sampleChoice}
                    onChange={(e) => setSampleChoice(e.target.value)}
                    className="h-9 rounded-md border border-emerald-700/40 bg-emerald-950/40 px-2 text-sm text-emerald-200"
                  >
                    {Object.entries(SAMPLE_MAP).map(([key, meta]) => (
                      <option key={key} value={key}>
                        {meta.name}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => loadSample()}
                    className="px-3 py-2 rounded-md border border-emerald-600 text-emerald-200 text-sm hover:bg-emerald-900/20 transition"
                  >
                    Load Sample
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      ) : (
        /* DATA LOADED: Metrics, Tabs, Panels, Actions */
        <section className="mx-auto max-w-6xl px-6 pb-16">
          {/* Metric cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <MetricCard value={summary.rowCount} label="Rows" />
            <MetricCard value={summary.colCount} label="Columns" />
            <MetricCard value={summary.missing} label="Missing Values" danger={summary.missing > 0} />
            <MetricCard value={`${qualityScore}%`} label="Quality Score" />
          </div>

          {/* Accessible tabs with clearer affordances */}
          <div className="mt-6">
            <div
              role="tablist"
              aria-label="Data views"
              className="flex gap-2 rounded-md overflow-hidden border border-emerald-700/40 bg-emerald-950/30"
            >
              {[
                { id: "columns", label: "Column Analysis" },
                { id: "issues", label: "Data Issues" },
                { id: "preview", label: "Data Preview" },
                { id: "explain", label: "Explanation" },
              ].map((t) => {
                const selected = activeTab === t.id
                return (
                  <button
                    key={t.id}
                    role="tab"
                    aria-selected={selected}
                    aria-controls={`panel-${t.id}`}
                    onClick={() => setActiveTab(t.id)}
                    className={[
                      "flex-1 px-4 py-2 text-sm font-medium transition",
                      selected
                        ? "bg-emerald-700/30 text-emerald-200"
                        : "bg-transparent text-emerald-300/80 hover:bg-emerald-900/20",
                    ].join(" ")}
                  >
                    {t.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Panels */}
          <div className="mt-3 rounded-md border border-emerald-700/40 bg-emerald-950/40">
            {activeTab === "columns" && (
              <div id="panel-columns" role="tabpanel" className="p-3 md:p-4 space-y-3">
                <h3 className="font-medium text-sm px-1 text-emerald-200">Column Information</h3>
                <div className="space-y-3">
                  {columnStats.map((c) => (
                    <div
                      key={c.name}
                      className="rounded-md border border-emerald-700/40 bg-emerald-900/20 p-3 flex items-start justify-between"
                    >
                      <div>
                        <div className="font-medium text-emerald-100">{c.name}</div>
                        <div className="text-xs text-emerald-300/80 mt-1">
                          Type: {c.isNumeric ? "numeric" : "categorical"} • Missing: {c.missing} • Unique: {c.uniques}
                        </div>
                        {c.sample.length > 0 && (
                          <div className="text-xs text-muted-foreground mt-1">Sample: {c.sample.join(", ")}</div>
                        )}
                      </div>
                      <span className="text-[11px] rounded bg-emerald-700/30 text-emerald-200 px-2 py-1 self-center">
                        {c.isNumeric ? "numeric" : "text"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === "issues" && (
              <div id="panel-issues" role="tabpanel" className="p-4">
                {summary.missing > 0 ? (
                  <div className="rounded-md border border-emerald-700/40 bg-emerald-900/20 p-4">
                    <div className="font-medium mb-1 text-emerald-200">Detected Issues</div>
                    <ul className="text-sm list-disc pl-5 text-emerald-200/90">
                      <li>
                        Missing values detected: <span className="text-emerald-100">{summary.missing}</span>. Use the
                        preprocessing options below to impute them.
                      </li>
                    </ul>
                  </div>
                ) : (
                  <div className="rounded-md border border-emerald-700/40 bg-emerald-900/20 p-4">
                    <div className="font-medium text-emerald-200">Good Data Quality</div>
                    <p className="text-sm text-muted-foreground">Your data has high quality with minimal issues.</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === "preview" && (
              <div id="panel-preview" role="tabpanel" className="p-3 md:p-4 overflow-x-auto">
                <div className="text-sm font-medium mb-2 text-emerald-200">Data Preview</div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left">
                      {headers.map((h) => (
                        <th key={h} className="py-2 pr-4 font-semibold text-emerald-300/90">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.slice(0, 15).map((row, idx) => (
                      <tr key={idx} className="border-t border-emerald-800/40">
                        {headers.map((h) => (
                          <td key={h} className="py-2 pr-4">
                            {String(row[h] ?? "")}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === "explain" && (
              <div id="panel-explain" role="tabpanel" className="p-3 md:p-4">
                <div className="text-sm font-medium mb-2 text-emerald-200">Explanation</div>
                <pre className="bg-background rounded-md p-4 text-sm text-emerald-200/90 overflow-x-auto">
                  {explainText}
                </pre>
              </div>
            )}
          </div>

          {/* Action: Save Project */}
          <div className="mt-6 rounded-md border border-emerald-700/40 bg-emerald-950/40">
            <div className="p-4">
              <div className="font-medium text-emerald-200">Save Project</div>
              <p className="text-sm text-muted-foreground">Save your analysis and data for future access</p>
            </div>
            <div className="px-4 pb-4 space-y-2">
              <button
                onClick={saveProject}
                disabled={saving || data.length === 0}
                className="w-full h-10 rounded-md bg-emerald-600 text-white text-sm hover:bg-emerald-500 transition disabled:opacity-60"
              >
                {saving ? "Saving..." : "Save Project to Database"}
              </button>
              <button
                onClick={() => downloadCsv(data, "processed.csv")}
                className="w-full h-10 rounded-md border border-emerald-600 text-emerald-200 text-sm hover:bg-emerald-900/20 transition"
              >
                Download Processed CSV
              </button>
              <button
                onClick={onDownloadPipeline}
                className="w-full h-10 rounded-md border border-emerald-600 text-emerald-200 text-sm hover:bg-emerald-900/20 transition"
              >
                Download Python Pipeline
              </button>
            </div>
          </div>

          <div className="mt-4 rounded-md border border-emerald-700/40 bg-emerald-950/40">
            <div className="p-4">
              <div className="font-medium text-emerald-200">Explainability & Export</div>
              <p className="text-sm text-muted-foreground">
                Generate a human-readable explanation of your pipeline or export a ready-to-run Python script.
              </p>
            </div>
            <div className="px-4 pb-4 grid gap-2 md:grid-cols-2">
              <button
                onClick={onExplainClick}
                className="h-10 rounded-md border border-emerald-600 text-emerald-200 text-sm hover:bg-emerald-900/20 transition"
              >
                Explain My Pipeline
              </button>
              <button
                onClick={onDownloadPipeline}
                className="h-10 rounded-md bg-emerald-600 text-white text-sm hover:bg-emerald-500 transition"
              >
                Download Python Pipeline
              </button>
            </div>

            {explainOpen && (
              <div className="px-4 pb-4">
                <div className="rounded-md border border-emerald-700/40 bg-emerald-900/20 p-3">
                  <div className="flex items-center justify-between">
                    <div className="font-medium text-emerald-200 text-sm">Pipeline Explanation</div>
                    <button
                      onClick={() => setExplainOpen(false)}
                      className="text-xs rounded-md border border-emerald-700/40 px-2 py-1 text-emerald-300 hover:bg-emerald-900/30"
                    >
                      Close
                    </button>
                  </div>
                  <pre className="mt-2 whitespace-pre-wrap text-[12px] leading-relaxed text-emerald-100">
                    {explainText}
                  </pre>
                </div>
              </div>
            )}
          </div>

          {/* Preprocessing Actions */}
          <div className="mt-4 rounded-md border border-emerald-700/40 bg-emerald-950/40">
            <div className="p-4">
              <div className="font-medium text-emerald-200">Preprocessing Actions</div>
              <p className="text-sm text-muted-foreground">
                Apply intelligent preprocessing to clean and prepare your data
              </p>
            </div>

            {/* Options */}
            <div className="px-4 pb-3">
              <div className="grid gap-2 md:grid-cols-2">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={trimWhitespace}
                    onChange={(e) => setTrimWhitespace(e.target.checked)}
                  />
                  Trim whitespace
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={removeEmptyRows}
                    onChange={(e) => setRemoveEmptyRows(e.target.checked)}
                  />
                  Remove empty rows
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={imputeNumeric} onChange={(e) => setImputeNumeric(e.target.checked)} />
                  Impute numeric mean
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={imputeCategorical}
                    onChange={(e) => setImputeCategorical(e.target.checked)}
                  />
                  Impute categorical mode
                </label>
              </div>
            </div>

            <div className="px-4 pb-4">
              <button
                onClick={applyFixes}
                disabled={processing}
                className="w-full h-10 rounded-md bg-emerald-600 text-white text-sm hover:bg-emerald-500 transition disabled:opacity-60"
              >
                {processing ? "Processing..." : "Start Preprocessing"}
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Explainability Modal */}
      {explainOpen && (
        <div className="fixed inset-0 bg-background/80 flex items-center justify-center">
          <div className="bg-background rounded-lg p-6 max-w-3xl w-full">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-medium text-emerald-200">Explanation</h2>
              <button
                onClick={() => setExplainOpen(false)}
                className="text-sm rounded-md bg-emerald-600 text-white px-2 py-1 hover:bg-emerald-500"
              >
                Close
              </button>
            </div>
            <pre className="bg-background rounded-md p-4 text-sm text-emerald-200/90 overflow-x-auto">
              {explainText}
            </pre>
          </div>
        </div>
      )}
    </main>
  )
}
