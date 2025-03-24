import { NextResponse, NextRequest } from 'next/server'
import { getAuth } from '@clerk/nextjs/server'
import { supabaseAdmin } from '@/lib/supabase/server'

export async function PATCH(
  request: NextRequest,
  context: { params: { id: string } }
) {
  try {
    // Use getAuth which doesn't access headers automatically
    const { userId } = getAuth(request);
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get spreadsheet data WITH await
    const params = await context.params;
    const spreadsheetId = params.id;
    const spreadsheetData = await request.json()
    
    // Verify user owns this spreadsheet
    const { data: existingSheet } = await supabaseAdmin
      .from('spreadsheets')
      .select('user_id')
      .eq('id', spreadsheetId)
      .single()

    if (!existingSheet || existingSheet.user_id !== userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    const { data, error } = await supabaseAdmin
      .from('spreadsheets')
      .update({
        ...spreadsheetData,
        last_interaction_at: new Date().toISOString()
      })
      .eq('id', spreadsheetId)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json(data)
  } catch (error: any) {
    console.error('Error saving spreadsheet:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
} 