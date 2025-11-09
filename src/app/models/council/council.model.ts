import { MemberDTO } from '../member/member.model';
import { RoleDTO } from '../role/role.model';

export interface CouncilEntryDTO {
  id: number;
  memberId: number;
  roleId: number;
  member?: MemberDTO;
  role?: RoleDTO;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateCouncilEntryDTO {
  roleId: number;
  // O bien referenciar miembro existente
  memberId?: number;
  // O crear miembro "en línea"
  member?: {
    dni: string;
    name: string;
  };
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
}
