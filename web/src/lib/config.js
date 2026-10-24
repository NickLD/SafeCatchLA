export const EPA_GUIDELINE_PPM = 0.3;
export const NEAR_LOWER_PPM = 0.2;
export const PERIODS = [5, 10, 20, 'all'];
export const DEFAULT_PERIOD = 10;
export const PERIOD_LABELS = { 5: 'Last 5 yrs', 10: 'Last 10 yrs', 20: 'Last 20 yrs', all: 'All years' };
export const LDH_ADVISORIES_URL = 'https://ldh.la.gov/page/2629';
export const NATIONAL_MIN_N = 5;
export const ALL_SPECIES = 'ALL';
// What the map measures. Only mercury today; every color mode and stat is implicitly for this contaminant.
export const CONTAMINANTS = [{ id: 'mercury', label: 'Mercury', unit: 'ppm' }];
export const BASINS = {
  '01': 'Atchafalaya', '02': 'Barataria', '03': 'Calcasieu', '04': 'Lake Pontchartrain',
  '05': 'Mermentau', '06': 'Vermilion-Teche', '07': 'Mississippi River', '08': 'Ouachita',
  '09': 'Pearl', '10': 'Red', '11': 'Sabine', '12': 'Terrebonne',
};
