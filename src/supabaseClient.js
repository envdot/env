import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    storage: {
      getItem: async (key) => {
        if (window.electronAPI?.store) {
          return await window.electronAPI.store.get(`supabase.${key}`);
        }
        return localStorage.getItem(key);
      },
      setItem: async (key, value) => {
        if (window.electronAPI?.store) {
          await window.electronAPI.store.set(`supabase.${key}`, value);
        } else {
          localStorage.setItem(key, value);
        }
      },
      removeItem: async (key) => {
        if (window.electronAPI?.store) {
          await window.electronAPI.store.delete(`supabase.${key}`);
        } else {
          localStorage.removeItem(key);
        }
      },
    },
  },
});
