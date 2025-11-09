import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

@Component({
  standalone: true,
  selector: 'app-contact',
  imports: [CommonModule, TranslateModule],
  templateUrl: './contact.html',
  styleUrls: ['./contact.scss'],
})
export class ContactComponent {
  // Claves de canales
  channelKeys = ['email', 'phone', 'whatsapp'];

  // Iconos de canales
  channelIcons: Record<string, string> = {
    email: 'https://cdn.simpleicons.org/gmail/EA4335',
    phone: 'https://api.iconify.design/heroicons:phone-solid.svg?color=%234285F4',
    whatsapp: 'https://cdn.simpleicons.org/whatsapp/25D366',
  };

  // Claves de horarios
  hourKeys = ['support', 'commercial'];

  // Mapa de Google
  mapHref = 'https://maps.app.goo.gl/us7wsEg9MFs9cfky7';
  mapIcon = 'https://cdn.simpleicons.org/googlemaps/4285F4';

  // Claves de enlaces útiles
  linkKeys = ['github', 'utn', 'techSupport'];

  // URLs de enlaces
  linkHrefs: Record<string, string> = {
    github: 'https://github.com/lautaro-peralta/TP-Desarrollo-de-Software',
    utn: 'https://www.frro.utn.edu.ar/',
    techSupport: 'mailto:thegarrisonsystem@gmail.com',
  };

  // Iconos de enlaces
  linkIcons: Record<string, string> = {
    github: 'https://cdn.simpleicons.org/github/FFFFFF',
    utn: 'https://cdn.simpleicons.org/educative/0052CC',
    techSupport: 'https://cdn.simpleicons.org/gmail/EA4335',
  };

  private t = inject(TranslateService);

  // Método auxiliar para generar hrefs dinámicos de canales
  getChannelHref(key: string): string {
    const hrefs: Record<string, string> = {
      email: 'mailto:thegarrisonsystem@gmail.com',
      phone: 'tel:+543415551234',
      whatsapp: 'https://wa.me/5493415551234',
    };
    return hrefs[key] || '#';
  }
}