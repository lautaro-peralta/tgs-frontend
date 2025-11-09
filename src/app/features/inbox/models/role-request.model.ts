import { Role } from '../../../models/user/user.model';

export enum RequestStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export interface RoleRequestUser {
  id: string;
  username: string;
  email: string;
}

export interface RoleRequestReviewer {
  id: string;
  username: string;
}

// ✅ NUEVO: Datos adicionales según el rol solicitado
export interface RoleRequestAdditionalData {
  // Para DISTRIBUTOR
  zoneId?: number;
  address?: string;
  productsIds?: number[];
  
  // Para AUTHORITY
  rank?: '0' | '1' | '2' | '3';
  // authorityZoneId también usa zoneId
}

export interface RoleRequest {
  id: string;
  user: RoleRequestUser;
  requestedRole: Role;
  roleToRemove: Role | null;
  isRoleChange: boolean;
  status: RequestStatus;
  justification?: string;
  additionalData?: RoleRequestAdditionalData; // ✅ NUEVO
  createdAt: string;
  reviewedAt?: string;
  reviewedBy: RoleRequestReviewer | null;
  adminComments?: string;
}

export interface CreateRoleRequestDTO {
  requestedRole: Role;
  roleToRemove?: Role;
  justification?: string;
  additionalData?: RoleRequestAdditionalData; // ✅ NUEVO
}

export interface ReviewRoleRequestDTO {
  action: 'approve' | 'reject';
  comments?: string;
}

export interface RoleRequestSearchParams {
  status?: RequestStatus;
  requestedRole?: Role;
  userId?: string;
  page?: number;
  limit?: number;
}

export interface PaginatedRoleRequests {
  data: RoleRequest[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}