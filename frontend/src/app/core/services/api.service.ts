import { ApiResponse } from '../../models/api.model';

export class ApiService {
  private baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8080';

  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        // If backend returns empty array or valid response structure, parse it
        if (response.status === 404 || response.status === 500) {
          const errorData = await response.json().catch(() => null);
          if (errorData && errorData.data && Array.isArray(errorData.data)) {
            return errorData; // Return empty array response
          }
        }
        throw new Error(`API Error: ${response.statusText}`);
      }

      return response.json();
    } catch (err) {
      // Network error or backend not available
      if (err instanceof TypeError && err.message.includes('fetch')) {
        throw new Error('Backend not available. Please ensure the server is running.');
      }
      throw err;
    }
  }

  async post<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: data ? JSON.stringify(data) : undefined,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        if (errorData && errorData.message) {
          throw new Error(errorData.message);
        }
        throw new Error(`API Error: ${response.statusText}`);
      }

      return response.json();
    } catch (err) {
      if (err instanceof TypeError && err.message.includes('fetch')) {
        throw new Error('Backend not available. Please ensure the server is running.');
      }
      throw err;
    }
  }

  async patch<T>(endpoint: string, data: any): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        if (errorData && errorData.message) {
          throw new Error(errorData.message);
        }
        throw new Error(`API Error: ${response.statusText}`);
      }

      return response.json();
    } catch (err) {
      if (err instanceof TypeError && err.message.includes('fetch')) {
        throw new Error('Backend not available. Please ensure the server is running.');
      }
      throw err;
    }
  }

  async delete<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    try {
      const options: RequestInit = {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      };

      if (data) {
        options.body = JSON.stringify(data);
      }

      const response = await fetch(`${this.baseUrl}${endpoint}`, options);

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        if (errorData && errorData.data && Array.isArray(errorData.data)) {
          return errorData;
        }
        throw new Error(`API Error: ${response.statusText}`);
      }

      return response.json();
    } catch (err) {
      if (err instanceof TypeError && err.message.includes('fetch')) {
        throw new Error('Backend not available. Please ensure the server is running.');
      }
      throw err;
    }
  }


  getBaseUrl(): string {
    return this.baseUrl;
  }
}

