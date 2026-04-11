import { useUIStore } from "@/store/ui.store"
import { CustomersDesktop } from "./CustomersDesktop"
import { CustomersMobile } from "./CustomersMobile"
import type { CustomersPageSearch } from "./search"

export interface CustomersPageProps {
  search: CustomersPageSearch
}

export function CustomersPage({ search }: CustomersPageProps) {
  const { isMobile } = useUIStore()

  return isMobile
    ? <CustomersMobile search={search} />
    : <CustomersDesktop search={search} />
}

