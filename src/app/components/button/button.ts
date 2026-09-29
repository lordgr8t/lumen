import { Component, input } from '@angular/core';

@Component({
  selector: 'app-button',
  imports: [],
  templateUrl: './button.html',
  styleUrl: './button.less',
})
export class Button {
  readonly buttonType = input<'add-folder' | 'add-article'>('add-folder', { alias: 'type' });
}
