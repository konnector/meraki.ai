# Clerk-Supabase Integration Plan

## Overview
This plan outlines how to properly connect Clerk (authentication) with Supabase (database) to secure your application data using JWT tokens and Row Level Security.

## Step 1: Create Supabase JWT Template in Clerk Dashboard

1. Log in to [Clerk Dashboard](https://dashboard.clerk.com/)
2. Navigate to **JWT Templates** in the sidebar
3. Click **New template** → select **Supabase**
4. Configure template:
   - **Name**: `supabase`
   - **Signing algorithm**: `HS256` (default)
   - Get your JWT Secret from Supabase:
     - Open [Supabase Dashboard](https://supabase.com/) → your project
     - Go to **Project Settings** → **API** → **JWT Settings**
     - Copy the **JWT Secret**
   - Paste this secret in Clerk's **Signing key** field
   - Save the template

## Step 2: Set Up Database Security in Supabase

1. Log in to Supabase and access SQL Editor
2. Create function to extract user ID from JWT:

```sql
-- Run this in the SQL Editor
CREATE OR REPLACE FUNCTION requesting_user_id()
RETURNS text
LANGUAGE sql
AS $$
  SELECT NULLIF(
    current_setting('request.jwt.claims', true)::json->>'sub',
    ''
  )::text;
$$;
```

3. Enable Row Level Security on your `spreadsheets` table:
   - Go to **Table Editor** → select `spreadsheets` table
   - Click **RLS** at the top → **Enable RLS**

4. Create RLS policies:

```sql
-- SELECT policy (view own spreadsheets)
CREATE POLICY "Users can view their own spreadsheets" 
ON spreadsheets FOR SELECT 
USING (requesting_user_id() = user_id);

-- INSERT policy (create own spreadsheets)
CREATE POLICY "Users can insert their own spreadsheets" 
ON spreadsheets FOR INSERT 
WITH CHECK (requesting_user_id() = user_id);

-- UPDATE policy (modify own spreadsheets)
CREATE POLICY "Users can update their own spreadsheets" 
ON spreadsheets FOR UPDATE 
USING (requesting_user_id() = user_id);

-- DELETE policy (delete own spreadsheets)
CREATE POLICY "Users can delete their own spreadsheets" 
ON spreadsheets FOR DELETE 
USING (requesting_user_id() = user_id);
```

## Step 3: Create Authenticated Supabase Client

1. Create a new file `lib/supabase/clerk-client.ts`:

```typescript
// lib/supabase/clerk-client.ts
import { createClient } from '@supabase/supabase-js';
import { useSession } from '@clerk/nextjs';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Hook to get authenticated Supabase client with Clerk
export function useSupabaseClient() {
  const { session } = useSession();
  
  const getClient = async () => {
    if (!session) {
      throw new Error('No active session');
    }
    
    // Get Clerk-generated Supabase JWT
    const supabaseToken = await session.getToken({ template: 'supabase' });
    
    // Create client with auth header
    return createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${supabaseToken}`
        }
      }
    });
  };
  
  return { getClient };
}
```

## Step 4: Create Secure API Functions

1. Create `lib/supabase/secure-api.ts`:

```typescript
// lib/supabase/secure-api.ts
import { useSupabaseClient } from './clerk-client';
import type { Spreadsheet, SpreadsheetData } from './types';

export function useSpreadsheetApi() {
  const { getClient } = useSupabaseClient();
  
  // CRUD operations that use the authenticated client
  return {
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
```

## Step 5: Update useSpreadsheet Hook

1. Modify `hooks/useSpreadsheet.ts` to use the secure API:

```typescript
// hooks/useSpreadsheet.ts
import { useState, useCallback } from 'react';
import { useSpreadsheetApi } from '@/lib/supabase/secure-api';
import type { Spreadsheet, SpreadsheetData } from '@/lib/supabase/types';

export function useSpreadsheet() {
  const spreadsheetApi = useSpreadsheetApi();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createSpreadsheet = useCallback(async (title: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await spreadsheetApi.createSpreadsheet(title);
      return result.data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create spreadsheet');
      return null;
    } finally {
      setLoading(false);
    }
  }, [spreadsheetApi]);

  const getSpreadsheets = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await spreadsheetApi.getSpreadsheets();
      return result.data || [];
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch spreadsheets');
      return [];
    } finally {
      setLoading(false);
    }
  }, [spreadsheetApi]);

  // ... similar updates for other methods

  return {
    loading,
    error,
    createSpreadsheet,
    getSpreadsheets,
    // ... other methods
  };
}
```

## Step 6: Update Dashboard to Use Real Data

1. Modify `app/dashboard/page.tsx` to use data from Supabase

```typescript
// Implement loading of real spreadsheets from Supabase
// Replace mock data with actual data from the getSpreadsheets() method
```

## Step 7: Test the Integration

1. Create a test user in Clerk
2. Sign in with this user
3. Create a spreadsheet
4. Sign out and create another user
5. Verify each user only sees their own spreadsheets
6. Test additional operations (update, delete)

## Step 8: Secure API Routes

1. Review middleware.ts to ensure API routes are properly protected
2. For any custom API routes, validate the auth token before accessing Supabase

## Additional Considerations

- Enable proper error handling throughout the application
- Add loading states for asynchronous operations
- Consider implementing optimistic UI updates
- Set up proper TypeScript types for all operations

This integration ensures that:
- User identity is verified by Clerk
- User data is segregated and secured by Supabase RLS
- Authentication flows are properly connected to database operations 