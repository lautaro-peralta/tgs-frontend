// src/app/services/partner/partner.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import {
  PartnerDTO,
  CreatePartnerDTO,
  PatchPartnerDTO,
  PartnerListResponse,
  PartnerItemResponse,
} from '../../models/partner/partner.model';

@Injectable({ providedIn: 'root' })
export class PartnerService {
  private http = inject(HttpClient);
  private base = '/api/partners';

  /**
   * Lista de socios con filtros opcionales (q, page, pageSize).
   * GET /api/partners?q=...&page=...&pageSize=...
   */
  list(opts?: { q?: string; page?: number; pageSize?: number }): Observable<PartnerListResponse> {
    let params = new HttpParams();
    if (opts?.q) params = params.set('q', opts.q);
    if (typeof opts?.page === 'number') params = params.set('page', String(opts.page));
    if (typeof opts?.pageSize === 'number') params = params.set('pageSize', String(opts.pageSize));
    return this.http.get<PartnerListResponse>(this.base, { params });
  }

  /**
   * Obtiene un socio por DNI.
   * GET /api/partners/:dni
   */
  get(dni: string): Observable<PartnerItemResponse> {
    return this.http.get<PartnerItemResponse>(`${this.base}/${encodeURIComponent(dni)}`);
  }

  /**
   * Crea un socio.
   * POST /api/partners
   */
  create(payload: CreatePartnerDTO): Observable<PartnerItemResponse> {
    return this.http.post<PartnerItemResponse>(this.base, payload);
  }

  /**
   * Actualiza parcialmente un socio por DNI.
   * PATCH /api/partners/:dni
   */
  update(dni: string, payload: PatchPartnerDTO): Observable<PartnerItemResponse> {
    return this.http.patch<PartnerItemResponse>(`${this.base}/${encodeURIComponent(dni)}`, payload);
  }

  /**
   * Elimina un socio por DNI.
   * DELETE /api/partners/:dni
   */
  delete(dni: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${encodeURIComponent(dni)}`);
  }

  // =========================
  // Relaciones con Decisiones
  // =========================

  /**
   * Adjunta una decisión al socio.
   * POST /api/partners/:dni/decisions/:decisionId
   */
  attachDecision(dni: string, decisionId: number): Observable<PartnerItemResponse> {
    return this.http.post<PartnerItemResponse>(
      `${this.base}/${encodeURIComponent(dni)}/decisions/${decisionId}`,
      {}
    );
  }

  /**
   * Desvincula una decisión del socio.
   * DELETE /api/partners/:dni/decisions/:decisionId
   */
  detachDecision(dni: string, decisionId: number): Observable<PartnerItemResponse> {
    return this.http.delete<PartnerItemResponse>(
      `${this.base}/${encodeURIComponent(dni)}/decisions/${decisionId}`
    );
  }

  // =========================
  // Helpers opcionales
  // =========================

  /**
   * Verifica si existe un socio con ese DNI.
   */
  exists(dni: string): Observable<boolean> {
    return new Observable<boolean>((subscriber) => {
      this.get(dni).subscribe({
        next: () => { subscriber.next(true); subscriber.complete(); },
        error: () => { subscriber.next(false); subscriber.complete(); }
      });
    });
  }

  /**
   * Migración: Asigna rol PARTNER a todos los usuarios que tienen un socio asociado
   * POST /api/partners/migrate/roles
   */
  migratePartnerRoles(): Observable<any> {
    return this.http.post<any>(`${this.base}/migrate/roles`, {});
  }
}
