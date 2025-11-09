import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import {
  ApiResponse,
  TopicDTO,
  CreateTopicDTO,
  UpdateTopicDTO,
} from '../../models/topic/topic.model';

@Injectable({ providedIn: 'root' })
export class TopicService {
  private readonly apiUrl = '/api/topics';

  constructor(private http: HttpClient) {}

  // ---- Helpers de normalización (backend -> frontend) ----
  private normalizeOne = (raw: any): TopicDTO => {
    if (!raw) return { id: 0, description: '' };
    const description = raw.description ?? raw.descripcion ?? '';
    return { id: Number(raw.id ?? 0), description };
  };

  private normalizeMany = (raw: any): TopicDTO[] => {
    const arr: any[] = Array.isArray(raw)
      ? raw
      : Array.isArray(raw?.data)
      ? raw.data
      : Array.isArray(raw?.topics)
      ? raw.topics
      : [];
    return arr.map(this.normalizeOne);
  };

  // ---- CRUD ----
  getAll(): Observable<TopicDTO[]> {
    return this.http.get<ApiResponse<TopicDTO[]>>(this.apiUrl).pipe(
      map((res: any) => this.normalizeMany(res))
    );
  }

  getById(id: number): Observable<TopicDTO> {
    return this.http.get<ApiResponse<TopicDTO>>(`${this.apiUrl}/${id}`).pipe(
      map((res: any) => this.normalizeOne(res?.data ?? res))
    );
  }

  create(body: CreateTopicDTO): Observable<TopicDTO> {
    // Enviamos ambas claves para mayor compatibilidad
    const payload: any = {
      description: body.description,
      descripcion: body.description,
    };
    return this.http.post<ApiResponse<TopicDTO>>(this.apiUrl, payload).pipe(
      map((res: any) => this.normalizeOne(res?.data ?? res))
    );
  }

  update(id: number, body: UpdateTopicDTO): Observable<TopicDTO> {
    const payload: any = {};
    if (body.description !== undefined) {
      payload.description = body.description;
      payload.descripcion = body.description;
    }
    return this.http.patch<ApiResponse<TopicDTO>>(`${this.apiUrl}/${id}`, payload).pipe(
      map((res: any) => this.normalizeOne(res?.data ?? res))
    );
  }

  delete(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/${id}`);
  }
}
