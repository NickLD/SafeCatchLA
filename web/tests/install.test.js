import { fireEvent, render, screen } from '@testing-library/svelte';
import { afterEach, expect, test, vi } from 'vitest';
import InstallButton from '../src/components/InstallButton.svelte';

const realUA = navigator.userAgent;
afterEach(() => Object.defineProperty(navigator, 'userAgent', { value: realUA, configurable: true }));

test('hidden until the browser offers installation, then prompts', async () => {
  render(InstallButton);
  expect(screen.queryByRole('button', { name: /Install/ })).toBeNull();
  const prompt = vi.fn(async () => {});
  const ev = new Event('beforeinstallprompt');
  ev.prompt = prompt;
  ev.userChoice = Promise.resolve({ outcome: 'accepted' });
  window.dispatchEvent(ev);
  await fireEvent.click(await screen.findByRole('button', { name: /Install/ }));
  expect(prompt).toHaveBeenCalled();
});

test('on iPhone Safari it explains Add to Home Screen', async () => {
  Object.defineProperty(navigator, 'userAgent', {
    value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1',
    configurable: true,
  });
  render(InstallButton);
  await fireEvent.click(screen.getByRole('button', { name: /Install/ }));
  expect(screen.getByText(/Add to Home Screen/)).toBeTruthy();
});
