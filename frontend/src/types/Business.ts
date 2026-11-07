export type BusinessRole = 'OWNER' | 'MANAGER' | 'EMPLOYEE'

export type Business = {
  id: number
  name: string
  ownerId: number
  ownerName: string
  address: string | null
  phone: string | null
  description: string | null
  enabledPages?: string[]
}

export type BusinessMember = {
  id: number
  businessId: number
  userId: number
  userName: string
  role: BusinessRole
  title?: string | null
  /** Display colour as "#rrggbb"; null/undefined means no colour. */
  color?: string | null
}
