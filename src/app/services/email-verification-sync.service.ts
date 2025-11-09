import { Injectable, signal } from '@angular/core';
import { EmailVerificationService } from '../features/inbox/services/email.verification';

/**
 * Servicio para sincronizar el estado de verificación de email entre pestañas
 * Usa BroadcastChannel para comunicación en tiempo real entre pestañas
 */
@Injectable({
  providedIn: 'root'
})
export class EmailVerificationSyncService {
  private channel: BroadcastChannel | null = null;
  private readonly CHANNEL_NAME = 'email-verification-channel';

  // Signal para indicar si se completó la verificación
  emailVerified = signal<{ email: string; timestamp: number } | null>(null);

  constructor(private emailVerificationService: EmailVerificationService) {
    this.initializeBroadcastChannel();
  }

  /**
   * Inicializa el BroadcastChannel para comunicación entre pestañas
   */
  private initializeBroadcastChannel(): void {
    try {
      if ('BroadcastChannel' in window) {
        console.log('[EmailVerificationSync] Inicializando BroadcastChannel');
        this.channel = new BroadcastChannel(this.CHANNEL_NAME);

        // Escuchar mensajes de otras pestañas
        this.channel.onmessage = (event) => {
          console.log('[EmailVerificationSync] Mensaje recibido via BroadcastChannel:', event.data);
          if (event.data.type === 'EMAIL_VERIFIED') {
            console.log('[EmailVerificationSync] ✅ Email verificado detectado via BroadcastChannel:', event.data.email);
            this.emailVerified.set({
              email: event.data.email,
              timestamp: event.data.timestamp
            });
          }
        };
      } else {
        console.warn('[EmailVerificationSync] BroadcastChannel no está disponible en este navegador');
      }
    } catch (error) {
      console.warn('[EmailVerificationSync] Error inicializando BroadcastChannel:', error);
    }
  }

  /**
   * Notifica a todas las pestañas que el email fue verificado
   */
  notifyEmailVerified(email: string): void {
    console.log('[EmailVerificationSync] Notificando que email fue verificado:', email);

    const message = {
      type: 'EMAIL_VERIFIED',
      email,
      timestamp: Date.now()
    };

    // Enviar via BroadcastChannel
    if (this.channel) {
      try {
        console.log('[EmailVerificationSync] Enviando mensaje via BroadcastChannel:', message);
        this.channel.postMessage(message);
      } catch (error) {
        console.warn('[EmailVerificationSync] Error enviando mensaje via BroadcastChannel:', error);
      }
    } else {
      console.warn('[EmailVerificationSync] BroadcastChannel no disponible, usando solo localStorage');
    }

    // También guardar en localStorage como fallback
    console.log('[EmailVerificationSync] Guardando evento en localStorage');
    localStorage.setItem('emailVerificationEvent', JSON.stringify(message));

    // Limpiar después de 5 segundos para no dejar basura
    setTimeout(() => {
      const stored = localStorage.getItem('emailVerificationEvent');
      if (stored) {
        const storedEvent = JSON.parse(stored);
        if (storedEvent.timestamp === message.timestamp) {
          localStorage.removeItem('emailVerificationEvent');
        }
      }
    }, 5000);
  }

  /**
   * Inicia polling para verificar el estado del email
   * Fallback para navegadores que no soportan BroadcastChannel
   */
  startPollingVerification(email: string, intervalMs: number = 3000): () => void {
    console.log('[EmailVerificationSync] Iniciando polling para email:', email);

    const interval = setInterval(() => {
      console.log('[EmailVerificationSync] Verificando estado del email:', email);
      this.emailVerificationService.status(email).subscribe({
        next: (response) => {
          console.log('[EmailVerificationSync] Respuesta del polling:', response);

          // ✅ Verificar correctamente el estado (backend devuelve data.status === 'verified')
          const isVerified = response.verified === true ||
                           response.data?.status === 'verified' ||
                           response.data?.verified === true;

          if (isVerified) {
            console.log('[EmailVerificationSync] ✅ Email verificado! Notificando...');
            this.emailVerified.set({
              email: response.data?.email || response.email || email,
              timestamp: Date.now()
            });
            clearInterval(interval);
          } else {
            console.log('[EmailVerificationSync] Email aún no verificado, continuando polling...');
          }
        },
        error: (err) => {
          console.warn('[EmailVerificationSync] Error verificando estado del email:', err);
        }
      });
    }, intervalMs);

    // Retornar función para detener el polling
    return () => {
      console.log('[EmailVerificationSync] Deteniendo polling');
      clearInterval(interval);
    };
  }

  /**
   * Escucha cambios en localStorage (fallback para navegadores antiguos)
   */
  listenToStorageEvents(): () => void {
    console.log('[EmailVerificationSync] Iniciando listener de localStorage events');

    const handler = (event: StorageEvent) => {
      console.log('[EmailVerificationSync] Storage event recibido:', event.key, event.newValue);
      if (event.key === 'emailVerificationEvent' && event.newValue) {
        try {
          const data = JSON.parse(event.newValue);
          console.log('[EmailVerificationSync] Datos parseados:', data);
          if (data.type === 'EMAIL_VERIFIED') {
            console.log('[EmailVerificationSync] ✅ Email verificado detectado via localStorage:', data.email);
            this.emailVerified.set({
              email: data.email,
              timestamp: data.timestamp
            });
          }
        } catch (error) {
          console.warn('[EmailVerificationSync] Error parseando evento de localStorage:', error);
        }
      }
    };

    window.addEventListener('storage', handler);

    // Retornar función para remover el listener
    return () => {
      console.log('[EmailVerificationSync] Removiendo listener de storage events');
      window.removeEventListener('storage', handler);
    };
  }

  /**
   * Resetea el estado de verificación
   */
  reset(): void {
    this.emailVerified.set(null);
  }

  /**
   * Limpia recursos cuando se destruye el servicio
   */
  destroy(): void {
    if (this.channel) {
      this.channel.close();
      this.channel = null;
    }
  }
}
