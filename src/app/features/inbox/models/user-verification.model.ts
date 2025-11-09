
export enum UserVerificationStatus {
  PENDING = 'pending',
  VERIFIED = 'verified',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled',
}

export interface UserVerification {
  id: number;
  token: string;
  email: string;
  status: UserVerificationStatus;
  expiresAt: string;
  attempts: number;
  maxAttempts: number;
  createdAt: string;
  updatedAt: string;
  verifiedAt?: string;
}

export interface UserVerificationStatusResponse {
  email: string;
  status: UserVerificationStatus;
  verifiedAt?: string;
  expiresAt: string;
  attempts: number;
  maxAttempts: number;
  createdAt: string;
}

export interface RequestUserVerificationDTO {
  email: string;
}

export interface RejectUserVerificationDTO {
  reason?: string;
}

export interface PaginatedUserVerifications {
  data: UserVerification[];
  meta: {
    total: number;
    page: number;
    limit: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export interface UserVerificationSearchParams {
  status?: UserVerificationStatus;
  page?: number;
  limit?: number;
}