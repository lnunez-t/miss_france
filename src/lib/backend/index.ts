import { demoBackend } from './demo'
import { createSupabaseBackend } from './supabase'
import type { Backend } from './types'

// Ne garde que « https://xxx.supabase.co » : tolère « /rest/v1 », un « / » final, des guillemets ou des espaces.
function cleanUrl(raw: string | undefined): string | undefined {
  const v = raw?.trim().replace(/^["']|["']$/g, '')
  if (!v) return undefined
  try {
    return new URL(v).origin
  } catch {
    return v.replace(/\/rest\/v1.*$/, '').replace(/\/+$/, '')
  }
}
const url = cleanUrl(import.meta.env.VITE_SUPABASE_URL as string | undefined)
const key = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim().replace(/^["']|["']$/g, '')

/** Supabase si les clés sont configurées, sinon mode démo local. */
export const backend: Backend = url && key ? createSupabaseBackend(url, key) : demoBackend

export * from './types'
