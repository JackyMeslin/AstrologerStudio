'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { createSubject } from '@/lib/api/subjects'
import type { Subject, CreateSubjectFormInput, CreateSubjectInput } from '@/types/subjects'
import { createSubjectSchema } from '@/lib/validation/subject'
import { useCreateSubjectDialogStore } from '@/stores/createSubjectDialog'
import { getErrorMessage } from '@/lib/utils/error'
import { useState } from 'react'
import { queryKeys } from '@/lib/query-keys'

export function useCreateSubjectDialog() {
  const queryClient = useQueryClient()
  const router = useRouter()
  const { open, setOpen, closeDialog } = useCreateSubjectDialogStore()
  const [error, setError] = useState<string | null>(null)
  const subjectsQueryKey = queryKeys.subjects.list()

  // Form uses input type for form fields, output type for validated data
  const form = useForm<CreateSubjectFormInput, unknown, CreateSubjectInput>({
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

  const mutation = useMutation({
    mutationFn: (data: CreateSubjectInput) => createSubject(data),
    onSuccess: (created) => {
      queryClient.setQueryData<Subject[]>(subjectsQueryKey, (old) => {
        if (!old) return [created]
        return [created, ...old]
      })
      closeDialog()
      form.reset()
      // Navigate to the newly created subject's natal chart
      router.push(`/subjects/${created.id}/natal`)
    },
    onError: (err: unknown) => {
      setError(getErrorMessage(err))
    },
  })

  const onSubmit = form.handleSubmit((values: CreateSubjectInput) => {
    if (mutation.isPending) return
    setError(null)
    mutation.mutate({ ...values })
  })

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && !mutation.isPending) {
      setOpen(false)
      form.reset()
      setError(null)
    } else {
      setOpen(newOpen)
    }
  }

  return {
    open,
    onOpenChange: handleOpenChange,
    error,
    form,
    isCreating: mutation.isPending,
    onSubmit,
  }
}
