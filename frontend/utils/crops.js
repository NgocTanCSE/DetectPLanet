/**
 * AgriScan AI — Supported crops for the pre-scan picker.
 *
 * The vision model available on the current Workers plan misidentifies the
 * plant species often enough that the user must confirm it before /analyze.
 * The slug is sent to the API, validated server-side (see ScanController) and
 * injected into the vision prompt as a fixed constraint.
 *
 * Keep `slug` in sync with api/controllers/ScanController.php::CROP_HINTS.
 */
export const CROP_OPTIONS = [
  { slug: 'rice', label: 'Lúa' },
  { slug: 'tomato', label: 'Cà chua' },
  { slug: 'maize', label: 'Ngô' },
  { slug: 'potato', label: 'Khoai tây' },
  { slug: 'coffee', label: 'Cà phê' },
  { slug: 'pepper', label: 'Hồ tiêu' },
  { slug: 'soybean', label: 'Đậu nành' },
  { slug: 'vegetable', label: 'Rau cải' },
  { slug: 'other', label: 'Cây khác' },
];

export function cropLabel(slug) {
  const found = CROP_OPTIONS.find((c) => c.slug === slug);
  return found ? found.label : '';
}

export default CROP_OPTIONS;
