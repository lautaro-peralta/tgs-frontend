export type ReviewStatus = 'PENDING' | 'IN_REVIEW' | 'COMPLETED' | 'APPROVED' | 'REJECTED';

export interface MonthlyReviewDTO {
  id: number;
  year: number;
  month: number;        // 1-12
  period: string;       // "January 2025"
  reviewDate: string;   // ISO
  status: ReviewStatus;
  totalSalesAmount?: number;
  totalSalesCount?: number;
  reviewedBy?: { dni: string; name: string } | null;
  observations?: string | null;
  recommendations?: string | null;
  createdAt: string;    // ISO
  updatedAt: string;    // ISO
}

export interface CreateMonthlyReviewDTO {
  year: number;
  month: number;
  partnerDni: string;           // Cambio clave: el backend espera "partnerDni"
  reviewDate?: string;          // ISO datetime string (YYYY-MM-DDTHH:mm:ssZ)
  status?: ReviewStatus;
  observations?: string;
  recommendations?: string;
}

export interface PatchMonthlyReviewDTO {
  reviewDate?: string;          // ISO datetime string
  status?: ReviewStatus;
  observations?: string;
  recommendations?: string;
}

// Estructura de respuesta paginada del backend
export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// Estructura de estadísticas del backend
export interface SalesStatisticsResponse {
  period: string;
  dateRange: {
    start: string;
    end: string;
  };
  summary: {
    totalSales: number;
    totalAmount: number;
    averageAmount: number;
  };
  groupedData?: any[];
}

export interface ApiResponse<T> { 
  data: T; 
  message?: string; 
  success?: boolean;
}