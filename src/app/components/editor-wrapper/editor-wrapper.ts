import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, input, output, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { BreadCrumbs } from '@components/bread-crumbs/bread-crumbs';
import { type EditorMode } from '@components/header/header';
import {
  provideTuiEditor,
  TUI_EDITOR_DEFAULT_TOOLS,
  TuiEditor,
} from '@taiga-ui/editor';
import { CodeBlockLowlight } from '@tiptap/extension-code-block-lowlight';
import { type Editor } from '@tiptap/core';
import { createLowlight } from 'lowlight';
import { debounceTime, merge, tap } from 'rxjs';
import { TuiDropdown } from '@taiga-ui/core';

type ArticleDraft = {
  title: string;
  content: string;
};

function isArticleDraft(value: unknown): value is ArticleDraft {
  return typeof value === 'object' && value !== null &&
    'title' in value && typeof value.title === 'string' &&
    'content' in value && typeof value.content === 'string';
}

const articleHtml = `
  <p>This document outlines the core architectural paradigms for high-throughput Rust-based API servers. We prioritize zero-cost abstractions, strict ownership tracking, and narrowly scoped technical decisions that preserve stability.</p>
  <h2>1. Core Architectural Pillars</h2>
  <ul>
    <li><strong>Strict Type Safety:</strong> Eliminate invalid system states entirely at compile time using advanced type-state patterns.</li>
    <li><strong>Asynchronous Runtime:</strong> Standardize exclusively on Tokio for non-blocking I/O threads and tasks.</li>
    <li><strong>Memory Management:</strong> Avoid static lifetimes where dynamically scoped references can be validated by the borrow checker.</li>
  </ul>
  <h2>2. Code Example: Custom Async Web Middleware</h2>
  <pre><code class=\\\"language-rust\\\">pub async fn middleware_handler(\\\\
    State(state): State<AppState>,\\\\
    request: Request,\\\\
    next: Next,\\\\
) -> Result<Response, ApiError> {\\\\
    let user = state.auth.verify(request.headers()).await?;\\\\
    let response = next.run(request).await;\\\\
    Ok(response)\\\\
}</code></pre>
`;

