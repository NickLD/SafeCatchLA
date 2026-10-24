import { render, screen } from '@testing-library/svelte';
import { expect, test } from 'vitest';
import Legend from '../src/components/Legend.svelte';
import { app } from '../src/lib/state.svelte.js';

test('legend names the contaminant and sample type', () => {
  Object.assign(app, { color: 'avg', filter: 'LARGEMOUTH BASS', range: null, meta: null });
  render(Legend);
  expect(screen.getByText('Average Concentration Over Time (ppm)')).toBeTruthy();
  expect(screen.getByText(/Mercury in fish tissue · Largemouth Bass/)).toBeTruthy();
});
