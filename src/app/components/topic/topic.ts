import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators, FormGroup, FormControl } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { TopicService } from '../../services/topic/topic';
import { TopicDTO, CreateTopicDTO, UpdateTopicDTO } from '../../models/topic/topic.model';

/**
 * TopicComponent
 *
 * CRUD simple de temáticas con filtro por texto. Usa signals para estado,
 * formularios reactivos para validación y i18n para errores.
 */

type TopicForm = { id: FormControl<number | null>; description: FormControl<string>; };

@Component({
  selector: 'app-topic',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, TranslateModule],
  templateUrl: './topic.html',
  styleUrls: ['./topic.scss'],
})
export class TopicComponent implements OnInit {
  // --- Inyección ---
  private fb = inject(FormBuilder);
  private srv = inject(TopicService);
  private t = inject(TranslateService);

  // --- Estado ---
  topics = signal<TopicDTO[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);

  // --- Filtro de búsqueda ---
  filterTextInput = signal('');
  filterTextApplied = signal('');
  isEdit = signal(false); // true si editamos una temática existente

  // ✅ UI: abrir/cerrar formulario
  isFormOpen = false;

  // --- Form reactivo ---
  form: FormGroup<TopicForm> = this.fb.group<TopicForm>({
    id: this.fb.control<number | null>(null),
    description: this.fb.nonNullable.control('', { validators: [Validators.required, Validators.minLength(1)] }),
  });

  // --- Ciclo de vida ---
  ngOnInit(): void { this.load(); }

  // --- Listado filtrado ---
  filtered = computed(() => {
    const q = this.filterTextApplied().toLowerCase().trim();
    if (!q) return this.topics();
    return this.topics().filter(t =>
      (t.description || '').toLowerCase().includes(q) ||
      String(t.id ?? '').includes(q)
    );
  });

  applyFilters() {
  this.filterTextApplied.set(this.filterTextInput());
  }

  totalTopics = computed(() => this.topics().length);

  clearFilters() {
    this.filterTextInput.set('');
    this.filterTextApplied.set('');
  }

  // --- Data fetching ---
  load() {
    this.loading.set(true);
    this.error.set(null);
    this.srv.getAll().subscribe({
      next: (list: TopicDTO[]) => { this.topics.set(list); this.loading.set(false); },
      error: (err) => { this.error.set(err?.error?.message || this.t.instant('topics.errorLoad')); this.loading.set(false); }
    });
  }

  // ✅ Toggle formulario
  toggleForm() {
    if (this.isFormOpen) {
      this.cancel();
      return;
    }
    this.new();
    this.isFormOpen = true;
  }

  // ?o. Cancelar y cerrar
  cancel() {
    this.isFormOpen = false;
    this.new();
    this.error.set(null);
  }

  // --- Crear / Editar ---
  new() {
    this.isEdit.set(false);
    this.form.reset({ id: null, description: '' });
    this.error.set(null);
  }

  edit(t: TopicDTO) {
    this.isEdit.set(true);
    this.form.setValue({ id: t.id ?? null, description: t.description ?? '' });
    this.error.set(null);
    this.isFormOpen = true; // ✅ Abrir formulario al editar
  }

  // --- Borrado ---
  delete(id: number) {
    if (!confirm(this.t.instant('topics.confirmDelete') || '¿Eliminar temática?')) {
      return;
    }

    this.loading.set(true);
    this.error.set(null);
    this.srv.delete(id).subscribe({
      next: () => this.load(),
      error: (err) => { this.error.set(err?.error?.message || this.t.instant('topics.errorDelete')); this.loading.set(false); }
    });
  }

  // --- Builders de payload ---
  private buildCreate(): CreateTopicDTO { return { description: String(this.form.getRawValue().description).trim() }; }
  private buildUpdate(): UpdateTopicDTO { return { description: String(this.form.getRawValue().description).trim() }; }

  // --- Guardado ---
  save() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.error.set(this.t.instant('topics.form.err.fill'));
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    const id = this.form.controls.id.value;

    if (!id) {
      const payload = this.buildCreate();
      this.srv.create(payload).subscribe({
        next: () => { 
          this.cancel(); 
          this.load(); 
        },
        error: (err) => { this.error.set(err?.error?.message || this.t.instant('topics.errorCreate')); this.loading.set(false); }
      });
      return;
    }

    const payload = this.buildUpdate();
    this.srv.update(id, payload).subscribe({
      next: () => { 
          this.cancel(); 
          this.load(); 
        },
      error: (err) => { this.error.set(err?.error?.message || this.t.instant('topics.errorSave')); this.loading.set(false); }
    });
  }
}