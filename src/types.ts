export type EmployeeStatus = 'Active' | 'Inactive'

export interface Employee {
  id: string
  employeeId: string
  name: string
  email: string
  phone: string
  department: string
  designation: string
  monthlySalary: number
  joiningDate: string
  status: EmployeeStatus
  roleIds: string[]
}

export interface AppUser {
  id: string
  name: string
  email: string
  roles: string[]
}

export interface RoleOption {
  id: string
  name: string
}

export interface EmployeeRoleSummary {
  id: string
  name: string
  employeeCount: number
}

export interface EmployeeSummary {
  totalEmployees: number
  totalSalary: number
  roleCount: number
  roles: EmployeeRoleSummary[]
}

export type EmployeeInput = Omit<Employee, 'id'>
