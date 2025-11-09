import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';
import {
  ApiResponse,
  ZoneDTO,
  CreateZoneDTO,   // { name: string; isHeadquarters: boolean; description?: string }
  UpdateZonaDTO,   // = CreateZoneDTO
  PatchZonaDTO     // = Partial<CreateZoneDTO>
} from '../../models/zone/zona.model';

@Injectable({ providedIn: 'root' })
export class ZoneService {
  private readonly apiUrl = '/api/zones';

  constructor(private http: HttpClient) {}

  // ===== CRUD =====
  getAllZones(): Observable<ApiResponse<ZoneDTO[]>> {
    return this.http.get<ApiResponse<ZoneDTO[]>>(this.apiUrl, {
      withCredentials: true
    });
  }

  getZoneById(id: number): Observable<ApiResponse<ZoneDTO>> {
    return this.http.get<ApiResponse<ZoneDTO>>(`${this.apiUrl}/${id}`, {
      withCredentials: true
    });
  }

  // ⬅️ ahora enviamos { name, isHeadquarters } como pide el backend nuevo
  createZone(z: CreateZoneDTO): Observable<ApiResponse<ZoneDTO>> {
    const payload: any = {
      name: z.name,
      isHeadquarters: z.isHeadquarters ?? false,
    };
    // Si tu modelo tiene description pero el backend aún no, se ignora:
    if ((z as any).description !== undefined) payload.description = (z as any).description;
    return this.http.post<ApiResponse<ZoneDTO>>(this.apiUrl, payload, {
      withCredentials: true
    });
  }

  // El backend usa PATCH parcial
  updateZone(id: number, z: UpdateZonaDTO): Observable<ApiResponse<ZoneDTO>> {
    const payload: any = {};
    if (z.name !== undefined) payload.name = z.name;
    if (z.isHeadquarters !== undefined) payload.isHeadquarters = z.isHeadquarters;
    if ((z as any).description !== undefined) payload.description = (z as any).description;
    return this.http.patch<ApiResponse<ZoneDTO>>(`${this.apiUrl}/${id}`, payload, {
      withCredentials: true
    });
  }

  patchZone(id: number, z: PatchZonaDTO): Observable<ApiResponse<ZoneDTO>> {
    const payload: any = {};
    if (z.name !== undefined) payload.name = z.name;
    if (z.isHeadquarters !== undefined) payload.isHeadquarters = z.isHeadquarters;
    if ((z as any).description !== undefined) payload.description = (z as any).description;
    return this.http.patch<ApiResponse<ZoneDTO>>(`${this.apiUrl}/${id}`, payload, {
      withCredentials: true
    });
  }

  deleteZone(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`, {
      withCredentials: true
    });
  }

  // ===== Validaciones de nombre (UX) =====
  isNameAvailable(name: string, excludeId?: number): Observable<boolean> {
    const lower = (name ?? '').trim().toLowerCase();
    return this.getAllZones().pipe(
      map((resp: any) => {
        const data: ZoneDTO[] = Array.isArray(resp) ? resp : resp?.data ?? [];
        return !data.some(
          (z) =>
            (z.name ?? '').trim().toLowerCase() === lower &&
            (excludeId ? z.id !== excludeId : true)
        );
      }),
      catchError(() => of(true))
    );
  }

  createZonaValidated(z: CreateZoneDTO): Observable<ApiResponse<ZoneDTO>> {
    const name = (z.name ?? '').trim();
    if (!name) {
      return throwError(() => new Error('El nombre es requerido.'));
    }
    return this.isNameAvailable(name).pipe(
      switchMap((isFree) => {
        if (!isFree) {
          return throwError(
            () => new Error('Ya existe una zona con ese nombre (sin importar mayúsculas/minúsculas).')
          );
        }
        return this.createZone({ ...z, name });
      })
    );
  }

  updateZonaValidated(id: number, z: UpdateZonaDTO): Observable<ApiResponse<ZoneDTO>> {
    if (z.name === undefined) {
      return this.updateZone(id, z);
    }
    const name = (z.name ?? '').trim();
    if (!name) {
      return throwError(() => new Error('El nombre no puede ser vacío.'));
    }
    return this.isNameAvailable(name, id).pipe(
      switchMap((isFree) => {
        if (!isFree) {
          return throwError(
            () => new Error('Ya existe una zona con ese nombre (sin importar mayúsculas/minúsculas).')
          );
        }
        return this.updateZone(id, { ...z, name });
      })
    );
  }
}
