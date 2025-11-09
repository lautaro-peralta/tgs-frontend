import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

type TeamItem = { name: string; roleKey: string };

@Component({
  standalone: true,
  selector: 'app-about',
  imports: [CommonModule, TranslateModule],
  templateUrl: './about.html',
  styleUrls: ['./about.scss'],
})
export class AboutComponent {
  // Claves de valores para iterar
  valueKeys = ['transparency', 'quality', 'velocity', 'proximity', 'learning', 'purpose'];

  // Equipo con claves de roles
  team: TeamItem[] = [
    { name: 'Lautaro Peralta', roleKey: 'backend' },
    { name: 'Tomas Splivalo', roleKey: 'frontend' },
    { name: 'Luca Delprato', roleKey: 'testing' },
  ];

  private t = inject(TranslateService);

  // Iniciales para avatar fallback
  initials(name: string) {
    return name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map(n => n[0]?.toUpperCase())
      .join('');
  }
}