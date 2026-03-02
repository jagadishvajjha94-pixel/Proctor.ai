/**
 * Supabase client for Auth + optional PostgreSQL
 * Works with SUPABASE_URL + SUPABASE_ANON_KEY
 */
import { createClient } from "@supabase/supabase-js"

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? ""
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY ?? ""

export const supabase = url && anonKey ? createClient(url, anonKey) : null

export async function signIn(email: string, password: string) {
  if (!supabase) throw new Error("Supabase not configured")
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  return data
}

export async function signUp(email: string, password: string, metadata?: { full_name?: string }) {
  if (!supabase) throw new Error("Supabase not configured")
  const { data, error } = await supabase.auth.signUp({ email, password, options: { data: metadata } })
  if (error) throw error
  return data
}

export async function signOut() {
  if (!supabase) return
  await supabase.auth.signOut()
}
