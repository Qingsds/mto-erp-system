import { create } from "zustand"
import { persist } from "zustand/middleware"
import type { AuthUserInfo } from "@erp/shared-types"

interface AuthState {
  token: string | null
  user: AuthUserInfo | null
  hasHydrated: boolean
  setSession: (payload: { token: string; user: AuthUserInfo }) => void
  clearSession: () => void
  markHydrated: (value: boolean) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    set => ({
      token: null,
      user: null,
      hasHydrated: false,
      setSession: ({ token, user }) => set({ token, user }),
      clearSession: () => set({ token: null, user: null }),
      markHydrated: value => set({ hasHydrated: value }),
    }),
    {
      name: "erp-auth",
      partialize: state => ({
        token: state.token,
        user: state.user,
      }),
      onRehydrateStorage: () => state => {
        state?.markHydrated(true)
      },
    },
  ),
)
