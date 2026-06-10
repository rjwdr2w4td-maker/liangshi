import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User, LoginRequest, LoginResponse, ApiResponse } from '../../shared/types'
import { api } from '../utils/api'

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  login: (credentials: LoginRequest) => Promise<ApiResponse<LoginResponse>>
  logout: () => void
  setUser: (user: User) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      login: async (credentials: LoginRequest) => {
        const response = await api.post<LoginResponse>('/auth/login', credentials)

        if (response.success && response.data) {
          const { user, token } = response.data

          localStorage.setItem('token', token)

          set({
            user,
            token,
            isAuthenticated: true,
          })
        }

        return response
      },

      logout: () => {
        localStorage.removeItem('token')

        set({
          user: null,
          token: null,
          isAuthenticated: false,
        })
      },

      setUser: (user: User) => {
        set({ user })
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)
