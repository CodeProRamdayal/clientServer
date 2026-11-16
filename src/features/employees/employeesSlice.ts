import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { Employee, EmployeeSummary } from '../../types'

export interface EmployeesState {
  items: Employee[]
  loadedFromApi: boolean
  loading: boolean
  total: number
  page: number
  limit: number
  search: string
  summary: EmployeeSummary | null
  summaryLoading: boolean
}

const initialState: EmployeesState = {
  items: [],
  loadedFromApi: false,
  loading: false,
  total: 0,
  page: 1,
  limit: 25,
  search: '',
  summary: null,
  summaryLoading: false,
}

export function getSavedEmployees(): EmployeesState {
  try {
    const value = localStorage.getItem('salary-management-employees')
    if (!value) return initialState
    const saved = JSON.parse(value) as Partial<EmployeesState>
    const items = Array.isArray(saved.items)
      ? saved.items.filter((employee) => !/^local-\d+$/.test(employee.id))
      : []
    return {
      ...initialState,
      ...saved,
      items,
      loading: false,
      summaryLoading: false,
    }
  } catch {
    return initialState
  }
}

const employeesSlice = createSlice({
  name: 'employees',
  initialState,
  reducers: {
    employeesLoading(state) {
      state.loading = true
    },
    summaryLoading(state) {
      state.summaryLoading = true
    },
    summaryReceived(state, action: PayloadAction<EmployeeSummary>) {
      state.summary = action.payload
      state.summaryLoading = false
    },
    employeesLoaded(state, action: PayloadAction<Employee[]>) {
      state.items = action.payload
      state.total = action.payload.length
      state.page = 1
      state.search = ''
      state.loadedFromApi = true
      state.loading = false
    },
    employeesLoadFailed(state) {
      state.loading = false
      state.summaryLoading = false
    },
    employeeSaved(state, action: PayloadAction<Employee>) {
      const index = state.items.findIndex((employee) => employee.id === action.payload.id)
      if (index < 0) {
        state.items.unshift(action.payload)
        state.total += 1
        if (state.summary) {
          state.summary.totalEmployees += 1
          state.summary.totalSalary += action.payload.monthlySalary
        }
      } else {
        const previousSalary = state.items[index].monthlySalary
        state.items[index] = action.payload
        if (state.summary) {
          state.summary.totalSalary += action.payload.monthlySalary - previousSalary
        }
      }
    },
    employeeRemoved(state, action: PayloadAction<string>) {
      const removed = state.items.find((employee) => employee.id === action.payload)
      state.items = state.items.filter((employee) => employee.id !== action.payload)
      if (removed) {
        state.total = Math.max(0, state.total - 1)
        if (state.summary) {
          state.summary.totalEmployees = Math.max(0, state.summary.totalEmployees - 1)
          state.summary.totalSalary = Math.max(
            0,
            state.summary.totalSalary - removed.monthlySalary,
          )
        }
      }
    },
    salaryChanged(state, action: PayloadAction<{ id: string; amount: number }>) {
      const employee = state.items.find((item) => item.id === action.payload.id)
      if (employee) {
        if (state.summary) {
          state.summary.totalSalary += action.payload.amount - employee.monthlySalary
        }
        employee.monthlySalary = action.payload.amount
      }
    },
    apiDataReceived(state, action: PayloadAction<{
      items: Employee[]
      total: number
      page: number
      limit: number
      search: string
    }>) {
      state.items = action.payload.items
      state.total = action.payload.total
      state.page = action.payload.page
      state.limit = action.payload.limit
      state.search = action.payload.search
      state.loadedFromApi = true
      state.loading = false
    },
  },
})

export const {
  employeesLoading, summaryLoading, summaryReceived, employeesLoaded, employeesLoadFailed, employeeSaved,
  employeeRemoved, salaryChanged, apiDataReceived,
} = employeesSlice.actions
export default employeesSlice.reducer
