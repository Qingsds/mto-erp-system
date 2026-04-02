import { createFileRoute } from "@tanstack/react-router"
import {CreateBillingPage} from '@/pages/billing/CreateBillingPage'
export const Route = createFileRoute("/billing/new")({
  component: CreateBillingPage
})
