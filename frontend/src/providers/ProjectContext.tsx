'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/api/generated/main-service'
import { ProjectDto, CreateProjectRequest, UpdateProjectRequest } from '@/api/generated/main-service/apiGenerated'
import { useAuth } from './AuthContext'

interface ProjectContextType {
  projects: ProjectDto[]
  currentProject: ProjectDto | null
  isLoading: boolean
  setCurrentProject: (project: ProjectDto | null) => void
  fetchProjects: () => Promise<void>
  createProject: (data: CreateProjectRequest) => Promise<ProjectDto | undefined>
  updateProject: (id: string, data: UpdateProjectRequest) => Promise<void>
  deleteProject: (id: string) => Promise<void>
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined)

export const ProjectProvider = ({ children }: { children: ReactNode }) => {
  const router = useRouter()
  const { isAuthenticated } = useAuth()
  const [projects, setProjects] = useState<ProjectDto[]>([])
  const [currentProject, setCurrentProject] = useState<ProjectDto | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const fetchProjects = useCallback(async () => {
    if (!isAuthenticated) return
    setIsLoading(true)
    try {
      const data = await api.projects.projectsList()
      setProjects(data)

      // Use a functional state update or just rely on the fresh 'data' variable
      // to avoid dependency on 'currentProject' state in this callback
      if (data.length > 0) {
        let nextProject: ProjectDto | undefined

        // Try to find the stored project in the new list
        const storedProjId = localStorage.getItem('currentProjectId')
        if (storedProjId) {
          nextProject = data.find((p: ProjectDto) => p.id === storedProjId)
        }

        // If not found (or no stored ID), default to the first one
        if (!nextProject) {
          nextProject = data[0]
        }

        // Only update if we actually have a project to set
        // (and maybe check if it's different, but setting it again is usually fine/safer)
        setCurrentProject(nextProject)
        if (nextProject.id) localStorage.setItem('currentProjectId', nextProject.id)
      } else {
        setCurrentProject(null)
      }
    } catch (error) {
      console.error('Failed to fetch projects', error)
      setProjects([])
    } finally {
      setIsLoading(false)
    }
  }, [isAuthenticated]) // Removed currentProject dependency

  useEffect(() => {
    if (isAuthenticated) {
      fetchProjects()
    } else {
      setProjects([])
      setCurrentProject(null)
      localStorage.removeItem('currentProjectId')
    }
  }, [isAuthenticated, fetchProjects])

  const handleSetCurrentProject = (project: ProjectDto | null) => {
    setCurrentProject(project)
    if (project && project.id) {
      localStorage.setItem('currentProjectId', project.id)
    } else {
      localStorage.removeItem('currentProjectId')
    }
  }

  const createProject = async (data: CreateProjectRequest): Promise<ProjectDto | undefined> => {
    try {
      const projectId = await api.projects.projectsCreate(data)
      const response = await api.projects.projectsList()
      setProjects(response)

      const sorted = [...response].sort((a, b) => {
        return new Date(b.createdDatetime || 0).getTime() - new Date(a.createdDatetime || 0).getTime()
      })

      const created = sorted[0]
      if (created) {
        handleSetCurrentProject(created)
      }
      return created
    } catch (error) {
      console.error('Failed to create project', error)
      throw error
    }
  }

  const updateProject = async (id: string, data: UpdateProjectRequest) => {
    try {
      setProjects(prev => prev.map(p => (p.id === id ? { ...p, ...data } : p)))
      if (currentProject?.id === id) {
        setCurrentProject(prev => (prev ? { ...prev, ...data } : null))
      }

      await api.projects.projectsUpdate(id, data)
      await fetchProjects()
    } catch (error) {
      console.error('Failed to update project', error)
      // Revert/Refresh on error
      await fetchProjects()
      throw error
    }
  }

  const deleteProject = async (id: string) => {
    try {
      setProjects(prev => prev.filter(p => p.id !== id))
      if (currentProject?.id === id) {
        setCurrentProject(null)
        localStorage.removeItem('currentProjectId')
      }

      await api.projects.projectsDelete(id)
      await fetchProjects()
    } catch (error) {
      console.error('Failed to delete project', error)
      await fetchProjects()
      throw error
    }
  }

  return (
    <ProjectContext.Provider
      value={{
        projects,
        currentProject,
        isLoading,
        setCurrentProject: handleSetCurrentProject,
        fetchProjects,
        createProject,
        updateProject,
        deleteProject
      }}>
      {children}
    </ProjectContext.Provider>
  )
}

export const useProject = () => {
  const context = useContext(ProjectContext)
  if (context === undefined) {
    throw new Error('useProject must be used within a ProjectProvider')
  }
  return context
}
