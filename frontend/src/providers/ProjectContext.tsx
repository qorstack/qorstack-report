'use client'

import React, { createContext, useContext, useState, useEffect, useRef, ReactNode, useCallback, useMemo } from 'react'
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

const toMs = (v: string | number | Date | null | undefined): number => {
  if (!v) return 0
  const t = new Date(v).getTime()
  return Number.isNaN(t) ? 0 : t
}

const sortOldestFirst = (list: ProjectDto[]) =>
  [...list].sort((a, b) => toMs(a.createdDatetime) - toMs(b.createdDatetime))

export const ProjectProvider = ({ children }: { children: ReactNode }) => {
  const { isAuthenticated } = useAuth()
  const [projects, setProjects] = useState<ProjectDto[]>([])
  const [currentProject, setCurrentProject] = useState<ProjectDto | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Track whether the initial fetch after login has been done
  const hasInitialized = useRef(false)
  // Ref so fetchProjects can read latest currentProject without adding it as a dependency
  const currentProjectRef = useRef<ProjectDto | null>(null)
  useEffect(() => {
    currentProjectRef.current = currentProject
  }, [currentProject])

  const fetchProjects = useCallback(async () => {
    if (!isAuthenticated) return
    setIsLoading(true)
    try {
      const data = await api.projects.projectsList()
      const sorted = sortOldestFirst(data)
      setProjects(sorted)

      if (sorted.length > 0) {
        const isFirstFetch = !hasInitialized.current
        hasInitialized.current = true
        const current = currentProjectRef.current
        const nextProject: ProjectDto = isFirstFetch
          ? sorted[0]
          : (current ? sorted.find(p => p.id === current.id) : null) ?? sorted[0]
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
  }, [isAuthenticated])

  useEffect(() => {
    if (isAuthenticated) {
      fetchProjects()
    } else {
      setProjects([])
      setCurrentProject(null)
      hasInitialized.current = false
      localStorage.removeItem('currentProjectId')
    }
  }, [isAuthenticated, fetchProjects])

  const handleSetCurrentProject = (project: ProjectDto | null) => {
    setCurrentProject(project)
    if (project?.id) {
      localStorage.setItem('currentProjectId', project.id)
    } else {
      localStorage.removeItem('currentProjectId')
    }
  }

  const createProject = async (data: CreateProjectRequest): Promise<ProjectDto | undefined> => {
    try {
      await api.projects.projectsCreate(data)
      const response = await api.projects.projectsList()
      const sorted = sortOldestFirst(response)
      setProjects(sorted)

      // Newly created = most recent by date
      const created = [...response].sort(
        (a, b) => new Date(b.createdDatetime || 0).getTime() - new Date(a.createdDatetime || 0).getTime()
      )[0]
      if (created) handleSetCurrentProject(created)
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

  const contextValue = useMemo(
    () => ({
      projects,
      currentProject,
      isLoading,
      setCurrentProject: handleSetCurrentProject,
      fetchProjects,
      createProject,
      updateProject,
      deleteProject
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [projects, currentProject, isLoading, fetchProjects]
  )

  return (
    <ProjectContext.Provider value={contextValue}>
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
