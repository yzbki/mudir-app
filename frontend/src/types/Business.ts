export type BusinessRole = 'OWNER' | 'MANAGER' | 'EMPLOYEE'

export type Business = {
  id: number
  name: string
  ownerId: number
  ownerName: string
  address: string | null
  phone: string | null
  description: string | null
}

export type BusinessMember = {
  id: number
  businessId: number
  userId: number
  userName: string
  role: BusinessRole
}
