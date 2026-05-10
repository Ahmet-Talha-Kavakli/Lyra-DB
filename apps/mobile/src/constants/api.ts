/**
 * API configuration
 * Environment-aware API base URL
 */

// In development, this should point to your local API
// In production, this will be your deployed API URL
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001';

export const SOCKET_URL = process.env.EXPO_PUBLIC_SOCKET_URL ?? 'http://localhost:3001';
