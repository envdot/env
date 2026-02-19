// Environment variable access that works in both CRA (process.env) and Vite (import.meta.env)
function getEnv(key) {
  // Vite prefix
  const viteKey = key.replace('REACT_APP_', 'VITE_');
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    return import.meta.env[viteKey] || import.meta.env[key] || '';
  }
  if (typeof process !== 'undefined' && process.env) {
    return process.env[key] || '';
  }
  return '';
}

export const SUPABASE_URL = getEnv('REACT_APP_SUPABASE_URL') || 'https://bqxpwormvgeqfourqtnj.supabase.co';
export const SUPABASE_ANON_KEY = getEnv('REACT_APP_SUPABASE_ANON_KEY') || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJxeHB3b3JtdmdlcWZvdXJxdG5qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEyNTIwODEsImV4cCI6MjA4NjgyODA4MX0.TFodHsQRYmqSFP_rWdT5gPpcAJFikbXOmOOQ9Wofj0U';
export const STRIPE_PUBLISHABLE_KEY = getEnv('REACT_APP_STRIPE_PK') || 'pk_test_51SuAR3FvJiL49Kmv8YMFKN9dUcixfD4mRpGI88oTeW2m0ob0daiVRNOmBxaBukiKrwZSTPpywuPE5IxRSlNfoZc600fz4ycOl5';

// Stripe Price IDs
export const STRIPE_PRICES = {
  pro_annual: getEnv('REACT_APP_STRIPE_PRICE_PRO_ANNUAL') || 'price_1T1UwnFvJiL49KmvqJryU0Wm',
  pro_monthly: getEnv('REACT_APP_STRIPE_PRICE_PRO_MONTHLY') || 'price_1T1UwuFvJiL49KmvaGu7uIvO',
  max_5x: getEnv('REACT_APP_STRIPE_PRICE_MAX_5X') || 'price_1T1Ux8FvJiL49KmvmIWOUrqx',
  max_20x: getEnv('REACT_APP_STRIPE_PRICE_MAX_20X') || 'price_1T1UxGFvJiL49Kmvz6NDc29l',
};

export const API_BASE = `${SUPABASE_URL}/functions/v1`;
