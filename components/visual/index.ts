/**
 * Visual layer for the Tokenized Commodities Integration pages.
 *
 * These components add cinematic imagery, 3D-rendered icons, mobile-first
 * card layouts, and editorial bands to pages WITHOUT violating the Design
 * Law. The Design Law typography (serif Georgia headings, monospace data)
 * and color palette (dl-* tokens, navy #1e3a5f, border #c9d4dc) are
 * preserved across all visual components. Visual depth and richness comes
 * exclusively from the IMAGE assets (hero photos and 3D-rendered icon PNGs)
 * — the CSS itself remains free of gradients, box-shadows, animations, and
 * border-radius, so the institutional posture is preserved.
 *
 * Image asset directories:
 *   - public/visuals/commodities/   — 16:9 cinematic AI hero images
 *   - public/visuals/icons-3d/      — 1:1 3D-rendered icon PNGs
 *   - public/visuals/stock/         — HD editorial stock photos
 */

export { HeroBanner } from './HeroBanner';
export type { HeroBannerProps } from './HeroBanner';

export { IconTile } from './IconTile';
export type { IconTileProps } from './IconTile';

export { FeatureCard } from './FeatureCard';
export type { FeatureCardProps } from './FeatureCard';

export { StockImageBand } from './StockImageBand';
export type { StockImageBandProps } from './StockImageBand';

export { SectionGrid } from './SectionGrid';
export type { SectionGridProps } from './SectionGrid';

export { MetricStrip } from './MetricStrip';
export type { MetricStripProps, MetricItem } from './MetricStrip';

export { SectionHeader } from './SectionHeader';
export type { SectionHeaderProps } from './SectionHeader';

export { PageVisualSuite } from './PageVisualSuite';
export type { PageVisualSuitePreset } from './PageVisualSuite';
