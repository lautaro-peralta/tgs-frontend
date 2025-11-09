
export interface DecisionDTO {
  id: number;
  description: string;
  startDate: string; // ISO
  endDate: string;    // ISO
  topic?: { id: number; description: string } | null;
}


export interface CreateDecisionDTO {
  topicId: number;
  description: string;
  startDate: string; // yyyy-MM-dd
  endDate: string;    // yyyy-MM-dd
}


export interface PatchDecisionDTO {
  topicId?: number;
  description?: string;
  startDate?: string;
  endDate?: string;
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
}
