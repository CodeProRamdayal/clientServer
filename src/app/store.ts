import { configureStore } from '@reduxjs/toolkit'
import authReducer, { getSavedAuth } from '../features/auth/authSlice'
import employeesReducer, { getSavedEmployees } from '../features/employees/employeesSlice'

export const store = configureStore({
  reducer: {
    auth: authReducer,
    employees: employeesReducer,
  },
  preloadedState: {
    auth: getSavedAuth(),
    employees: getSavedEmployees(),
  },
})

store.subscribe(() => {
  try {
    localStorage.setItem('salary-management-auth', JSON.stringify(store.getState().auth))
    localStorage.setItem('salary-management-employees', JSON.stringify(store.getState().employees))
  } catch (error) {
    console.error('Unable to persist salary management data:', error)
  }
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
