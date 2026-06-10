import type { ApiResponse } from '../../shared/types'
import { localStorageApi } from './localStorageApi'

const BASE_URL = import.meta.env.PROD ? '/api' : 'http://localhost:3001/api'
const USE_LOCAL_STORAGE = true

function getAuthToken(): string | null {
  return localStorage.getItem('token')
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const token = getAuthToken()

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  }

  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`
  }

  const config: RequestInit = {
    ...options,
    headers,
  }

  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, config)

    const data: ApiResponse<T> = await response.json()

    if (!response.ok) {
      return {
        success: false,
        error: data.error || data.message || `HTTP Error: ${response.status}`,
      }
    }

    return data
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '网络请求失败',
    }
  }
}

function parseEndpoint(endpoint: string): { resource: string; id?: string } {
  const parts = endpoint.split('/').filter(Boolean)
  return {
    resource: parts[0] || '',
    id: parts[1],
  }
}

async function localRequest<T>(endpoint: string, method: string, body?: unknown): Promise<ApiResponse<T>> {
  const { resource, id } = parseEndpoint(endpoint)

  try {
    let result: any

    switch (resource) {
      case 'auth':
        if (method === 'POST' && endpoint.includes('login')) {
          const { username, password } = body as any
          result = await localStorageApi.login(username, password)
        }
        break

      case 'regions':
        result = await localStorageApi.getRegions()
        break

      case 'entities':
        if (method === 'GET') result = await localStorageApi.getEntities()
        else if (method === 'POST') result = await localStorageApi.createEntity(body)
        else if (method === 'PUT' && id) result = await localStorageApi.updateEntity(id, body)
        else if (method === 'DELETE' && id) result = await localStorageApi.deleteEntity(id)
        break

      case 'plots':
        if (method === 'GET') result = await localStorageApi.getPlots()
        else if (method === 'POST') result = await localStorageApi.createPlot(body)
        else if (method === 'PUT' && id) result = await localStorageApi.updatePlot(id, body)
        else if (method === 'DELETE' && id) result = await localStorageApi.deletePlot(id)
        break

      case 'tasks':
        if (method === 'GET') result = await localStorageApi.getTasks()
        else if (method === 'POST') result = await localStorageApi.createTask(body)
        else if (method === 'PUT' && id) result = await localStorageApi.updateTask(id, body)
        else if (method === 'DELETE' && id) result = await localStorageApi.deleteTask(id)
        break

      case 'sowing/progress':
        if (method === 'GET') result = await localStorageApi.getSowingProgress()
        else if (method === 'POST') result = await localStorageApi.createSowingProgress(body)
        break

      case 'harvest/progress':
        if (method === 'GET') result = await localStorageApi.getHarvestProgress()
        else if (method === 'POST') result = await localStorageApi.createHarvestProgress(body)
        break

      case 'disaster/warnings':
        if (method === 'GET') result = await localStorageApi.getDisasterWarnings()
        else if (method === 'POST') result = await localStorageApi.createDisasterWarning(body)
        else if (method === 'DELETE' && id) result = await localStorageApi.deleteDisasterWarning(id)
        break

      case 'disaster/records':
        if (method === 'GET') result = await localStorageApi.getDisasterRecords()
        else if (method === 'POST') result = await localStorageApi.createDisasterRecord(body)
        else if (method === 'PUT' && id) result = await localStorageApi.updateDisasterRecord(id, body)
        else if (method === 'DELETE' && id) result = await localStorageApi.deleteDisasterRecord(id)
        break

      case 'policies':
        if (method === 'GET') result = await localStorageApi.getPolicies()
        else if (method === 'POST') result = await localStorageApi.createPolicy(body)
        else if (method === 'PUT' && id) result = await localStorageApi.updatePolicy(id, body)
        else if (method === 'DELETE' && id) result = await localStorageApi.deletePolicy(id)
        break

      case 'statistics':
        result = await localStorageApi.getStatistics()
        break

      default:
        return { success: false, error: '未知接口' }
    }

    return result
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '操作失败',
    }
  }
}

export const api = {
  get: <T>(endpoint: string, options?: RequestInit) =>
    USE_LOCAL_STORAGE
      ? localRequest<T>(endpoint, 'GET')
      : request<T>(endpoint, { ...options, method: 'GET' }),

  post: <T>(endpoint: string, body?: unknown, options?: RequestInit) =>
    USE_LOCAL_STORAGE
      ? localRequest<T>(endpoint, 'POST', body)
      : request<T>(endpoint, {
          ...options,
          method: 'POST',
          body: body ? JSON.stringify(body) : undefined,
        }),

  put: <T>(endpoint: string, body?: unknown, options?: RequestInit) =>
    USE_LOCAL_STORAGE
      ? localRequest<T>(endpoint, 'PUT', body)
      : request<T>(endpoint, {
          ...options,
          method: 'PUT',
          body: body ? JSON.stringify(body) : undefined,
        }),

  patch: <T>(endpoint: string, body?: unknown, options?: RequestInit) =>
    USE_LOCAL_STORAGE
      ? localRequest<T>(endpoint, 'PATCH', body)
      : request<T>(endpoint, {
          ...options,
          method: 'PATCH',
          body: body ? JSON.stringify(body) : undefined,
        }),

  delete: <T>(endpoint: string, options?: RequestInit) =>
    USE_LOCAL_STORAGE
      ? localRequest<T>(endpoint, 'DELETE')
      : request<T>(endpoint, { ...options, method: 'DELETE' }),
}