@Component({
  selector: 'app-editor-wrapper',
  imports: [BreadCrumbs, ReactiveFormsModule, TuiEditor, TuiDropdown],
  templateUrl: './editor-wrapper.html',
  styleUrl: './editor-wrapper.less',
  providers: [
    provideTuiEditor({ codeBlock: false }, async () => {
      const [
        { default: bash },
        { default: css },
        { default: javascript },
        { default: json },
        { default: plaintext },
        { default: rust },
        { default: typescript },
        { default: xml },
      ] = await Promise.all([
        import('highlight.js/lib/languages/bash'),
        import('highlight.js/lib/languages/css'),
        import('highlight.js/lib/languages/javascript'),
        import('highlight.js/lib/languages/json'),
        import('highlight.js/lib/languages/plaintext'),
        import('highlight.js/lib/languages/rust'),
        import('highlight.js/lib/languages/typescript'),
        import('highlight.js/lib/languages/xml'),
      ]);
      const lowlight = createLowlight({ bash, css, javascript, json, plaintext, rust, typescript, xml });
      lowlight.registerAlias({ xml: ['html'] });

      return CodeBlockLowlight.configure({
        lowlight,
        defaultLanguage: 'plaintext',
      });
    }),
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EditorWrapper {
  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);
  private readonly draftKey = 'lumen.article.rust-api-guide';

  readonly mode = input<EditorMode>('edit');
  readonly deleted = input(false);
  readonly restoreArticle = output<void>();
  readonly tools = TUI_EDITOR_DEFAULT_TOOLS;
  readonly content = new FormControl(articleHtml, { nonNullable: true });
  readonly title = new FormControl('Rust API Guide & Design Decisions', { nonNullable: true });
  readonly saveState = signal<'saved' | 'pending' | 'saving' | 'error'>('saved');
  readonly editorComponent = viewChild(TuiEditor);
  readonly codeBlockAvailable = signal(false);
  readonly codeLanguage = signal('plaintext');
  readonly codeLanguageMenuOpen = signal(false);
  readonly codeLanguages = [
    { value: 'plaintext', label: 'Plain text' },
    { value: 'javascript', label: 'JavaScript' },
    { value: 'typescript', label: 'TypeScript' },
    { value: 'html', label: 'HTML' },
    { value: 'css', label: 'CSS' },
    { value: 'json', label: 'JSON' },
    { value: 'bash', label: 'Bash' },
    { value: 'rust', label: 'Rust' },
  ];
  private connectedEditor: Editor | null = null;
  private readonly selectionUpdate = (): void => this.syncCodeLanguage();

  constructor() {
    this.restoreDraft();
    this.syncCodeLanguageFromHtml(this.content.value);

    this.content.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((content) => this.syncCodeLanguageFromHtml(content));

    merge(this.title.valueChanges, this.content.valueChanges)
      .pipe(
        tap(() => this.saveState.set('pending')),
        debounceTime(700),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => this.saveDraft());
  }

  syncCodeLanguage(): void {
    const editor = this.editorComponent()?.editor?.getOriginTiptapEditor();
    if (!editor) return;

    const isCodeBlockActive = editor.isActive('codeBlock');
    const position = isCodeBlockActive
      ? editor.state.selection.$from.before(editor.state.selection.$from.depth)
      : this.findFirstCodeBlockPosition(editor);
    this.codeBlockAvailable.set(position !== null);
    if (position === null) {
      this.codeLanguage.set('plaintext');
      return;
    }

    const language = editor.state.doc.nodeAt(position)?.attrs['language'];
    this.codeLanguage.set(typeof language === 'string' ? language : 'plaintext');
  }

  connectCodeSelection(): void {
    const editor = this.editorComponent()?.editor?.getOriginTiptapEditor();
    if (!editor || this.connectedEditor === editor) return;

    this.connectedEditor = editor;
    editor.on('selectionUpdate', this.selectionUpdate);
    this.destroyRef.onDestroy(() => editor.off('selectionUpdate', this.selectionUpdate));
    this.syncCodeLanguage();
  }

  setCodeLanguage(language: string): void {
    const editor = this.editorComponent()?.editor?.getOriginTiptapEditor();
    if (!editor) return;

    const isCodeBlockActive = editor.isActive('codeBlock');
    const position = isCodeBlockActive
      ? editor.state.selection.$from.before(editor.state.selection.$from.depth)
      : this.findFirstCodeBlockPosition(editor);
    if (position === null) return;

    const chain = editor.chain().focus();
    if (!isCodeBlockActive) chain.setTextSelection(position + 1);
    chain.updateAttributes('codeBlock', { language }).run();
    this.codeLanguage.set(language);
  }

  languageLabel(): string {
    return this.codeLanguages.find(({ value }) => value === this.codeLanguage())?.label ?? 'Plain text';
  }

  private findFirstCodeBlockPosition(editor: Editor): number | null {
    let position: number | null = null;
    editor.state.doc.descendants((node, nodePosition) => {
      if (position === null && node.type.name === 'codeBlock') position = nodePosition;
    });
    return position;
  }

  private syncCodeLanguageFromHtml(content: string): void {
    const template = this.document.createElement('template');
    template.innerHTML = content;
    const codeBlock = template.content.querySelector('pre > code');
    this.codeBlockAvailable.set(codeBlock !== null);

    if (!codeBlock) {
      this.codeLanguage.set('plaintext');
      return;
    }

    const languageClass = Array.from(codeBlock.classList)
      .find((className) => className.startsWith('language-'));
    this.codeLanguage.set(languageClass?.slice('language-'.length) ?? 'plaintext');
  }

  private restoreDraft(): void {
    try {
      const stored = this.document.defaultView?.localStorage.getItem(this.draftKey);
      if (!stored) return;

      const draft: unknown = JSON.parse(stored);
      if (!isArticleDraft(draft)) return;

      this.title.setValue(draft.title, { emitEvent: false });
      this.content.setValue(draft.content, { emitEvent: false });
    } catch {
      this.saveState.set('error');
    }
  }

  private saveDraft(): void {
    this.saveState.set('saving');

    try {
      const storage = this.document.defaultView?.localStorage;
      if (!storage) throw new Error('Browser storage is unavailable');

      storage.setItem(this.draftKey, JSON.stringify({
        title: this.title.value,
        content: this.content.value,
      } satisfies ArticleDraft));
      this.saveState.set('saved');
    } catch {
      this.saveState.set('error');
    }
  }
}