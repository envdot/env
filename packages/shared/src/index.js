// @env/shared barrel export

// Platform
export { PlatformProvider, usePlatform } from './platform/PlatformContext';
export { setPlatformAdapter, getPlatformAdapter } from './platform/adapterSingleton';

// Store
export { initPlatformListeners } from './store';

// Lib
export { supabase } from './lib/supabaseClient';
