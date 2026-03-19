/**
 * 轻量 Toast 系统（不依赖 antd/sonner）
 * 通过 Zustand 全局状态 + <ToastContainer /> 渲染
 */
import { create } from "zustand"

export type ToastType = "success" | "error" | "info"

export interface ToastItem {
  id:      string
  type:    ToastType
  message: string
}

interface ToastState {
  toasts:  ToastItem[]
  push:    (type: ToastType, message: string, duration?: number) => void
  remove:  (id: string) => void
}

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],
  push(type, message, duration = 3000) {
    const id = Math.random().toString(36).slice(2)
    set(s => ({ toasts: [...s.toasts, { id, type, message }] }))
    setTimeout(() => get().remove(id), duration)
  },
  remove(id) {
    set(s => ({ toasts: s.toasts.filter(t => t.id !== id) }))
  },
}))

// 便捷调用
export const toast = {
  success: (msg: string) => useToastStore.getState().push("success", msg),
  error:   (msg: string) => useToastStore.getState().push("error",   msg),
  info:    (msg: string) => useToastStore.getState().push("info",     msg),
}