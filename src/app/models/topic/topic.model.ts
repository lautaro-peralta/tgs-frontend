
export interface TopicDTO {
  id: number;
  description: string;
}


export interface CreateTopicDTO {
  description: string;
}


export interface UpdateTopicDTO {
  description?: string; // Partial PATCH
}


export interface ApiResponse<T> {
  data: T;
  message?: string;
}
