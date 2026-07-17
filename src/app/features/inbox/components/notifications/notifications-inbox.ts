import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationService } from '../../services/notification.service';
import { Notification, NotificationStatus, NotificationType } from '../../models/notification.model';
import { NotificationCardComponent } from './notification-card';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AuthService } from '../../../../services/auth/auth';
import { logger } from '../../../../core/logger';

@Component({
  selector: 'app-notifications-inbox',
  standalone: true,
  imports: [CommonModule, NotificationCardComponent, TranslateModule],
  templateUrl: './notifications-inbox.html',
  styleUrls: ['./notifications.scss']
})
export class NotificationsInboxComponent implements OnInit {
  private t = inject(TranslateService);
  private notificationService = inject(NotificationService);
  private auth = inject(AuthService);

  notifications: Notification[] = [];
  filteredNotifications: Notification[] = [];
  loading: boolean = true;
  error: string | null = null;

  // Filtros
  selectedFilter: 'all' | 'unread' | 'read' = 'all';
  unreadCount: number = 0;

  NotificationStatus = NotificationStatus;
  NotificationType = NotificationType;

  ngOnInit(): void {
    this.loadNotifications();
  }

  async loadNotifications(): Promise<void> {
    try {
      this.loading = true;
      this.error = null;

      const fetched = await this.notificationService.getMyNotifications();

      // Ordenar por fecha descendente (más recientes primero)
      this.notifications = fetched.sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      this.unreadCount = this.notifications.filter(n => n.status === NotificationStatus.UNREAD).length;
      this.applyFilter();

      // 🔄 Auto-refresh si hay notificaciones de cambio de rol sin leer
      const hasUnreadRoleChange = this.notifications.some(n =>
        n.status === NotificationStatus.UNREAD && this.isRoleChangeNotification(n)
      );

      if (hasUnreadRoleChange) {
        logger.debug('[NotificationsInbox] 🔄 Unread role change notification detected, refreshing user data...');
        this.auth.forceRefresh();
      }
    } catch (err: any) {
      logger.error('❌ [NotificationsInbox] Error loading notifications:', err);
      this.error = err.error?.message || this.t.instant('notifications.errorLoad') || 'Error al cargar las notificaciones';
    } finally {
      this.loading = false;
    }
  }

  applyFilter(): void {
    switch (this.selectedFilter) {
      case 'unread':
        this.filteredNotifications = this.notifications.filter(n => n.status === NotificationStatus.UNREAD);
        break;
      case 'read':
        this.filteredNotifications = this.notifications.filter(n => n.status === NotificationStatus.READ);
        break;
      default:
        this.filteredNotifications = this.notifications;
    }
  }

  setFilter(filter: 'all' | 'unread' | 'read'): void {
    this.selectedFilter = filter;
    this.applyFilter();
  }

  async onMarkAsRead(notification: Notification): Promise<void> {
    try {
      await this.notificationService.markAsRead(notification.id);
      notification.status = NotificationStatus.READ;
      notification.readAt = new Date().toISOString();
      this.unreadCount = Math.max(0, this.unreadCount - 1);
      this.applyFilter();

      // 🔄 Auto-refresh del usuario si es una notificación de cambio de rol
      if (this.isRoleChangeNotification(notification)) {
        logger.debug('[NotificationsInbox] 🔄 Role change detected, refreshing user data...');
        this.auth.forceRefresh();
      }
    } catch (err: any) {
      logger.error('❌ Error marking notification as read:', err);
    }
  }

  async onDeleteNotification(notification: Notification): Promise<void> {
    if (!confirm(this.t.instant('notifications.confirmDelete') || '¿Eliminar esta notificación?')) {
      return;
    }

    try {
      await this.notificationService.deleteNotification(notification.id);

      // Actualizar la lista local
      this.notifications = this.notifications.filter(n => n.id !== notification.id);

      if (notification.status === NotificationStatus.UNREAD) {
        this.unreadCount = Math.max(0, this.unreadCount - 1);
      }

      this.applyFilter();
    } catch (err: any) {
      logger.error('❌ Error deleting notification:', err);
      this.error = this.t.instant('notifications.errorDelete') || 'Error al eliminar la notificación';
    }
  }

  async markAllAsRead(): Promise<void> {
    try {
      await this.notificationService.markAllAsRead();

      // Actualizar todas las notificaciones localmente
      this.notifications.forEach(n => {
        if (n.status === NotificationStatus.UNREAD) {
          n.status = NotificationStatus.READ;
          n.readAt = new Date().toISOString();
        }
      });

      this.unreadCount = 0;
      this.applyFilter();
    } catch (err: any) {
      logger.error('❌ Error marking all as read:', err);
      this.error = this.t.instant('notifications.errorMarkAllRead') || 'Error al marcar todas como leídas';
    }
  }

  trackByNotificationId(index: number, notification: Notification): string {
    return notification.id;
  }

  /**
   * Verifica si una notificación es de cambio de rol
   * (aprobación o rechazo de solicitud de rol o verificación)
   */
  private isRoleChangeNotification(notification: Notification): boolean {
    return notification.type === NotificationType.ROLE_REQUEST_APPROVED ||
           notification.type === NotificationType.USER_VERIFICATION_APPROVED;
  }
}
