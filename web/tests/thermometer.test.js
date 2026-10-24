import { fireEvent, render, screen } from '@testing-library/svelte';
import { beforeEach, expect, test } from 'vitest';
import Thermometer from '../src/components/Thermometer.svelte';
import { app } from '../src/lib/state.svelte.js';

beforeEach(() => Object.assign(app, { color: 'avg', range: null }));

test('mercury thermometer shows the EPA marker and default range', () => {
  render(Thermometer);
  expect(screen.getByText('EPA 0.3')).toBeTruthy();
  expect(screen.getByText('1.0+')).toBeTruthy();
  expect(screen.getByLabelText('Deepest blue at').value).toBe('0');
  expect(screen.getByLabelText('Deepest red at').value).toBe('1');
});

test('dragging a handle sets the range', async () => {
  render(Thermometer);
  await fireEvent.input(screen.getByLabelText('Deepest red at'), { target: { value: '0.8' } });
  expect(app.range).toEqual([0, 0.8]);
});

test('age thermometer has no EPA marker', () => {
  app.color = 'age';
  render(Thermometer);
  expect(screen.queryByText('EPA 0.3')).toBeNull();
  expect(screen.getByText('30+ yrs ago')).toBeTruthy();
});
