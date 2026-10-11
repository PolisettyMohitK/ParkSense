import { client } from './client'
import type { AuthResponse, User } from '../types'

export interface LoginPayload {
  email: string
  password: string
}

export interface RegisterPayload {
  fullName: string
  email: string
  password: string
  phone?: string
}

export interface ProfilePayload {
  fullName: string
  phone?: string | null
}

export async function login(payload: LoginPayload): Promise<AuthResponse> {
  const { data } = await client.post<AuthResponse>('/auth/login', payload)
  return data
}

export async function register(payload: RegisterPayload): Promise<AuthResponse> {
  const { data } = await client.post<AuthResponse>('/auth/register', payload)
  return data
}

export async function me(): Promise<User> {
  const { data } = await client.get<User>('/auth/me')
  return data
}

export async function updateProfile(payload: ProfilePayload): Promise<User> {
  const { data } = await client.put<User>('/me', payload)
  return data
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  await client.post('/me/password', { currentPassword, newPassword })
}
