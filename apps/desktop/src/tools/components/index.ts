/**
 * Shared scaffolding for tool components.
 *
 * These live under `tools/components/` (not in `@hyperspanner/lcars-ui`)
 * because they know about tool-shell concepts — zone awareness, status
 * footers, tool ids — that the design-token library shouldn't. Every
 * Phase 6 tool imports from here; no tool imports another tool.
 */

export { ToolFrame } from './ToolFrame';
export type { ToolFrameProps } from './ToolFrame';

export { ToolStatusPill } from './ToolStatusPill';
export type { ToolStatus, ToolStatusPillProps } from './ToolStatusPill';
