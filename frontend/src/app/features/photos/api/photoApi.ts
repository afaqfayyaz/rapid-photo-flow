import { ApiService } from '../../../core/services/api.service';
import { ApiResponse } from '../../../models/api.model';
import { Photo, PhotoRegisterRequest, PhotoStatusUpdateRequest, PhotoStatus, BulkDeleteRequest, BulkDeleteResponse } from '../../../models/photo.model';
import { BulkRegistrationItemResult } from '../../../models/upload.model';

const apiService = new ApiService();

export const photoApi = {
  getById: (id: string): Promise<ApiResponse<Photo>> =>
    apiService.get<Photo>(`/api/photos/${id}`),

  getAll: (status?: string, page?: number, size?: number): Promise<ApiResponse<Photo[]>> => {
    let endpoint = '/api/photos';
    const params: string[] = [];
    
    if (status) {
      params.push(`status=${status}`);
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
    
    return apiService.get<Photo[]>(endpoint);
  },
  
  getCompleted: (): Promise<ApiResponse<Photo[]>> =>
    apiService.get<Photo[]>('/api/photos/completed'),

  updateStatus: (id: string, request: PhotoStatusUpdateRequest): Promise<ApiResponse<void>> =>
    apiService.patch<void>(`/api/photos/${id}/status`, request),

  delete: (id: string): Promise<ApiResponse<void>> =>
    apiService.delete<void>(`/api/photos/${id}`),
  
  bulkDelete: (request: BulkDeleteRequest): Promise<ApiResponse<BulkDeleteResponse>> =>
    apiService.delete<BulkDeleteResponse>('/api/photos/bulk', request),

  bulkUpdateStatus: (photoIds: string[], status: PhotoStatus): Promise<ApiResponse<void>> =>
    apiService.patch<void>('/api/photos/bulk/status', { photoIds, status }),

  bulkRegister: (photos: PhotoRegisterRequest[]): Promise<ApiResponse<BulkRegistrationItemResult[]>> =>
    apiService.post<BulkRegistrationItemResult[]>('/api/photos/bulk', { photos }),
};

