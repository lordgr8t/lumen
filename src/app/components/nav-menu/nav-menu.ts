import { Component, input, signal } from '@angular/core';
import { Button } from '@components/button/button';

@Component({
  selector: 'app-nav-menu',
  imports: [Button],
  templateUrl: './nav-menu.html',
  styleUrl: './nav-menu.less',
})
export class NavMenu {
  readonly hiddenItems = input<ReadonlySet<string>>(new Set());
  readonly sections = [
    {
      name: 'ENGINEERING',
      items: ['System Architecture', 'Rust API Guide', 'Deploy Pipeline'],
    },
    {
      name: 'DESIGN',
      items: ['Noted Design System', 'iOS Widget Spacing'],
    },
    {
      name: 'PERSONAL',
      items: [],
    },
  ];

  readonly selectedItem = signal('Rust API Guide');
  readonly expandedSections = signal(new Set(['ENGINEERING', 'DESIGN']));

  isExpanded(sectionName: string): boolean {
    return this.expandedSections().has(sectionName);
  }

  toggleSection(sectionName: string): void {
    this.expandedSections.update((expanded) => {
      const nextExpanded = new Set(expanded);
      if (nextExpanded.has(sectionName)) {
        nextExpanded.delete(sectionName);
      } else {
        nextExpanded.add(sectionName);
      }
      return nextExpanded;
    });
  }

  selectItem(item: string): void {
    this.selectedItem.set(item);
  }
}
