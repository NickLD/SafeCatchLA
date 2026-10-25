import { expect, test } from 'vitest';
import { classLabel, describeSample, sizeClass, yearsFromSamples } from '../src/lib/size.js';

const CUTS = [33.02, 39.37]; // 13 in, 15.5 in

test('sizeClass splits at the cutoffs', () => {
  expect(sizeClass(30, CUTS)).toBe('small');
  expect(sizeClass(33.02, CUTS)).toBe('medium');
  expect(sizeClass(39.37, CUTS)).toBe('large');
  expect(sizeClass(null, CUTS)).toBeNull();
  expect(sizeClass(30, undefined)).toBeNull();
});

test('classLabel shows inches to one decimal', () => {
  expect(classLabel('small', CUTS)).toBe('Small (under 13.0")');
  expect(classLabel('medium', CUTS)).toBe('Medium (13.0–15.5")');
  expect(classLabel('large', CUTS)).toBe('Large (15.5"+)');
  expect(classLabel('medium', [32.8, 39.4])).toBe('Medium (12.9–15.5")');
});

test('describeSample', () => {
  expect(describeSample({ date: '1994-08-12', value: 0.27, nd: false, weightG: 419.6, lengthCm: 31.1, nFish: 5, composite: true }))
    .toBe('Aug 12, 1994 · 0.27 ppm · 12.24 in, 0.93 lb · average of 5 fish');
  expect(describeSample({ date: '2001-03-02', value: 0, nd: true, weightG: null, lengthCm: null, nFish: 1, composite: false }))
    .toBe('Mar 2, 2001 · not detected · size not recorded · single fish');
  expect(describeSample({ date: '2020-06-01', value: 0.046, nd: false, weightG: null, lengthCm: 30, nFish: 1, composite: false }))
    .toBe('Jun 1, 2020 · 0.046 ppm · 11.81 in · single fish');
});

test('yearsFromSamples rebuilds yearly sums', () => {
  expect(yearsFromSamples([
    { date: '1994-01-01', value: 0.2 }, { date: '1994-06-01', value: 0.4 }, { date: '2000-01-01', value: 0.1 },
  ])).toEqual({ '1994': [0.6000000000000001, 2], '2000': [0.1, 1] });
});
