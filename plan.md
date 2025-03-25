# Clerk-Supabase Integration Plan

## Overview
This plan outlines how to properly connect Clerk (authentication) with Supabase (database) to secure your application data using JWT tokens and Row Level Security.

## ✅ Step 1: Create Supabase JWT Template in Clerk Dashboard [COMPLETED]

1. Created a JWT template in Clerk Dashboard named `supabase`
2. Used HS256 signing algorithm
3. Added JWT Secret from Supabase Project Settings
4. Successfully saved the template

## ✅ Step 2: Set Up Database Security in Supabase [COMPLETED]

1. Created a function to extract user ID from JWT token:
```sql
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

2. Created the spreadsheets table with proper structure:
```sql
CREATE TABLE IF NOT EXISTS public.spreadsheets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL DEFAULT requesting_user_id(),
  title TEXT NOT NULL,
  data JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

3. Enabled Row Level Security on the spreadsheets table 
4. Created RLS policies for SELECT, INSERT, UPDATE and DELETE operations to ensure users can only access their own data

## ✅ Step 3: Create Authenticated Supabase Client [COMPLETED]

Created `lib/supabase/clerk-client.ts` with:
- Client instance caching to prevent multiple instances
- Proper session state handling to prevent "No active session" errors
- Error handling for authentication stages

```typescript
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { useSession } from '@clerk/nextjs';
import { useMemo } from 'react';

// A cache to store client instances per token
let clientCache: {
  [token: string]: SupabaseClient
} = {};

export function useSupabaseClient() {
  const { session, isLoaded, isSignedIn } = useSession();
  
  const getClient = useMemo(() => {
    return async () => {
      // Wait for session to be loaded and check if user is signed in
      if (!isLoaded) {
        throw new Error('Clerk session is still loading');
      }
      
      if (!isSignedIn || !session) {
        throw new Error('No active session');
      }
      
      // Get Clerk-generated Supabase JWT
      const supabaseToken = await session.getToken({ template: 'supabase' });
      
      // Cache and reuse clients to prevent multiple instances
      if (clientCache[supabaseToken]) {
        return clientCache[supabaseToken];
      }
      
      const client = createClient(supabaseUrl, supabaseAnonKey, {
        global: {
          headers: {
            Authorization: `Bearer ${supabaseToken}`
          }
        }
      });
      
      clientCache[supabaseToken] = client;
      return client;
    };
  }, [session, isLoaded, isSignedIn]);
  
  return { 
    getClient,
    isLoaded,
    isSignedIn
  };
}
```

## ✅ Step 4: Create Secure API Functions [COMPLETED]

Created `lib/supabase/secure-api.ts` with:
- Session state pass-through
- CRUD operations for spreadsheets
- Automatic JWT token handling via the authenticated client

## ✅ Step 5: Update useSpreadsheet Hook [COMPLETED]

Modified `hooks/useSpreadsheet.ts` to:
- Check authentication state before making requests
- Properly handle error states 
- Pass session state to components

## ✅ Step 6: Update Dashboard to Use Real Data [COMPLETED]

Modified `app/dashboard/page.tsx` to:
- Load real data from Supabase using the authenticated client
- Handle loading states appropriately
- Show authentication state UI
- Implement "New" spreadsheet functionality
- Display spreadsheets with proper formatting

## ✅ Step 7: Test the Integration [COMPLETED]

Successfully tested:
- Creating new spreadsheets
- Viewing user-specific spreadsheets
- Authentication persistence
- Row Level Security enforcement
- Session state handling

## Step 8: Future Improvements

Potential enhancements:
- Implement persistent localStorage for starred spreadsheets
- Add spreadsheet sharing functionality
- Create an activity log for spreadsheet changes
- Add real-time collaboration

## Summary

The integration ensures:
- User identity is verified by Clerk
- Data is securely stored in Supabase
- Row Level Security enforces data isolation
- Authentication flows seamlessly between services
- Error states are properly handled
- Loading states provide good UX
- Session management is robust 