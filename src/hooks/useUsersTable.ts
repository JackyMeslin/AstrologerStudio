'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  getUsers,
  getUserDetails,
  updateUserPlan,
  deleteUser,
  type UserListItem,
  type UserDetail,
  type ChartTypeKey,
} from '@/actions/admin'
import { toast } from 'sonner'

// Chart type column keys for sorting
export type ChartTypeColumn = `calc_${ChartTypeKey}`

// Sortable column types
export type ServerSortableColumn = 'createdAt' | 'lastLoginAt' | 'lastActiveAt'
export type ClientSortableColumn =
  | 'username'
  | 'email'
  | 'subscriptionPlan'
  | 'loginCount'
  | 'subjectsCount'
  | 'savedChartsCount'
  | 'calculationsTotal'
  | 'aiGenerationsTotal'
  | 'pdfExportsTotal'
  | ChartTypeColumn
export type SortableColumn = ServerSortableColumn | ClientSortableColumn

export const SERVER_SORTABLE_COLUMNS: ServerSortableColumn[] = ['createdAt', 'lastLoginAt', 'lastActiveAt']

export type VisibleColumns = {
  email: boolean
  plan: boolean
  created: boolean
  lastLogin: boolean
  lastActive: boolean
  logins: boolean
  subjects: boolean
  charts: boolean
  calculations: boolean
  calcNatal: boolean
  calcTransit: boolean
  calcSynastry: boolean
  calcComposite: boolean
  calcSolarReturn: boolean
  calcLunarReturn: boolean
  calcTimeline: boolean
  calcNow: boolean
  aiGenerations: boolean
  pdfExports: boolean
}

const DEFAULT_VISIBLE_COLUMNS: VisibleColumns = {
  email: true,
  plan: true,
  created: true,
  lastLogin: true,
  lastActive: true,
  logins: true,
  subjects: true,
  charts: true,
  calculations: true,
  calcNatal: true,
  calcTransit: true,
  calcSynastry: true,
  calcComposite: true,
  calcSolarReturn: true,
  calcLunarReturn: true,
  calcTimeline: true,
  calcNow: true,
  aiGenerations: true,
  pdfExports: true,
}

