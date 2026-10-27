import { fireEvent, render, screen } from '@testing-library/svelte';
import { afterEach, expect, test, vi } from 'vitest';
import UpdatePrompt from '../src/components/UpdatePrompt.svelte';
import { appUpdate } from '../src/lib/appUpdate.svelte.js';

afterEach(() => (appUpdate.ready = false));

test('hidden until a new version is waiting', () => {
  render(UpdatePrompt);
  expect(screen.queryByText(/New version/)).toBeNull();
});

test('Reload applies the update', async () => {
  appUpdate.ready = true;
  appUpdate.apply = vi.fn();
  render(UpdatePrompt);
  await fireEvent.click(screen.getByRole('button', { name: 'Reload' }));
  expect(appUpdate.apply).toHaveBeenCalled();
});

test('can be dismissed', async () => {
  appUpdate.ready = true;
  render(UpdatePrompt);
  await fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
  expect(screen.queryByText(/New version/)).toBeNull();
});
