import Parchment from 'parchment';
import Quill, { Clipboard, DeltaOperation, DeltaStatic } from 'quill';

const Delta: new () => DeltaStatic = Quill.import('delta');

function customAttributeName(key: string): string {
  return 'data-' + key;
}

const USX_VALUE = '__usx_value';

function getUsxValue<T>(node: HTMLElement): T {
  return node[USX_VALUE];
}

function setUsxValue(node: HTMLElement, value: any): void {
  node[USX_VALUE] = value;
}

interface UsxStyle {
  style?: string;
}

interface Chapter extends UsxStyle {
  number?: number;
  altnumber?: string;
  pubnumber?: string;
}

interface Verse extends UsxStyle {
  number?: string;
  altnumber?: string;
  pubnumber?: string;
}

interface Note extends UsxStyle {
  index?: number;
  caller?: string;
  closed?: string;
  contents?: { ops: DeltaOperation[] };
}

interface Figure extends UsxStyle {
  alt?: string;
  file?: string;
  src?: string;
  size?: string;
  loc?: string;
  copy?: string;
  ref?: string;
  contents?: { ops: DeltaOperation[] };
}

interface Ref {
  loc?: string;
}

interface Unmatched {
  marker?: string;
}

export function registerScripture(): void {
  const QuillClipboard = Quill.import('modules/clipboard') as typeof Clipboard;
  const QuillParchment = Quill.import('parchment') as typeof Parchment;
  const Inline = Quill.import('blots/inline') as typeof Parchment.Inline;
  const Block = Quill.import('blots/block') as typeof Parchment.Block;
  const Scroll = Quill.import('blots/scroll') as typeof Parchment.Scroll;
  const Embed = Quill.import('blots/embed') as typeof Parchment.Embed;
  const BlockEmbed = Quill.import('blots/block/embed') as typeof Parchment.Embed;

  // zero width space
  const ZWSP = '\u200b';
  // non-breaking space
  const NBSP = '\u00A0';

  class VerseEmbed extends Embed {
    static blotName = 'verse';
    static tagName = 'usx-verse';

    static create(value: Verse): Node {
      const node = super.create(value) as HTMLElement;
      // add a ZWSP before the verse number, so that it allows breaking
      node.innerText = ZWSP + NBSP + value.number + NBSP;
      setUsxValue(node, value);
      return node;
    }

    static value(node: HTMLElement): Verse {
      return getUsxValue(node);
    }
  }

  class BlankEmbed extends Embed {
    static blotName = 'blank';
    static tagName = 'usx-blank';

    static create(value: string): Node {
      const node = super.create(value) as HTMLElement;
      node.setAttribute(customAttributeName('type'), value);
      let text: string;
      switch (value) {
        case 'initial':
          text = NBSP;
          break;
        case 'normal':
          text = NBSP.repeat(8);
          break;
      }
      node.innerText = text;
      return node;
    }

    static value(node: HTMLElement): any {
      return node.getAttribute(customAttributeName('type'));
    }
  }

  class CharInline extends Inline {
    static blotName = 'char';
    static tagName = 'usx-char';

    static create(value: UsxStyle): Node {
      const node = super.create(value) as HTMLElement;
      node.setAttribute(customAttributeName('style'), value.style);
      return node;
    }

    static formats(node: HTMLElement): UsxStyle {
      return CharInline.value(node);
    }

    static value(node: HTMLElement): UsxStyle {
      return { style: node.getAttribute(customAttributeName('style')) };
    }

    format(name: string, value: any): void {
      if (name === CharInline.blotName) {
        const usxStyle = value as UsxStyle;
        const elem = this.domNode as HTMLElement;
        elem.setAttribute(customAttributeName('style'), usxStyle.style);
      } else {
        super.format(name, value);
      }
    }
  }

  class RefInline extends Inline {
    static blotName = 'ref';
    static tagName = 'usx-ref';

    static create(value: Ref): Node {
      const node = super.create(value) as HTMLElement;
      node.setAttribute(customAttributeName('loc'), value.loc);
      return node;
    }

    static formats(node: HTMLElement): Ref {
      return RefInline.value(node);
    }

    static value(node: HTMLElement): Ref {
      return { loc: node.getAttribute(customAttributeName('loc')) };
    }

    format(name: string, value: any): void {
      if (name === RefInline.blotName) {
        const ref = value as Ref;
        const elem = this.domNode as HTMLElement;
        elem.setAttribute(customAttributeName('loc'), ref.loc);
      } else {
        super.format(name, value);
      }
    }
  }

  class NoteEmbed extends Embed {
    static blotName = 'note';
    static tagName = 'usx-note';

    static create(value: Note): Node {
      const node = super.create(value) as HTMLElement;
      node.setAttribute(customAttributeName('style'), value.style);
      node.setAttribute(customAttributeName('caller'), value.caller);
      if (value.caller !== '+' && value.caller !== '-') {
        node.innerText = value.caller;
      }
      node.title = value.contents.ops.reduce((text, op) => text + op.insert, '');
      setUsxValue(node, value);
      return node;
    }

    static value(node: HTMLElement): Note {
      return getUsxValue(node);
    }
  }

  class OptBreakEmbed extends Embed {
    static blotName = 'optbreak';
    static tagName = 'usx-optbreak';

    static create(value: UsxStyle): Node {
      const node = super.create(value) as HTMLElement;
      node.innerHTML = '<br>';
      setUsxValue(node, value);
      return node;
    }

    static value(node: HTMLElement): UsxStyle {
      return getUsxValue(node);
    }
  }

  class FigureEmbed extends Embed {
    static blotName = 'figure';
    static tagName = 'usx-figure';

    static create(value: Figure): Node {
      const node = super.create(value) as HTMLElement;
      node.innerHTML = '&#x1f4c8';
      const title: string[] = [];
      if (value.alt != null) {
        title.push(value.alt);
      }
      if (value.file != null) {
        title.push(value.file);
      }
      if (value.src != null) {
        title.push(value.src);
      }
      if (value.size != null) {
        title.push(value.size);
      }
      if (value.loc != null) {
        title.push(value.loc);
      }
      if (value.copy != null) {
        title.push(value.copy);
      }
      if (value.contents != null) {
        title.push(value.contents.ops.reduce((text, op) => text + op.insert, ''));
      }
      if (value.ref != null) {
        title.push(value.ref);
      }
      node.title = title.join('|');
      setUsxValue(node, value);
      return node;
    }

    static value(node: HTMLElement): Figure {
      return getUsxValue(node);
    }
  }

  class UnmatchedEmbed extends Embed {
    static blotName = 'unmatched';
    static tagName = 'usx-unmatched';

    static create(value: Unmatched): Node {
      const node = super.create(value) as HTMLElement;
      node.innerText = value.marker;
      setUsxValue(node, value);
      return node;
    }

    static value(node: HTMLElement): Unmatched {
      return getUsxValue(node);
    }
  }

  class ParaBlock extends Block {
    static blotName = 'para';
    static tagName = 'usx-para';

    static create(value: UsxStyle): Node {
      const node = super.create(value) as HTMLElement;
      node.setAttribute(customAttributeName('style'), value.style);
      return node;
    }

    static formats(node: HTMLElement): UsxStyle {
      return ParaBlock.value(node);
    }

    static value(node: HTMLElement): UsxStyle {
      return { style: node.getAttribute(customAttributeName('style')) };
    }

    format(name: string, value: any): void {
      if (name === ParaBlock.blotName) {
        const usxStyle = value as UsxStyle;
        const elem = this.domNode as HTMLElement;
        elem.setAttribute(customAttributeName('style'), usxStyle.style);
      } else {
        super.format(name, value);
      }
    }
  }

  class ParaInline extends Inline {
    static blotName = 'para-contents';
    static tagName = 'usx-para-contents';

    static value(_node: HTMLElement): boolean {
      return true;
    }

    static formats(node: HTMLElement): boolean {
      return ParaInline.value(node);
    }

    formatAt(index: number, length: number, name: string, value: any): void {
      if (name === ParaInline.blotName) {
        super.formatAt(index, length, name, value);
      } else {
        this.children.forEachAt(index, length, (child, offset, len) => {
          child.formatAt(offset, len, name, value);
        });
      }
    }
  }

  class SegmentInline extends Inline {
    static blotName = 'segment';
    static tagName = 'usx-segment';

    static create(value: string): Node {
      const node = super.create(value) as HTMLElement;
      node.setAttribute(customAttributeName('segment'), value);
      return node;
    }

    static formats(node: HTMLElement): string {
      return SegmentInline.value(node);
    }

    static value(node: HTMLElement): string {
      return node.getAttribute(customAttributeName('segment'));
    }

    format(name: string, value: any): void {
      if (name === SegmentInline.blotName) {
        const ref = value as string;
        const elem = this.domNode as HTMLElement;
        elem.setAttribute(customAttributeName('segment'), ref);
      } else {
        super.format(name, value);
      }
    }
  }

  ParaBlock.allowedChildren.push(ParaInline);
  ParaBlock.allowedChildren.push(VerseEmbed);
  ParaBlock.allowedChildren.push(BlankEmbed);
  ParaBlock.allowedChildren.push(NoteEmbed);
  ParaBlock.allowedChildren.push(OptBreakEmbed);
  ParaBlock.allowedChildren.push(FigureEmbed);
  ParaBlock.allowedChildren.push(UnmatchedEmbed);
  ParaBlock.allowedChildren.push(SegmentInline);
  (Inline as any).order.push('segment');
  (Inline as any).order.push('para-contents');

  class ChapterEmbed extends BlockEmbed {
    static blotName = 'chapter';
    static tagName = 'usx-chapter';

    static create(value: Chapter): Node {
      const node = super.create(value) as HTMLElement;
      node.innerText = value.number.toString();
      node.contentEditable = 'false';
      setUsxValue(node, value);
      return node;
    }

    static value(node: HTMLElement): Chapter {
      return getUsxValue(node);
    }
  }

  Scroll.allowedChildren.push(ParaBlock);
  Scroll.allowedChildren.push(ChapterEmbed);

  const HighlightSegmentClass = new QuillParchment.Attributor.Class('highlight-segment', 'highlight-segment', {
    scope: Parchment.Scope.INLINE
  });

  const HighlightParaClass = new QuillParchment.Attributor.Class('highlight-para', 'highlight-para', {
    scope: Parchment.Scope.BLOCK
  });

  const CheckingQuestionData = new QuillParchment.Attributor.Attribute('data-question', 'data-question', {
    scope: Parchment.Scope.INLINE
  });

  const CheckingSelectedData = new QuillParchment.Attributor.Attribute('data-selected', 'data-selected', {
    scope: Parchment.Scope.INLINE
  });

  class DisableHtmlClipboard extends QuillClipboard {
    onPaste(e: ClipboardEvent): void {
      if (e.defaultPrevented || !this.quill.isEnabled()) {
        return;
      }
      const range = this.quill.getSelection();
      let delta = new Delta().retain(range.index);
      const scrollTop = this.quill.scrollingContainer.scrollTop;
      this.container.focus();
      this.quill.selection.update('silent');

      let text = e.clipboardData.getData('text/plain');
      // do not allow pasting new lines
      text = text.replace(/(?:\r?\n)+/, ' ');
      setTimeout(() => {
        this.container.innerHTML = text;
        delta = delta.concat(this.convert()).delete(range.length);
        this.quill.updateContents(delta, 'user');
        // range.length contributes to delta.length()
        this.quill.setSelection(delta.length() - range.length, 'silent');
        this.quill.scrollingContainer.scrollTop = scrollTop;
        this.quill.focus();
      }, 1);
    }
  }

  Quill.register('attributors/class/highlight-segment', HighlightSegmentClass);
  Quill.register('formats/highlight-segment', HighlightSegmentClass);
  Quill.register('attributors/class/highlight-para', HighlightParaClass);
  Quill.register('formats/highlight-para', HighlightParaClass);
  Quill.register('formats/data-question', CheckingQuestionData);
  Quill.register('formats/data-selected', CheckingSelectedData);
  Quill.register('blots/verse', VerseEmbed);
  Quill.register('blots/blank', BlankEmbed);
  Quill.register('blots/note', NoteEmbed);
  Quill.register('blots/char', CharInline);
  Quill.register('blots/ref', RefInline);
  Quill.register('blots/para', ParaBlock);
  Quill.register('blots/para-contents', ParaInline);
  Quill.register('blots/segment', SegmentInline);
  Quill.register('blots/chapter', ChapterEmbed);
  Quill.register('blots/figure', FigureEmbed);
  Quill.register('blots/optbreak', OptBreakEmbed);
  Quill.register('blots/unmatched', UnmatchedEmbed);
  Quill.register('blots/scroll', Scroll, true);
  Quill.register('modules/clipboard', DisableHtmlClipboard, true);
}
