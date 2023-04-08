import { NodeView, Editor } from '@tiptap/core';
import type { NodeViewRenderer, NodeViewProps, NodeViewRendererOptions } from '@tiptap/core';
import type { Decoration } from 'prosemirror-view';
import type { Node as ProseMirrorNode } from 'prosemirror-model';
import type { SvelteComponent } from 'svelte';

import SvelteRenderer from './SvelteRenderer';
import { TIPTAP_NODE_VIEW } from './context';

export interface SvelteNodeViewRendererOptions extends NodeViewRendererOptions {
  update: ((node: ProseMirrorNode, decorations: Decoration[]) => boolean) | null;
  as?: string;
}

type SvelteComponentRaw = typeof SvelteComponent;

class SvelteNodeView extends NodeView<SvelteComponentRaw, Editor, SvelteNodeViewRendererOptions> {
  renderer!: SvelteRenderer;

  contentDOMElement!: HTMLElement | null;

  override mount(): void {
    const Component = this.component;

    const props: NodeViewProps = {
      editor: this.editor,
      node: this.node,
      decorations: this.decorations,
      selected: false,
      extension: this.extension,
      getPos: () => this.getPos(),
      updateAttributes: (attributes = {}) => this.updateAttributes(attributes),
      deleteNode: () => this.deleteNode(),
    };

    this.contentDOMElement = this.node.isLeaf
      ? null
      : document.createElement(this.node.isInline ? 'span' : 'div');

    if (this.contentDOMElement) {
      // For some reason the whiteSpace prop is not inherited properly in Chrome and Safari
      // With this fix it seems to work fine
      // See: https://github.com/ueberdosis/tiptap/issues/1197
      this.contentDOMElement.style.whiteSpace = 'inherit';
    }

    const context = new Map();
    context.set(TIPTAP_NODE_VIEW, {
      onDragStart: this.onDragStart.bind(this),
    });

    const as = this.options.as ?? (this.node.isInline ? 'span' : 'div');
    const target = document.createElement(as);
    target.classList.add(`node-${this.node.type.name}`);

    const svelteComponent: SvelteComponent = new Component({
      target,
      props,
      context,
    });

    this.renderer = new SvelteRenderer(svelteComponent, {
      element: target,
    });
  }

  override get dom() {
    if (!this.renderer.dom.firstElementChild?.hasAttribute('data-node-view-wrapper')) {
      throw Error('Please use the NodeViewWrapper component for your node view.');
    }

    return this.renderer.dom;
  }

  override get contentDOM() {
    if (this.node.isLeaf) {
      return null;
    }

    this.maybeMoveContentDOM();

    return this.contentDOMElement;
  }

  maybeMoveContentDOM(): void {
    const contentElement = this.dom.querySelector('[data-node-view-content]');

    if (this.contentDOMElement && contentElement && !contentElement.contains(this.contentDOMElement)) {
      contentElement.appendChild(this.contentDOMElement);
    }
  }

  update(node: ProseMirrorNode, decorations: Decoration[]): boolean {
    if (typeof this.options.update === 'function') {
      return this.options.update(node, decorations);
    }

    if (node.type !== this.node.type) {
      return false;
    }

    if (node === this.node && this.decorations === decorations) {
      return true;
    }

    this.node = node;
    this.decorations = decorations;
    this.renderer.updateProps({ node, decorations });
    this.maybeMoveContentDOM();

    return true;
  }

  selectNode(): void {
    this.renderer.updateProps({ selected: true });
  }

  deselectNode(): void {
    this.renderer.updateProps({ selected: false });
  }

  destroy(): void {
    this.renderer.destroy();
    this.contentDOMElement = null;
  }
}

const SvelteNodeViewRenderer = (
  component: SvelteComponentRaw,
  options?: Partial<SvelteNodeViewRendererOptions>,
): NodeViewRenderer => {
  return (props): SvelteNodeView => new SvelteNodeView(component, props, options);
};

export default SvelteNodeViewRenderer;
