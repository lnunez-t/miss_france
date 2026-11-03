import { demoBackend } from './demo'
import { createSupabaseBackend } from './supabase'
import type { Backend } from './types'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

/** Supabase si les clés sont configurées, sinon mode démo local. */
export const backend: Backend = url && key ? createSupabaseBackend(url, key) : demoBackend

export * from './types'
