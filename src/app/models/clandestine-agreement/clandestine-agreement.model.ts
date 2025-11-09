export interface ClandestineAgreementDTO {
  id: number;
  description?: string;
  agreementDate: string; // ISO date
  status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  shelbyCouncil?: { id: number } | null;
  admin?: { dni: string; name: string } | null;
  authority?: { dni: string; name: string; rank?: string } | null;
}

export interface CreateClandestineAgreementDTO {
  description?: string;
  agreementDate?: string; // yyyy-MM-dd o ISO
  status?: 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  shelbyCouncilId: number;
  adminDni: string;
  authorityDni: string;
}

export interface UpdateClandestineAgreementDTO {
  description?: string;
  agreementDate?: string; // yyyy-MM-dd o ISO
  status?: 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
}

export interface ApiResponse<T> { 
  data: T; 
  message?: string; 
}