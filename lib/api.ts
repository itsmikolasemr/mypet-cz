import { Capacitor } from '@capacitor/core';

// Native apps have no same-origin server, so they call the deployed Netlify site.
export const API_BASE = Capacitor.isNativePlatform() ? (process.env.NEXT_PUBLIC_API_BASE || 'https://mypet-cz.netlify.app') : '';
