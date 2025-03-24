import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Create Supabase client for client-side operations
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true
  }
})

// Types for our spreadsheet data
export type SpreadsheetData = {
  id: string
  user_id: string
  title: string
  cells: Record<string, any>
  is_starred: boolean
  last_interaction_at: string
  created_at: string
  updated_at: string
}

// Helper functions for spreadsheet operations
export async function saveSpreadsheet(spreadsheetData: Partial<SpreadsheetData>) {
  const { data, error } = await supabase
    .from('spreadsheets')
    .upsert({
      ...spreadsheetData,
      last_interaction_at: new Date().toISOString()
    })
    .select()
    .maybeSingle()

  if (error) throw error
  return data
}

export async function getSpreadsheet(id: string) {
  const { data, error } = await supabase
    .from('spreadsheets')
    .select()
    .eq('id', id)
    .maybeSingle()

  if (error) throw error
  if (!data) throw new Error('Spreadsheet not found')
  return data as SpreadsheetData
}

export async function getUserSpreadsheets(userId: string) {
  const { data, error } = await supabase
    .from('spreadsheets')
    .select()
    .eq('user_id', userId)
    .order('is_starred', { ascending: false }) // Starred spreadsheets first
    .order('updated_at', { ascending: false }) // Then by last update
    .order('created_at', { ascending: false }) // Then by creation date

  if (error) throw error
  return data as SpreadsheetData[]
}

export async function toggleSpreadsheetStar(id: string, isStarred: boolean) {
  const { error } = await supabase
    .from('spreadsheets')
    .update({ 
      is_starred: isStarred,
      last_interaction_at: new Date().toISOString()
    })
    .eq('id', id)

  if (error) throw error
}

export async function deleteSpreadsheet(id: string) {
  const { error } = await supabase
    .from('spreadsheets')
    .delete()
    .eq('id', id)

  if (error) throw error
}