export interface ShelbyCouncilDTO {
  id: number;
  partner: { dni: string; name: string } | null;
  decision: { id: number; description: string } | null;
  joinDate: string;   // ISO string
  role?: string | null;
  notes?: string | null;
}

export interface CreateShelbyCouncilDTO {
  partnerDni: string;
  decisionId: number;
  joinDate?: string;   // ISO datetime string
  role?: string;
  notes?: string;
}

export interface PatchShelbyCouncilDTO {
  joinDate?: string;   // ISO datetime string
  role?: string;
  notes?: string;
}

// Estructura de respuesta del backend
export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface ApiResponse<T> { 
  data: T; 
  message?: string; 
}