// src/app/pages/error/forbidden/forbidden.component.ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-forbidden',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="error-container">
      <div class="error-content">
        <div class="error-code">403</div>
        <h1>Acceso Denegado</h1>
        <p class="error-message">
          No tienes permisos para acceder a esta página.
        </p>
        <div class="actions">
          <a routerLink="/" class="btn btn-primary">Volver al inicio</a>
          <a routerLink="/account" class="btn btn-secondary">Ver mi cuenta</a>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .error-container {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 80vh;
      padding: 2rem;
      text-align: center;
    }

    .error-content {
      max-width: 500px;
    }

    .error-code {
      font-size: 6rem;
      font-weight: 700;
      color: var(--accent);
      line-height: 1;
      margin-bottom: 1rem;
    }

    h1 {
      font-size: 2rem;
      margin: 0 0 1rem 0;
      color: var(--text);
    }

    .error-message {
      color: var(--muted);
      font-size: 1.125rem;
      line-height: 1.6;
      margin-bottom: 2rem;
    }

    .actions {
      display: flex;
      gap: 1rem;
      justify-content: center;
    }

    .btn {
      padding: 0.75rem 1.5rem;
      border-radius: 8px;
      border: none;
      cursor: pointer;
      font-weight: 600;
      text-decoration: none;
      transition: all 0.2s;
      display: inline-block;
    }

    .btn-primary {
      background: var(--accent);
      color: white;
    }

    .btn-secondary {
      background: transparent;
      border: 1px solid var(--border);
      color: var(--text);
    }

    .btn:hover {
      transform: translateY(-2px);
      opacity: 0.9;
    }
  `]
})
export class ForbiddenComponent {}