import { demoBackend } from './demo'
import { createSupabaseBackend } from './supabase'
import type { Backend } from './types'

// Tolère une URL copiée avec « /rest/v1 », un « / » final ou des espaces.
const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined)
  ?.trim()
  .replace(/^["']|["']$/g, '')
  .replace(/\/+$/, '')
  .replace(/\/rest\/v1$/, '')
const key = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim().replace(/^["']|["']$/g, '')

/** Supabase si les clés sont configurées, sinon mode démo local. */
export const backend: Backend = url && key ? createSupabaseBackend(url, key) : demoBackend

export * from './types'