export function useUsersTable() {
  const [users, setUsers] = useState<UserListItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize] = useState(20)
  const [search, setSearch] = useState('')
  const [planFilter, setPlanFilter] = useState<string>('')

  // Server-side sorting (for date columns)
  const [serverSortBy, setServerSortBy] = useState<ServerSortableColumn>('createdAt')
  const [serverSortOrder, setServerSortOrder] = useState<'asc' | 'desc'>('desc')

  // Client-side sorting (for all other columns)
  const [clientSortBy, setClientSortBy] = useState<SortableColumn | null>(null)
  const [clientSortOrder, setClientSortOrder] = useState<'asc' | 'desc'>('desc')

  const [isLoading, setIsLoading] = useState(true)

  const [selectedUser, setSelectedUser] = useState<UserDetail | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [userToDelete, setUserToDelete] = useState<UserListItem | null>(null)
  const [userToEdit, setUserToEdit] = useState<UserListItem | null>(null)
  const [newPlan, setNewPlan] = useState('')
  const [isActionLoading, setIsActionLoading] = useState(false)

  // Column visibility state
  const [visibleColumns, setVisibleColumns] = useState<VisibleColumns>(DEFAULT_VISIBLE_COLUMNS)

  const toggleColumn = useCallback((column: keyof VisibleColumns) => {
    setVisibleColumns((prev) => ({ ...prev, [column]: !prev[column] }))
  }, [])

  const fetchUsers = useCallback(async () => {
    setIsLoading(true)
    const result = await getUsers(
      page,
      pageSize,
      search || undefined,
      planFilter || undefined,
      serverSortBy,
      serverSortOrder,
    )
    if (result.success && result.data) {
      setUsers(result.data.users)
      setTotal(result.data.total)
    }
    setIsLoading(false)
  }, [page, pageSize, search, planFilter, serverSortBy, serverSortOrder])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  // Handle column header click for sorting
  const handleSort = useCallback(
    (column: SortableColumn) => {
      const isServerColumn = SERVER_SORTABLE_COLUMNS.includes(column as ServerSortableColumn)

      if (isServerColumn) {
        // Server-side sorting for date columns
        setClientSortBy(null) // Clear client sort
        if (serverSortBy === column) {
          setServerSortOrder(serverSortOrder === 'desc' ? 'asc' : 'desc')
        } else {
          setServerSortBy(column as ServerSortableColumn)
          setServerSortOrder('desc')
        }
      } else {
        // Client-side sorting for other columns
        if (clientSortBy === column) {
          setClientSortOrder(clientSortOrder === 'desc' ? 'asc' : 'desc')
        } else {
          setClientSortBy(column)
          setClientSortOrder('desc')
        }
      }
    },
    [serverSortBy, serverSortOrder, clientSortBy, clientSortOrder],
  )

  // Get sort indicator for a column
  const getSortState = useCallback(
    (column: SortableColumn) => {
      const isServerColumn = SERVER_SORTABLE_COLUMNS.includes(column as ServerSortableColumn)
      const isActive = isServerColumn ? serverSortBy === column && !clientSortBy : clientSortBy === column
      const order = isServerColumn ? serverSortOrder : clientSortOrder

      return { isActive, order }
    },
    [serverSortBy, serverSortOrder, clientSortBy, clientSortOrder],
  )

  // Client-side sorted users
  const sortedUsers = useMemo(() => {
    if (!clientSortBy) return users

    return [...users].sort((a, b) => {
      let aVal: string | number | null = null
      let bVal: string | number | null = null

      switch (clientSortBy) {
        case 'username':
          aVal = a.username.toLowerCase()
          bVal = b.username.toLowerCase()
          break
        case 'email':
          aVal = (a.email || '').toLowerCase()
          bVal = (b.email || '').toLowerCase()
          break
        case 'subscriptionPlan':
          aVal = a.subscriptionPlan
          bVal = b.subscriptionPlan
          break
        case 'loginCount':
          aVal = a.loginCount
          bVal = b.loginCount
          break
        case 'subjectsCount':
          aVal = a.subjectsCount
          bVal = b.subjectsCount
          break
        case 'savedChartsCount':
          aVal = a.savedChartsCount
          bVal = b.savedChartsCount
          break
        case 'calculationsTotal':
          aVal = a.calculationsTotal
          bVal = b.calculationsTotal
          break
        case 'aiGenerationsTotal':
          aVal = a.aiGenerationsTotal
          bVal = b.aiGenerationsTotal
          break
        case 'pdfExportsTotal':
          aVal = a.pdfExportsTotal
          bVal = b.pdfExportsTotal
          break
        // Chart type calculations
        case 'calc_natal':
          aVal = a.calculationsByType.natal
          bVal = b.calculationsByType.natal
          break
        case 'calc_transit':
          aVal = a.calculationsByType.transit
          bVal = b.calculationsByType.transit
          break
        case 'calc_synastry':
          aVal = a.calculationsByType.synastry
          bVal = b.calculationsByType.synastry
          break
        case 'calc_composite':
          aVal = a.calculationsByType.composite
          bVal = b.calculationsByType.composite
          break
        case 'calc_solar-return':
          aVal = a.calculationsByType['solar-return']
          bVal = b.calculationsByType['solar-return']
          break
        case 'calc_lunar-return':
          aVal = a.calculationsByType['lunar-return']
          bVal = b.calculationsByType['lunar-return']
          break
        case 'calc_timeline':
          aVal = a.calculationsByType.timeline
          bVal = b.calculationsByType.timeline
          break
        case 'calc_now':
          aVal = a.calculationsByType.now
          bVal = b.calculationsByType.now
          break
        default:
          return 0
      }

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return clientSortOrder === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal)
      }

      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return clientSortOrder === 'asc' ? aVal - bVal : bVal - aVal
      }

      return 0
    })
  }, [users, clientSortBy, clientSortOrder])

  const handleSearch = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      setPage(1)
      fetchUsers()
    },
    [fetchUsers],
  )

  const handleViewDetails = useCallback(async (userId: string) => {
    setIsActionLoading(true)
    const result = await getUserDetails(userId)
    if (result.success && result.data) {
      setSelectedUser(result.data)
      setIsDetailOpen(true)
    } else {
      toast.error('Failed to load user details')
    }
    setIsActionLoading(false)
  }, [])

  const handleEditPlan = useCallback((user: UserDetail) => {
    setNewPlan(user.subscriptionPlan)
    setUserToEdit(null) // Clear quick edit
    setIsEditOpen(true)
  }, [])

  const handleQuickEditPlan = useCallback((user: UserListItem) => {
    setNewPlan(user.subscriptionPlan)
    setUserToEdit(user)
    setSelectedUser(null) // Clear detail view
    setIsEditOpen(true)
  }, [])

  const handleSavePlan = useCallback(async () => {
    const userId = selectedUser?.id || userToEdit?.id
    if (!userId) return
    setIsActionLoading(true)
    const result = await updateUserPlan(userId, newPlan)
    if (result.success) {
      toast.success('User plan updated successfully')
      setIsEditOpen(false)
      setIsDetailOpen(false)
      setUserToEdit(null)
      fetchUsers()
    } else {
      toast.error(result.error || 'Failed to update plan')
    }
    setIsActionLoading(false)
  }, [selectedUser?.id, userToEdit?.id, newPlan, fetchUsers])

  const handleDeleteUser = useCallback(async () => {
    if (!userToDelete) return
    setIsActionLoading(true)
    const result = await deleteUser(userToDelete.id)
    if (result.success) {
      toast.success('User deleted successfully')
      setIsDeleteOpen(false)
      setUserToDelete(null)
      fetchUsers()
    } else {
      toast.error(result.error || 'Failed to delete user')
    }
    setIsActionLoading(false)
  }, [userToDelete, fetchUsers])

  const handleOpenDeleteDialog = useCallback((user: UserListItem) => {
    setUserToDelete(user)
    setIsDeleteOpen(true)
  }, [])

  const totalPages = Math.ceil(total / pageSize)

  return {
    // Data
    users,
    sortedUsers,
    total,
    page,
    pageSize,
    totalPages,
    isLoading,

    // Pagination
    setPage,

    // Search & Filter
    search,
    setSearch,
    planFilter,
    setPlanFilter,
    handleSearch,

    // Sorting
    clientSortBy,
    handleSort,
    getSortState,

    // Column Visibility
    visibleColumns,
    toggleColumn,

    // Dialog state
    selectedUser,
    setSelectedUser,
    isDetailOpen,
    setIsDetailOpen,
    isEditOpen,
    setIsEditOpen,
    isDeleteOpen,
    setIsDeleteOpen,
    userToDelete,
    userToEdit,
    newPlan,
    setNewPlan,
    isActionLoading,

    // Actions
    handleViewDetails,
    handleEditPlan,
    handleQuickEditPlan,
    handleSavePlan,
    handleDeleteUser,
    handleOpenDeleteDialog,
  }
}
