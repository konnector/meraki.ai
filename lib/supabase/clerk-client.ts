import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { useSession } from '@clerk/nextjs';
import { useMemo } from 'react';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// A cache to store client instances per token
let clientCache: {
  [token: string]: SupabaseClient
} = {};

// Hook to get authenticated Supabase client with Clerk
export function useSupabaseClient() {
  const { session, isLoaded, isSignedIn } = useSession();
  
  // Use useMemo to prevent recreating this function on every render
  const getClient = useMemo(() => {
    return async () => {
      // If session is not loaded yet, wait with a more robust approach
      if (!isLoaded) {
        // Wait for session to load with increasing timeouts
        let retries = 3;
        while (!isLoaded && retries > 0) {
          await new Promise(resolve => setTimeout(resolve, 300));
          retries--;
        }
      }
      
      // By this point, we should check if we have what we need
      if (!isSignedIn || !session) {
        throw new Error('No active session');
      }
      
      // Get Clerk-generated Supabase JWT
      const supabaseToken = await session.getToken({ template: 'supabase' });
      
      // Make sure we have a valid token
      if (!supabaseToken) {
        throw new Error('Failed to get Supabase token from Clerk');
      }
      
      // Return cached client if it exists for this token
      if (clientCache[supabaseToken]) {
        return clientCache[supabaseToken];
      }
      
      // Create and cache a new client
      const client = createClient(supabaseUrl, supabaseAnonKey, {
        global: {
          headers: {
            Authorization: `Bearer ${supabaseToken}`
          }
        }
      });
      
      // Store in cache
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