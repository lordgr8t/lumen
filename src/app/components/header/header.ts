import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

export type EditorMode = 'edit' | 'preview' | 'split';

@Component({
  selector: 'app-header',
  imports: [ReactiveFormsModule],
  templateUrl: './header.html',
  styleUrl: './header.less',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:keydown.escape)': 'closeOverlays()',
  },
})
export class Header {
  readonly mode = input<EditorMode>('edit');
  readonly modeChange = output<EditorMode>();
  readonly deleteArticle = output<void>();
  readonly logout = output<void>();
  readonly modes: { value: EditorMode; label: string }[] = [
    { value: 'edit', label: 'Edit' },
    { value: 'preview', label: 'Preview' },
    // { value: 'split', label: 'Split' },
  ];
  readonly activeMenu = signal<'more' | 'profile' | null>(null);
  readonly activeDialog = signal<'settings' | 'delete' | null>(null);
  readonly displayName = signal('Иван');
  readonly avatarInitial = computed(() => this.displayName().trim().charAt(0).toUpperCase() || 'И');
  readonly settingsForm = new FormGroup({
    name: new FormControl(this.displayName(), {
      nonNullable: true,
      validators: [Validators.required],
    }),
    email: new FormControl('ivan@example.com', {
      nonNullable: true,
      validators: [Validators.required, Validators.email],
    }),
    password: new FormControl('', {
      nonNullable: true,
      validators: [Validators.minLength(8)],
    }),
  });

  selectMode(mode: EditorMode): void {
    this.modeChange.emit(mode);
  }

  toggleMenu(menu: 'more' | 'profile'): void {
    this.activeMenu.update((activeMenu) => activeMenu === menu ? null : menu);
  }

  openSettings(): void {
    this.activeMenu.set(null);
    this.settingsForm.patchValue({ name: this.displayName(), password: '' });
    this.activeDialog.set('settings');
  }

  closeOverlays(): void {
    this.activeMenu.set(null);
    this.activeDialog.set(null);
  }

  saveSettings(): void {
    if (this.settingsForm.invalid) {
      this.settingsForm.markAllAsTouched();
      return;
    }

    this.displayName.set(this.settingsForm.controls.name.value.trim());
    this.settingsForm.controls.password.reset('');
    this.activeDialog.set(null);
  }

  requestDelete(): void {
    this.activeMenu.set(null);
    this.activeDialog.set('delete');
  }

  confirmDelete(): void {
    this.activeDialog.set(null);
    this.deleteArticle.emit();
  }
}
