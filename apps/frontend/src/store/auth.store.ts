import { create } from "zustand"
import { persist } from "zustand/middleware"
import type { AuthUserInfo } from "@erp/shared-types"

interface AuthState {
  token: string | null
  user: AuthUserInfo | null
  hasHydrated: boolean
  isBootstrapping: boolean
  isSessionReady: boolean
  setSession: (payload: { token: string; user: AuthUserInfo }) => void
  clearSession: () => void
  resetSession: () => void
  markHydrated: (value: boolean) => void
  setBootstrapping: (value: boolean) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    set => ({
      token: null,
      user: null,
      hasHydrated: false,
      isBootstrapping: false,
      isSessionReady: false,
      setSession: ({ token, user }) =>
        set({ token, user, isBootstrapping: false, isSessionReady: true }),
      clearSession: () => set({ token: null, user: null, isSessionReady: false }),
      resetSession: () =>
        set({
          token: null,
          user: null,
          isBootstrapping: false,
          isSessionReady: false,
        }),
      markHydrated: value => set({ hasHydrated: value }),
      setBootstrapping: value => set({ isBootstrapping: value }),
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
