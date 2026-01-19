"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowLeft, Download, FileText, BarChart3, Calendar, Database, Brain } from "lucide-react"
import { ApiClient } from "@/lib/api-client"
import Link from "next/link"

// Interfaces removed for JSX compatibility

export default function ProjectDetailsClient({ projectId, user }) {
  const [project, setProject] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadProject()
  }, [projectId])

  const loadProject = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const { project } = await ApiClient.getProject(projectId)
      setProject(project)
    } catch (error) {
      console.error("Error loading project:", error)
      setError("Failed to load project details")
    } finally {
      setIsLoading(false)
    }
  }

  const downloadDataset = (dataset, filename) => {
    if (!dataset.data) return

    const csv = dataset.data.map((row) => row.join(",")).join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const formatFileSize = (bytes) => {
    if (!bytes) return "Unknown"
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + " " + sizes[i]
  }

  const getStatusColor = (status) => {
    switch (status) {
      case "created":
        return "bg-blue-100 text-blue-800"
      case "analyzing":
        return "bg-yellow-100 text-yellow-800"
      case "processed":
        return "bg-green-100 text-green-800"
      case "error":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto mb-4"></div>
          <p className="text-emerald-700">Loading project details...</p>
        </div>
      </div>
    )
  }

  if (error || !project) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="text-center py-8">
            <p className="text-red-600 mb-4">{error || "Project not found"}</p>
            <Link href="/dashboard">
              <Button>Back to Dashboard</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  const originalDataset = project.datasets?.find((d) => d.type === "original")
  const processedDataset = project.datasets?.find((d) => d.type === "processed")
  const latestAnalysis = project.analysis_results?.[0]
  const latestProcessing = project.processing_history?.[0]

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center space-x-4 mb-8">
          <Link href="/dashboard">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
          <div className="flex items-center space-x-2">
            <Brain className="h-6 w-6 text-emerald-600" />
            <h1 className="text-2xl font-bold text-primary">{project.name}</h1>
          </div>
          <Badge className={getStatusColor(project.status)}>{project.status}</Badge>
        </div>

        {/* Project Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <FileText className="h-8 w-8 text-primary mx-auto mb-2" />
                <p className="text-2xl font-bold text-foreground">{project.rows_count || 0}</p>
                <p className="text-sm text-muted-foreground">Rows</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <Database className="h-8 w-8 text-primary mx-auto mb-2" />
                <p className="text-2xl font-bold text-foreground">{project.columns_count || 0}</p>
                <p className="text-sm text-muted-foreground">Columns</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <BarChart3 className="h-8 w-8 text-primary mx-auto mb-2" />
                <p className="text-2xl font-bold text-foreground">{formatFileSize(project.file_size)}</p>
                <p className="text-sm text-muted-foreground">File Size</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <Calendar className="h-8 w-8 text-primary mx-auto mb-2" />
                <p className="text-2xl font-bold text-foreground">
                  {Math.ceil((Date.now() - new Date(project.created_at).getTime()) / (1000 * 60 * 60 * 24))}
                </p>
                <p className="text-sm text-muted-foreground">Days Ago</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Information */}
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="analysis">Analysis</TabsTrigger>
            <TabsTrigger value="datasets">Datasets</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Project Information</CardTitle>
                <Button 
                  onClick={async () => {
                    try {
                      setIsLoading(true);
                      const res = await fetch(`/api/projects/${projectId}/analysis/audit`, { 
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' }
                      });
                      const data = await res.json();
                      if (data.audit_count > 0) {
                         alert(`AI Audit Found ${data.audit_count} anomalies! Check the Analysis tab.`);
                         loadProject(); // Reload to show new analysis
                      } else {
                         alert("AI Audit passed. No statistical anomalies found.");
                      }
                    } catch (e) {
                      alert("Audit failed: " + e.message);
                    } finally {
                      setIsLoading(false);
                    }
                  }}
                  variant="destructive"
                >
                  <Brain className="mr-2 h-4 w-4" />
                  Run AI Audit
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium text-primary mb-2">Description</h4>
                  <p className="text-muted-foreground">{project.description || "No description provided"}</p>
                </div>

                <div>
                  <h4 className="font-medium text-primary mb-2">Original File</h4>
                  <p className="text-muted-foreground">{project.original_filename}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium text-primary mb-2">Created</h4>
                    <p className="text-muted-foreground">{formatDate(project.created_at)}</p>
                  </div>
                  <div>
                    <h4 className="font-medium text-primary mb-2">Last Updated</h4>
                    <p className="text-muted-foreground">{formatDate(project.updated_at)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analysis">
            <Card>
              <CardHeader>
                <CardTitle>Analysis Results</CardTitle>
              </CardHeader>
              <CardContent>
                {latestAnalysis ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="text-center p-4 bg-secondary rounded-lg">
                        <p className="text-2xl font-bold text-foreground">
                          {Math.round((latestAnalysis.quality_score || 0) * 100)}%
                        </p>
                        <p className="text-sm text-muted-foreground">Quality Score</p>
                      </div>
                      <div className="text-center p-4 bg-orange-50 rounded-lg">
                        <p className="text-2xl font-bold text-orange-900">
                          {latestAnalysis.issues_detected?.missingValues || 0}
                        </p>
                        <p className="text-sm text-orange-600">Missing Values</p>
                      </div>
                      <div className="text-center p-4 bg-yellow-50 rounded-lg">
                        <p className="text-2xl font-bold text-yellow-900">
                          {latestAnalysis.issues_detected?.duplicateRows || 0}
                        </p>
                        <p className="text-sm text-yellow-600">Duplicate Rows</p>
                      </div>
                    </div>

                    {latestAnalysis.ai_insights?.recommendations && (
                      <div>
                        <h4 className="font-medium text-primary mb-2">AI Recommendations</h4>
                        <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                          {latestAnalysis.ai_insights.recommendations.map((rec, index) => (
                            <li key={index}>{rec}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-gray-500">No analysis results available</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="datasets">
            <div className="space-y-4">
              {originalDataset && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>Original Dataset</span>
                      <Button
                        size="sm"
                        onClick={() => downloadDataset(originalDataset, `${project.name}-original.csv`)}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">Uploaded: {formatDate(originalDataset.created_at)}</p>
                  </CardContent>
                </Card>
              )}

              {processedDataset && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>Processed Dataset</span>
                      <Button
                        size="sm"
                        onClick={() => downloadDataset(processedDataset, `${project.name}-processed.csv`)}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">Processed: {formatDate(processedDataset.created_at)}</p>
                    {processedDataset.metadata?.transformations && (
                      <div className="mt-2">
                        <p className="text-sm font-medium text-primary">Applied Transformations:</p>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {processedDataset.metadata.transformations.map((transform, index) => (
                            <Badge key={index} variant="secondary">
                              {transform}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {!originalDataset && !processedDataset && (
                <Card>
                  <CardContent className="text-center py-8">
                    <p className="text-gray-500">No datasets available</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="history">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Processing History</CardTitle>
                {latestProcessing && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      try {
                        const res = await fetch(`/api/projects/${projectId}/pipeline/download`);
                        if (!res.ok) throw new Error("Failed to generate pipeline");
                        const blob = await res.blob();
                        const url = window.URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = "pipeline.py";
                        document.body.appendChild(a);
                        a.click();
                        a.remove();
                      } catch (e) {
                         alert("Error: " + e.message);
                      }
                    }}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Download Python Pipeline
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                {latestProcessing ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <h4 className="font-medium text-primary mb-2">Before Processing</h4>
                        <ul className="text-sm text-muted-foreground space-y-1">
                          <li>Rows: {latestProcessing.before_stats?.rows || 0}</li>
                          <li>Missing Values: {latestProcessing.before_stats?.missing_values || 0}</li>
                          <li>Duplicates: {latestProcessing.before_stats?.duplicates || 0}</li>
                        </ul>
                      </div>
                      <div>
                        <h4 className="font-medium text-primary mb-2">After Processing</h4>
                        <ul className="text-sm text-muted-foreground space-y-1">
                          <li>Rows: {latestProcessing.after_stats?.rows || 0}</li>
                          <li>Missing Values: {latestProcessing.after_stats?.missing_values || 0}</li>
                          <li>Duplicates: {latestProcessing.after_stats?.duplicates || 0}</li>
                        </ul>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium text-primary mb-2">Transformations Applied</h4>
                      <div className="space-y-2">
                        {Object.entries(latestProcessing.transformations || {}).map(([key, value]) => (
                          <div key={key} className="p-3 bg-secondary rounded-lg">
                            <p className="font-medium text-sm">{key.replace(/_/g, " ").toUpperCase()}</p>
                            <p className="text-xs text-muted-foreground mt-1">{JSON.stringify(value, null, 2)}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-500">No processing history available</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
