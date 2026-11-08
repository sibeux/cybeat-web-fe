export type UserRole = 'free' | 'premium' | 'admin'

export interface ManagedUser {
  user_id: number
  name: string
  email: string
  role: UserRole | string
}

export interface UserListResponse {
  status: string
  data: ManagedUser[]
}

export interface ChangeUserRoleCommand {
  user_id: number
  role: UserRole
}

export interface ChangeUserRoleResponse {
  status: string
  message: string
  data: { user_id: number; role: UserRole }
}
