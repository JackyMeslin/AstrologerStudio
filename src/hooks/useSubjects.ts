'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { fetchRandomSubjects, deleteSubject, updateSubject, createSubject, importSubjects } from '@/lib/api/subjects'
import type {
  Subject,
  UpdateSubjectFormInput,
  UpdateSubjectInput,
  CreateSubjectFormInput,
  CreateSubjectInput,
} from '@/types/subjects'
import { updateSubjectSchema, createSubjectSchema } from '@/lib/validation/subject'
import { queryKeys } from '@/lib/query-keys'
import { getErrorMessage } from '@/lib/utils/error'
import { STALE_TIME } from '@/lib/config/query'

export function useSubjects() {
  const queryClient = useQueryClient()
  const subjectsQueryKey = queryKeys.subjects.list()

  // Data fetching
  const query = useQuery({
    queryKey: subjectsQueryKey,
    queryFn: ({ signal }) => fetchRandomSubjects(50, signal),
    staleTime: STALE_TIME.SHORT, // 1 minute
    retry: 2,
  })

  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [subjectToDelete, setSubjectToDelete] = useState<Subject | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  // Edit dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [subjectToEdit, setSubjectToEdit] = useState<Subject | null>(null)
  const [editError, setEditError] = useState<string | null>(null)

  // Edit form - uses input type for form fields, output type for validated data
  const editForm = useForm<UpdateSubjectFormInput, unknown, UpdateSubjectInput>({
    defaultValues: {
      id: '',
      name: '',
      city: '',
      nation: '',
      birthDate: '',
      birthTime: '',
      latitude: undefined,
      longitude: undefined,
      timezone: 'UTC',
      rodens_rating: null,
      tags: null,
    },
    mode: 'onSubmit',
    resolver: zodResolver(updateSubjectSchema),
  })

  // Create dialog state
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  // Create form - uses input type for form fields, output type for validated data
  const createForm = useForm<CreateSubjectFormInput, unknown, CreateSubjectInput>({
    defaultValues: {
      name: '',
      city: '',
      nation: '',
      birthDate: '',
      birthTime: '',
      latitude: undefined,
      longitude: undefined,
      timezone: 'UTC',
      rodens_rating: null,
      tags: null,
    },
    mode: 'onSubmit',
    resolver: zodResolver(createSubjectSchema),
  })

  // Delete mutation with optimistic update and rollback
  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteSubject(id),
    onMutate: async (id: string) => {
      // Cancel any outgoing refetches to avoid overwriting optimistic update
      await queryClient.cancelQueries({ queryKey: subjectsQueryKey })

      // Snapshot the previous value
      const previousSubjects = queryClient.getQueryData<Subject[]>(subjectsQueryKey)

      // Optimistically update cache by removing the subject
      queryClient.setQueryData<Subject[]>(subjectsQueryKey, (old) => {
        if (!old) return old
        return old.filter((u) => u.id !== id)
      })

      // Return context with previous value for rollback
      return { previousSubjects }
    },
    onSuccess: () => {
      setDeleteDialogOpen(false)
      setSubjectToDelete(null)
    },
    onError: (err: unknown, _id: string, context) => {
      // Rollback to previous value on error
      if (context?.previousSubjects) {
        queryClient.setQueryData<Subject[]>(subjectsQueryKey, context.previousSubjects)
      }
      setDeleteError(getErrorMessage(err))
    },
  })

  // Update mutation with optimistic update and rollback
  const updateMutation = useMutation({
    mutationFn: (data: UpdateSubjectInput) => updateSubject(data),
    onMutate: async (data: UpdateSubjectInput) => {
      // Cancel any outgoing refetches to avoid overwriting optimistic update
      await queryClient.cancelQueries({ queryKey: subjectsQueryKey })

      // Snapshot the previous value
      const previousSubjects = queryClient.getQueryData<Subject[]>(subjectsQueryKey)

      // Optimistically update cache with the new values
      queryClient.setQueryData<Subject[]>(subjectsQueryKey, (old) => {
        if (!old) return old
        return old.map((u) => {
          if (u.id !== data.id) return u
          // Merge the update data with existing subject
          // Convert form input to subject format for optimistic update
          const birthDatetime =
            data.birthDate && data.birthTime
              ? new Date(`${data.birthDate.split('T')[0]}T${data.birthTime}Z`).toISOString()
              : u.birth_datetime
          return {
            ...u,
            name: data.name ?? u.name,
            city: data.city ?? u.city,
            nation: data.nation ?? u.nation,
            birth_datetime: birthDatetime,
            latitude: data.latitude ?? u.latitude,
            longitude: data.longitude ?? u.longitude,
            timezone: data.timezone ?? u.timezone,
            rodens_rating: data.rodens_rating !== undefined ? data.rodens_rating : u.rodens_rating,
            tags: data.tags !== undefined ? data.tags : u.tags,
          }
        })
      })

      // Return context with previous value for rollback
      return { previousSubjects }
    },
    onSuccess: () => {
      setEditDialogOpen(false)
      setSubjectToEdit(null)
    },
    onError: (err: unknown, _data: UpdateSubjectInput, context) => {
      // Rollback to previous value on error
      if (context?.previousSubjects) {
        queryClient.setQueryData<Subject[]>(subjectsQueryKey, context.previousSubjects)
      }
      setEditError(getErrorMessage(err))
    },
  })

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data: CreateSubjectInput) => createSubject(data),
    onSuccess: (created) => {
      queryClient.setQueryData<Subject[]>(subjectsQueryKey, (old) => {
        if (!old) return [created]
        return [created, ...old]
      })
      setCreateDialogOpen(false)
      createForm.reset()
    },
    onError: (err: unknown) => {
      setCreateError(getErrorMessage(err))
    },
  })

  const importMutation = useMutation({
    mutationFn: (data: CreateSubjectInput[]) => importSubjects(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subjects'] })
    },
  })

  // Action handlers
  const openDeleteDialog = (subject: Subject) => {
    setSubjectToDelete(subject)
    setDeleteError(null)
    setDeleteDialogOpen(true)
  }

  const openEditDialog = (subject: Subject) => {
    setSubjectToEdit(subject)
    setEditError(null)
    editForm.reset({
      id: subject.id,
      name: subject.name,
      city: subject.city || '',
      nation: subject.nation || '',
      birthDate: subject.birth_datetime ? new Date(subject.birth_datetime).toISOString() : '',
      birthTime: (() => {
        const d = new Date(subject.birth_datetime)
        if (isNaN(d.getTime())) return ''
        const hh = String(d.getUTCHours()).padStart(2, '0')
        const mm = String(d.getUTCMinutes()).padStart(2, '0')
        const ss = String(d.getUTCSeconds()).padStart(2, '0')
        return `${hh}:${mm}:${ss}`
      })(),
      latitude: subject.latitude ?? undefined,
      longitude: subject.longitude ?? undefined,
      timezone: subject.timezone,
      rodens_rating: subject.rodens_rating ?? null,
      tags: subject.tags ?? null,
    })
    setEditDialogOpen(true)
  }

  const openCreateDialog = () => {
    setCreateError(null)
    createForm.reset({
      name: '',
      city: '',
      nation: '',
      birthDate: '',
      birthTime: '',
      latitude: undefined,
      longitude: undefined,
      timezone: 'UTC',
      rodens_rating: null,
      tags: null,
    })
    setCreateDialogOpen(true)
  }

  const confirmDelete = () => {
    if (!subjectToDelete || deleteMutation.isPending) return
    deleteMutation.mutate(subjectToDelete.id)
  }

  const submitEdit = editForm.handleSubmit((values: UpdateSubjectInput) => {
    if (updateMutation.isPending) return
    setEditError(null)
    updateMutation.mutate({ ...values })
  })

  const submitCreate = createForm.handleSubmit((values: CreateSubjectInput) => {
    if (createMutation.isPending) return
    setCreateError(null)
    createMutation.mutate({ ...values })
  })

  return {
    // Data
    query,

    // Delete dialog
    deleteDialog: {
      open: deleteDialogOpen,
      setOpen: setDeleteDialogOpen,
      subject: subjectToDelete,
      error: deleteError,
      mutation: deleteMutation,
      onConfirm: confirmDelete,
    },

    // Edit dialog
    editDialog: {
      open: editDialogOpen,
      setOpen: setEditDialogOpen,
      subject: subjectToEdit,
      error: editError,
      form: editForm,
      mutation: updateMutation,
      onSubmit: submitEdit,
    },

    // Create dialog
    createDialog: {
      open: createDialogOpen,
      setOpen: setCreateDialogOpen,
      error: createError,
      form: createForm,
      mutation: createMutation,
      onSubmit: submitCreate,
    },

    importMutation,

    // Actions
    actions: {
      openDeleteDialog,
      openEditDialog,
      openCreateDialog,
    },
  }
}
