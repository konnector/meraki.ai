import { NextResponse, NextRequest } from 'next/server'
import { getAuth } from '@clerk/nextjs/server'
import { supabaseAdmin } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    // Use getAuth which doesn't access headers automatically
    const { userId } = getAuth(request);
    
    console.log('API route called with userId:', userId)
    
    if (!userId) {
      console.log('No userId found, returning 401')
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    console.log('Attempting to create spreadsheet for user:', userId)
    
    // Create new spreadsheet using admin client
    const { data, error } = await supabaseAdmin
      .from('spreadsheets')
      .insert({
        user_id: userId,
        title: 'Untitled Spreadsheet',
        cells: {},
        is_starred: false,
        last_interaction_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      console.error('Supabase error:', error)
      throw error
    }

    console.log('Spreadsheet created successfully:', data)
    return NextResponse.json(data)
  } catch (error: any) {
    // Log the full error object
    console.error('Full error object:', error)
    
    // Get the detailed error message
    const errorMessage = error?.message || 
                        error?.error?.message ||
                        error?.error?.details ||
                        'Unknown error occurred'
                        
    console.error('Detailed error creating spreadsheet:', errorMessage)
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
} 