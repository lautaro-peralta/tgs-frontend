export interface MemberDTO {
  id: number;
  dni: string;
  name: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
}
