import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import {
  Notification,
  CreateNotificationDTO,
  NotificationSearchParams,
  PaginatedNotifications,
} from '../models/notification.model';
import { logger } from '../../../core/logger';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private readonly baseUrl = '/api/notifications';

  constructor(private http: HttpClient) {}

  /**
   * Obtener todas las notificaciones del usuario actual
   */
  async getMyNotifications(): Promise<Notification[]> {
    const response = await firstValueFrom(
      this.http.get<{ data: Notification[] }>(`${this.baseUrl}/me`, {
        withCredentials: true
      })
    );
    return response.data;
  }

  /**
   * Buscar notificaciones con filtros y paginación
   */
  async searchNotifications(params: NotificationSearchParams): Promise<PaginatedNotifications> {
    let httpParams = new HttpParams();

    if (params.status) httpParams = httpParams.set('status', params.status);
    if (params.type) httpParams = httpParams.set('type', params.type);
    if (params.userId) httpParams = httpParams.set('userId', params.userId);
    if (params.page) httpParams = httpParams.set('page', params.page.toString());
    if (params.limit) httpParams = httpParams.set('limit', params.limit.toString());

    return await firstValueFrom(
      this.http.get<PaginatedNotifications>(this.baseUrl, {
        params: httpParams,
        withCredentials: true
      })
    );
  }

  /**
   * Marcar una notificación como leída
   */
  async markAsRead(notificationId: string): Promise<Notification> {
    const response = await firstValueFrom(
      this.http.patch<{ data: Notification }>(
        `${this.baseUrl}/${notificationId}/read`,
        {},
        {
          withCredentials: true
        }
      )
    );
    return response.data;
  }

  /**
   * Marcar todas las notificaciones como leídas
   */
  async markAllAsRead(): Promise<void> {
    await firstValueFrom(
      this.http.patch<void>(
        `${this.baseUrl}/read-all`,
        {},
        {
          withCredentials: true
        }
      )
    );
  }

  /**
   * Obtener el conteo de notificaciones no leídas
   * Si el endpoint falla, calcula el conteo desde las notificaciones completas como fallback
   */
  async getUnreadCount(): Promise<number> {
    try {
      const response = await firstValueFrom(
        this.http.get<{ count: number }>(`${this.baseUrl}/unread-count`, {
          withCredentials: true
        })
      );
      return response.count;
    } catch (error: any) {
      // Fallback: si el endpoint falla, obtener todas las notificaciones y contar
      logger.warn('[NotificationService] Error fetching unread count, using fallback method:', error?.error?.message || error?.message);

      try {
        const notifications = await this.getMyNotifications();
        return notifications.filter(n => n.status === 'UNREAD').length;
      } catch (fallbackError) {
        logger.error('[NotificationService] Fallback method also failed:', fallbackError);
        // En caso de error total, retornar 0 para no romper la UI
        return 0;
      }
    }
  }

  /**
   * Eliminar una notificación
   */
  async deleteNotification(notificationId: string): Promise<void> {
    await firstValueFrom(
      this.http.delete<void>(`${this.baseUrl}/${notificationId}`, {
        withCredentials: true
      })
    );
  }

  /**
   * Crear una notificación (solo para testing o admin)
   */
  async createNotification(data: CreateNotificationDTO): Promise<Notification> {
    const response = await firstValueFrom(
      this.http.post<{ data: Notification }>(this.baseUrl, data, {
        withCredentials: true
      })
    );
    return response.data;
  }
}
