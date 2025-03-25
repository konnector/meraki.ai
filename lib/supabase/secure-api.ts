import { useSupabaseClient } from './clerk-client';
import type { Spreadsheet, SpreadsheetData } from './types';

export function useSpreadsheetApi() {
  const { getClient, isLoaded, isSignedIn } = useSupabaseClient();
  
  // CRUD operations that use the authenticated client
  return {
    // Session state
    isLoaded,
    isSignedIn,
    
    // Create a new spreadsheet
    async createSpreadsheet(title: string) {
      const client = await getClient();
      return client
        .from('spreadsheets')
        .insert([{ 
          title, 
          data: {},
          created_at: new Date().toISOString()
        }])
        .select()
        .single();
    },
    
    // Get all spreadsheets (RLS will filter by user_id)
    async getSpreadsheets() {
      const client = await getClient();
      return client
        .from('spreadsheets')
        .select('*')
        .order('created_at', { ascending: false });
    },
    
    // Get a single spreadsheet by ID
    async getSpreadsheet(id: string) {
      const client = await getClient();
      return client
        .from('spreadsheets')
        .select('*')
        .eq('id', id)
        .single();
    },
    
    // Update spreadsheet data
    async updateSpreadsheet(id: string, data: SpreadsheetData) {
      const client = await getClient();
      return client
        .from('spreadsheets')
        .update({ 
          data,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);
    },

    // Update spreadsheet title
    async updateTitle(id: string, title: string) {
      const client = await getClient();
      return client
        .from('spreadsheets')
        .update({ 
          title,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);
    },
    
    // Delete a spreadsheet
    async deleteSpreadsheet(id: string) {
      const client = await getClient();
      return client
        .from('spreadsheets')
        .delete()
        .eq('id', id);
    }
  };
} 