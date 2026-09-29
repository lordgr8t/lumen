import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { NavMenu } from '@components/nav-menu/nav-menu';
import { Header } from '@components/header/header';
import { EditorWrapper } from '@components/editor-wrapper/editor-wrapper';
import { type EditorMode } from '@components/header/header';

@Component({
  selector: 'app-home',
  imports: [NavMenu, Header, EditorWrapper],
  templateUrl: './home.html',
  styleUrl: './home.less',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Home {
  private readonly router = inject(Router);

  readonly editorMode = signal<EditorMode>('edit');
  readonly articleDeleted = signal(false);
  readonly deletedItems = signal<ReadonlySet<string>>(new Set());

  setEditorMode(mode: EditorMode): void {
    this.editorMode.set(mode);
  }

  deleteArticle(): void {
    this.articleDeleted.set(true);
    this.deletedItems.update((items) => new Set([...items, 'Rust API Guide']));
  }

  restoreArticle(): void {
    this.articleDeleted.set(false);
    this.deletedItems.update((items) => {
      const restoredItems = new Set(items);
      restoredItems.delete('Rust API Guide');
      return restoredItems;
    });
  }

  logout(): void {
    void this.router.navigateByUrl('/auth');
  }
}
