import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { 
  ApiResponse, 
  DistributorDTO, 
  CreateDistributorDTO, 
  PatchDistributorDTO 
} from '../../models/distributor/distributor.model';

@Injectable({ providedIn: 'root' })
export class DistributorService {
  private http = inject(HttpClient);
  private base = '/api/distributors';

  // ------- Normalizaciones -------
  private normalizeOne = (raw: any): DistributorDTO => {
    if (!raw) return { dni: '', name: '', phone: '', email: '' };

    const dni = String(raw.dni ?? raw.DNI ?? '');
    const name = String(raw.name ?? raw.nombre ?? '');
    const phone = String(raw.phone ?? raw.telefono ?? '');
    const email = String(raw.email ?? '');
    const address = raw.address ?? raw.direccion ?? '';

    // Zona (puede venir como objeto o solo id)
    const zoneObj = raw.zone ?? raw.zona ?? null;
    const zoneId = Number(zoneObj?.id ?? raw.zoneId ?? raw.zonaId ?? NaN);
    const zone = zoneObj
      ? { 
          id: Number((zoneObj.id ?? zoneId) || 0), 
          name: String(zoneObj.name ?? zoneObj.nombre ?? ''),
          isHeadquarters: Boolean(zoneObj.isHeadquarters)
        }
      : zoneId && !Number.isNaN(zoneId)
      ? { id: zoneId, name: '', isHeadquarters: false }
      : null;

    // Productos (array o "Information not available"...)
    const productsArr: any[] = Array.isArray(raw.products) 
      ? raw.products 
      : typeof raw.products === 'string' 
      ? [] 
      : [];
    
    const products = productsArr.map((p) => ({
      id: Number(p.id ?? 0),
      description: String(p.description ?? p.descripcion ?? ''),
    }));

    return { 
      dni, 
      name, 
      phone, 
      email, 
      address, 
      zoneId: zone?.id ?? null, 
      zone, 
      products 
    };
  };

  private normalizeMany = (raw: any): DistributorDTO[] => {
    const arr: any[] = Array.isArray(raw)
      ? raw
      : Array.isArray(raw?.data)
      ? raw.data
      : [];
    return arr.map(this.normalizeOne);
  };

  // ------- CRUD -------
  
  /** GET /api/distributors - Obtiene todos los distribuidores */
  getAll(): Observable<DistributorDTO[]> {
    return this.http.get<ApiResponse<DistributorDTO[]>>(this.base).pipe(
      map((res: any) => this.normalizeMany(res))
    );
  }

  /** GET /api/distributors/:dni - Obtiene un distribuidor por DNI */
  getOne(dni: string): Observable<DistributorDTO> {
    return this.http.get<ApiResponse<DistributorDTO>>(
      `${this.base}/${encodeURIComponent(dni)}`
    ).pipe(
      map((res: any) => this.normalizeOne(res?.data ?? res))
    );
  }

  /** POST /api/distributors - Crea un nuevo distribuidor */
  create(body: CreateDistributorDTO): Observable<DistributorDTO> {
    // ✅ Normalizar datos antes de enviar
    // El backend espera zoneId como STRING (z.string().transform(Number))
    const payload: any = {
      dni: String(body.dni).trim(),
      name: String(body.name).trim(),
      phone: String(body.phone).trim(),
      email: String(body.email).trim(),
      address: String(body.address || '-').trim(), // ← Backend requiere address (min 1)
      zoneId: String(body.zoneId), // ← Como STRING
      productsIds: (body.productsIds || []).map(Number).filter(n => !isNaN(n)),
    };

    // ✅ Incluir credenciales si están presentes (modo manual con createCreds)
    if (body.username) {
      payload.username = String(body.username).trim();
    }
    if (body.password) {
      payload.password = String(body.password).trim();
    }

    return this.http.post<ApiResponse<DistributorDTO>>(this.base, payload).pipe(
      map((res: any) => this.normalizeOne(res?.data ?? res))
    );
  }

  /** PATCH /api/distributors/:dni - Actualiza un distribuidor */
  update(dni: string, patch: PatchDistributorDTO): Observable<DistributorDTO> {
    // ✅ Normalizar solo los campos presentes
    const payload: any = {};
    
    if (patch.name !== undefined) payload.name = String(patch.name).trim();
    if (patch.phone !== undefined) payload.phone = String(patch.phone).trim();
    if (patch.email !== undefined) payload.email = String(patch.email).trim();
    if (patch.address !== undefined) payload.address = String(patch.address).trim();
    if (patch.zoneId !== undefined) payload.zoneId = String(patch.zoneId); // ← Como STRING
    if (patch.productsIds !== undefined) {
      payload.productsIds = (patch.productsIds || []).map(Number).filter(n => !isNaN(n));
    }

    console.log('📤 Service sending UPDATE:', payload);

    return this.http.patch<ApiResponse<DistributorDTO>>(
      `${this.base}/${encodeURIComponent(dni)}`, 
      payload
    ).pipe(
      map((res: any) => this.normalizeOne(res?.data ?? res))
    );
  }

  /** DELETE /api/distributors/:dni - Elimina un distribuidor */
  delete(dni: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(
      `${this.base}/${encodeURIComponent(dni)}`
    );
  }

  /** GET /api/distributors/search - Búsqueda avanzada */
  search(params: {
    q?: string;
    by?: 'name' | 'zone';
    page?: number;
    limit?: number;
  }): Observable<DistributorDTO[]> {
    return this.http.get<ApiResponse<DistributorDTO[]>>(
      `${this.base}/search`, 
      { params: params as any }
    ).pipe(
      map((res: any) => this.normalizeMany(res))
    );
  }
}