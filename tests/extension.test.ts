import { it, expect } from 'vitest';
import { render, act, fireEvent } from '@testing-library/svelte';
import { mergeAttributes, Node } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';

import { Editor, EditorContent, SvelteNodeViewRenderer } from '$lib';
import CounterComponent from '../src/routes/_components/Counter.svelte';
import EditableComponent from '../src/routes/_components/Editable.svelte';

it('should render the counter component', async () => {
  const SvelteCounterExtension = Node.create({
    name: 'svelteCounterComponent',
    group: 'block',
    atom: true,
    draggable: true,
    inline: false,

    addAttributes() {
      return {
        count: {
          default: 0,
        },
      };
    },

    parseHTML() {
      return [{ tag: 'svelte-counter-component' }];
    },

    renderHTML({ HTMLAttributes }) {
      return ['svelte-counter-component', mergeAttributes(HTMLAttributes)];
    },

    addNodeView() {
      return SvelteNodeViewRenderer(CounterComponent);
    },
  });

  const editor = new Editor({
    content: '<svelte-counter-component count="1"></svelte-counter-component>',
    extensions: [StarterKit, SvelteCounterExtension],
  });

  const { getByText, getByTestId } = render(EditorContent, { editor });
  await act();

  const wrapper = getByTestId('svelte-component');
  await fireEvent.click(wrapper);
  await act();

  expect(wrapper.classList.contains('selected')).toBe(true);

  expect(getByText('Svelte Component')).toBeTruthy();
  expect(getByText('This button has been clicked 1 times.')).toBeTruthy();

  const button = getByTestId('counter-button');

  // Using await when firing events is unique to the svelte testing library because
  // we have to wait for the next `tick` so that Svelte flushes all pending state changes.
  await fireEvent.click(button);
  await act();

  expect(getByText('This button has been clicked 2 times.')).toBeTruthy();

  expect(editor.getHTML()).toContain('<svelte-counter-component count="2"></svelte-counter-component>');
});

it('should render the editable component', async () => {
  const SvelteEditableExtension = Node.create({
    name: 'svelteEditableComponent',
    group: 'block',
    content: 'inline*',

    parseHTML() {
      return [{ tag: 'svelte-editable-component' }];
    },

    renderHTML({ HTMLAttributes }) {
      return ['svelte-editable-component', mergeAttributes(HTMLAttributes), 0];
    },

    addNodeView() {
      return SvelteNodeViewRenderer(EditableComponent);
    },
  });

  const editor = new Editor({
    content: '<svelte-editable-component>This text is editable</svelte-editable-component>',
    extensions: [StarterKit, SvelteEditableExtension],
  });

  const { getByText, getByTestId } = render(EditorContent, { editor });

  await act();
  expect(getByText('Svelte Editable Component')).toBeTruthy();
  expect(getByTestId('editable-component')).toBeTruthy();
});
