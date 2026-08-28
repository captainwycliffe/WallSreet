export interface ApiResponse<T> { data: T; message?: string; }
export interface PaginatedResponse<T> { items: T[]; total: number; page: number; pages: number; }
export interface ApiError { detail: string; status: number; }
