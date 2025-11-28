import { ApiService } from '../../../core/services/api.service';
import { ApiResponse } from '../../../models/api.model';
import { PhotoEvent } from '../../../models/event.model';

const apiService = new ApiService();

export const eventApi = {
  getAll: (photoId?: string, page?: number, size?: number): Promise<ApiResponse<PhotoEvent[]>> => {
    let endpoint = '/api/events';
    const params: string[] = [];
    
    if (photoId) {
      params.push(`photoId=${photoId}`);
    }
    if (page !== undefined) {
      params.push(`page=${page}`);
    }
    if (size !== undefined) {
      params.push(`size=${size}`);
    }
    
    if (params.length > 0) {
      endpoint += `?${params.join('&')}`;
    }
    
    return apiService.get<PhotoEvent[]>(endpoint);
  },
};

