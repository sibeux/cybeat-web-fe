import axios from 'axios'

/**
 * Shared Axios instance for all HTTP requests.
 *
 * Base URL is configured from the VITE_API_BASE_URL environment variable.
 * Interceptors are applied separately in interceptors.ts.
 *
 * Feature API modules import this instance — they do NOT create their own.
 */
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL as string,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
})

export default apiClient
