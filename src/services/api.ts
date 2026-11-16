import type { AppUser, Employee, EmployeeInput, EmployeeSummary, RoleOption } from '../types'

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') ?? ''

export const isApiConfigured = Boolean(apiBaseUrl)

interface ApiResponse<T> {
  data: T
}

interface ApiUser {
  id: string
  name: string
  email: string
  phone: string
  roles?: Array<{ id: string; name: string }> | string[]
  salary?: { salaryAmount?: number | string } | null
}

interface ApiSalary {
  userId: string
  salaryAmount: number | string
  employee?: Pick<ApiUser, 'id' | 'name' | 'email' | 'phone'>
}

interface Paginated<T> {
  items: T[]
  total: number
  page: number
  limit: number
}

async function request<T>(path: string, token?: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers)
  if (init?.body) headers.set('Content-Type', 'application/json')
  if (token) headers.set('Authorization', `Bearer ${token}`)

  const response = await fetch(`${apiBaseUrl}${path}`, { ...init, headers })
  if (!response.ok) {
    const body = await response.json().catch(() => null) as { error?: string; message?: string } | null
    throw new Error(body?.error ?? body?.message ?? `Request failed (${response.status}).`)
  }
  if (response.status === 204) return undefined as T
  const payload = await response.json() as ApiResponse<T>
  return payload.data
}

export async function loginWithApi(email: string, password: string) {
  const result = await request<{ token: string; user: AppUser }>('/user/login', undefined, {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
  return result
}

export function logoutFromApi(token: string) {
  return request<{ message: string }>('/user/logout', token, { method: 'POST' })
}

export async function getRoles(token: string): Promise<RoleOption[]> {
  return request<RoleOption[]>('/roles', token)
}

export function getEmployeeSummaryFromApi(token: string): Promise<EmployeeSummary> {
  return request<EmployeeSummary>('/user?summary=true', token)
}

export async function getEmployeesPageFromApi(
  token: string,
  page: number,
  search = '',
  limit = 25,
): Promise<{ items: Employee[]; total: number; page: number; limit: number }> {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) })
  if (search.trim()) params.set('search', search.trim())
  const result = await request<Paginated<ApiUser>>(`/user?${params.toString()}`, token)
  return {
    ...result,
    items: result.items.map((user, index) => {
    const roles = user.roles ?? []
    return {
      id: user.id,
      employeeId: `EMP-${String((page - 1) * limit + index + 1).padStart(4, '0')}`,
      name: user.name,
      email: user.email,
      phone: user.phone,
      department: 'Unassigned',
      designation: roles.map((role) => typeof role === 'string' ? role : role.name).join(', ') || 'Employee',
      monthlySalary: Number(user.salary?.salaryAmount ?? 0),
      joiningDate: '',
      status: 'Active',
      roleIds: roles.flatMap((role) => typeof role === 'string' ? [] : [role.id]),
    }
    }),
  }
}

export async function createEmployeeWithApi(
  token: string,
  input: EmployeeInput,
  password: string,
): Promise<{ employee: Employee; warning?: string }> {
  const created = await request<ApiUser>('/user', token, {
    method: 'POST',
    body: JSON.stringify({
      name: input.name,
      email: input.email,
      phone: input.phone,
      password,
      roleIds: input.roleIds,
    }),
  })
  try {
    await updateSalaryWithApi(token, created.id, input.monthlySalary)
    return { employee: { ...input, id: created.id } }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown API error.'
    return {
      employee: { ...input, id: created.id, monthlySalary: 0 },
      warning: `Employee created, but the salary could not be saved: ${message}`,
    }
  }
}

export async function updateEmployeeWithApi(token: string, employee: Employee): Promise<{ warning?: string }> {
  await request<ApiUser>(`/user/${employee.id}`, token, {
    method: 'PATCH',
    body: JSON.stringify({
      name: employee.name,
      email: employee.email,
      phone: employee.phone,
      roleIds: employee.roleIds,
    }),
  })
  try {
    await updateSalaryWithApi(token, employee.id, employee.monthlySalary)
    return {}
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown API error.'
    return { warning: `Profile saved, but the salary could not be updated: ${message}` }
  }
}

export function deleteEmployeeFromApi(token: string, id: string) {
  return request<void>(`/user/${id}`, token, { method: 'DELETE' })
}

export function updateSalaryWithApi(token: string, userId: string, salaryAmount: number) {
  return request<ApiSalary>(`/salary/employees/${userId}`, token, {
    method: 'PUT',
    body: JSON.stringify({ salaryAmount, customAmount: salaryAmount, isDefault: false }),
  })
}
