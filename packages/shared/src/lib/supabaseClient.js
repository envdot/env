import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config';
import { getPlatformAdapter } from '../platform/adapterSingleton';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    storage: {
      getItem: async (key) => {
        try {
          const adapter = getPlatformAdapter();
          return await adapter.store.get(`supabase.${key}`);
        } catch {
          return localStorage.getItem(key);
        }
      },
      setItem: async (key, value) => {
        try {
          const adapter = getPlatformAdapter();
          await adapter.store.set(`supabase.${key}`, value);
        } catch {
          localStorage.setItem(key, value);
        }
      },
      removeItem: async (key) => {
        try {
          const adapter = getPlatformAdapter();
          await adapter.store.delete(`supabase.${key}`);
        } catch {
          localStorage.removeItem(key);
        }
      },
    },
  },
});
