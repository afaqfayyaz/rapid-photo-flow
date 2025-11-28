export interface ApiResponse<T> {
  status: boolean;
  message: string;
  statusCode: number;
  data: T;
}

