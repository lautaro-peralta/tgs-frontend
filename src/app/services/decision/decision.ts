import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import {
  ApiResponse,
  DecisionDTO,
  CreateDecisionDTO,
  PatchDecisionDTO, // si tu Patch = Update parcial, ajustá el nombre
} from '../../models/decision/decision.model';

@Injectable({ providedIn: 'root' })
export class DecisionService {
  private readonly apiUrl = '/api/decisions';

  constructor(private http: HttpClient) {}

  private normMany = (res: any): DecisionDTO[] =>
    Array.isArray(res) ? res : (res?.data ?? res?.decisions ?? []);

  private normOne = (res: any): DecisionDTO =>
    (res?.data ?? res) as DecisionDTO;

  getAll(): Observable<DecisionDTO[]> {
    return this.http.get<ApiResponse<DecisionDTO[]>>(this.apiUrl).pipe(
      map(this.normMany)
    );
  }

  getById(id: number): Observable<DecisionDTO> {
    return this.http.get<ApiResponse<DecisionDTO>>(`${this.apiUrl}/${id}`).pipe(
      map(this.normOne)
    );
  }

  create(body: CreateDecisionDTO): Observable<DecisionDTO> {
    return this.http.post<ApiResponse<DecisionDTO>>(this.apiUrl, body).pipe(
      map(this.normOne)
    );
  }

  update(id: number, body: PatchDecisionDTO): Observable<DecisionDTO> {
    return this.http.patch<ApiResponse<DecisionDTO>>(`${this.apiUrl}/${id}`, body).pipe(
      map(this.normOne)
    );
  }

  delete(id: number) {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/${id}`);
  }
}
