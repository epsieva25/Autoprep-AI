"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Brain,
  Plus,
  FileText,
  MoreVertical,
  Edit,
  Trash2,
  Download,
  UserIcon,
  LogOut,
  Search,
  Filter,
  Eye,
  AlertTriangle,
} from "lucide-react"
import { ApiClient } from "@/lib/api-client"
import { signOut } from "@/lib/actions"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { handleApiError, showErrorToast } from "@/lib/error-handler"
import LoadingSpinner from "@/components/loading-spinner"

// Interfaces removed for JSX compatibility

export default function DashboardClient({ user }) {
  const [projects, setProjects] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [editingProject, setEditingProject] = useState(null)
  const [editName, setEditName] = useState("")
  const [editDescription, setEditDescription] = useState("")
  const [isUpdating, setIsUpdating] = useState(false)
  const [isDeleting, setIsDeleting] = useState(null)
  const [error, setError] = useState(null)

  const router = useRouter()

  useEffect(() => {
    loadProjects()
  }, [])

  const loadProjects = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const { projects } = await ApiClient.getProjects()
      setProjects(projects || [])
    } catch (error) {
      const errorMessage = handleApiError(error)
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const handleEditProject = (project) => {
    setEditingProject(project)
    setEditName(project.name)
    setEditDescription(project.description || "")
    setShowEditDialog(true)
  }

  const handleUpdateProject = async () => {
    if (!editingProject || !editName.trim()) return

    setIsUpdating(true)
    try {
      const { project } = await ApiClient.updateProject(editingProject.id, {
        name: editName.trim(),
        description: editDescription.trim() || undefined,
      })

      setProjects(projects.map((p) => (p.id === project.id ? project : p)))
      setShowEditDialog(false)
      setEditingProject(null)
      setEditName("")
      setEditDescription("")
    } catch (error) {
      showErrorToast(error)
    } finally {
      setIsUpdating(false)
    }
  }

  const handleDeleteProject = async (projectId) => {
    if (!confirm("Are you sure you want to delete this project? This action cannot be undone.")) {
      return
    }

    setIsDeleting(projectId)
    try {
      await ApiClient.deleteProject(projectId)
      setProjects(projects.filter((p) => p.id !== projectId))
    } catch (error) {
      showErrorToast(error)
    } finally {
      setIsDeleting(null)
    }
  }

  const handleViewProject = (projectId) => {
    router.push(`/dashboard/projects/${projectId}`)
  }

  const filteredProjects = projects.filter((project) => {
    const matchesSearch =
      project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.original_filename.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = statusFilter === "all" || project.status === statusFilter

    return matchesSearch && matchesStatus
  })

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

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
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

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Error Display */}
        {error && (
          <div className="mb-6">
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                <p className="text-red-800 font-medium">Error</p>
              </div>
              <p className="text-red-700 mt-1">{error}</p>
              <Button variant="outline" size="sm" onClick={() => setError(null)} className="mt-2">
                Dismiss
              </Button>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Brain className="h-8 w-8 text-primary" />
              <h1 className="text-3xl font-bold text-primary">AutoPrepAI Dashboard</h1>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="flex items-center space-x-2 bg-transparent">
                  <UserIcon className="h-4 w-4" />
                  <span>{user.email}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <form action={signOut}>
                  <DropdownMenuItem asChild>
                    <button type="submit" className="w-full flex items-center space-x-2">
                      <LogOut className="h-4 w-4" />
                      <span>Sign Out</span>
                    </button>
                  </DropdownMenuItem>
                </form>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Actions Bar */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search projects..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="flex items-center space-x-2 bg-transparent">
                  <Filter className="h-4 w-4" />
                  <span>Filter: {statusFilter === "all" ? "All" : statusFilter}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => setStatusFilter("all")}>All</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter("created")}>Created</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter("analyzing")}>Analyzing</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter("processed")}>Processed</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter("error")}>Error</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Link href="/">
              <Button className="flex items-center space-x-2">
                <Plus className="h-4 w-4" />
                <span>New Project</span>
              </Button>
            </Link>
          </div>
        </div>

        {/* Projects Grid */}
        {isLoading ? (
          <LoadingSpinner message="Loading your projects..." />
        ) : filteredProjects.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                {projects.length === 0 ? "No projects yet" : "No projects match your search"}
              </h3>
              <p className="text-muted-foreground mb-4">
                {projects.length === 0
                  ? "Create your first project by uploading a CSV file"
                  : "Try adjusting your search or filter criteria"}
              </p>
              {projects.length === 0 && (
                <Link href="/">
                  <Button>Create Your First Project</Button>
                </Link>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProjects.map((project) => (
              <Card key={project.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg truncate">{project.name}</CardTitle>
                      <CardDescription className="mt-1">{project.description || "No description"}</CardDescription>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleViewProject(project.id)}>
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleEditProject(project)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDeleteProject(project.id)}
                          className="text-red-600"
                          disabled={isDeleting === project.id}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          {isDeleting === project.id ? "Deleting..." : "Delete"}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>

                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Badge className={getStatusColor(project.status)}>{project.status}</Badge>
                    <span className="text-sm text-muted-foreground">{formatDate(project.created_at)}</span>
                  </div>

                  <div className="space-y-2 text-sm text-foreground">
                    <div className="flex items-center space-x-2">
                      <FileText className="h-4 w-4" />
                      <span className="truncate">{project.original_filename}</span>
                    </div>

                    <div className="flex justify-between">
                      <span>{project.rows_count || 0} rows</span>
                      <span>{project.columns_count || 0} columns</span>
                      <span>{formatFileSize(project.file_size)}</span>
                    </div>
                  </div>

                  <div className="flex space-x-2 pt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleViewProject(project.id)}
                      className="flex-1"
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        // TODO: Implement download functionality
                        alert("Download functionality coming soon!")
                      }}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Edit Project Dialog */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Project</DialogTitle>
              <DialogDescription>Update your project name and description.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-name">Project Name</Label>
                <Input
                  id="edit-name"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Enter project name"
                />
              </div>
              <div>
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="Describe your project"
                  rows={3}
                />
              </div>
              <div className="flex space-x-2">
                <Button onClick={handleUpdateProject} disabled={!editName.trim() || isUpdating} className="flex-1">
                  {isUpdating ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Updating...
                    </>
                  ) : (
                    "Update Project"
                  )}
                </Button>
                <Button variant="outline" onClick={() => setShowEditDialog(false)} disabled={isUpdating}>
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
