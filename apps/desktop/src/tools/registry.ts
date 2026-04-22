import type { ComponentType } from 'react';
import type { Zone } from '../state';
import { PlaceholderTool } from './PlaceholderTool';

/**
 * Tool registry — Phase 3 placeholder version.
 *
 * Each entry describes a tool with enough metadata to:
 *   - render it in the navigator (label, category)
 *   - open it in the right default zone (defaultZone)
 *   - mount its component (component, static for now — Phase 4 switches to
 *     dynamic `import()` via `component: () => Promise<...>`)
 *
 * Phase 4 replaces this with the rich `ToolDescriptor` shape from plan-002
 * (keywords, icons, layoutHints, backendCommands).
 */

export type ToolCategory =
  | 'text'
  | 'validation'
  | 'data'
  | 'binary'
  | 'network'
  | 'utilities';

export interface ToolDescriptor {
  id: string;
  name: string;
  category: ToolCategory;
  description: string;
  /**
   * Zone the tool opens into when launched from the navigator / palette.
   * Must be a member of `supportedZones` (when that's set explicitly).
   */
  defaultZone: Zone;
  /**
   * Zones this tool can be docked into. Controls drag-drop acceptance in
   * the inspector (right) and console (bottom). Omit to allow all zones
   * — the permissive default lets small tools dock anywhere. Large tools
   * that can't fit the inspector's narrow column should set this to
   * `['center']` (and optionally `'bottom'`) to disallow that dock
   * target; PaneDropTarget and moveTool both consult this list.
   */
  supportedZones?: Zone[];
  /**
   * The tool body. Receives the tool id plus the zone it is currently
   * rendered in so responsive-to-dock layout decisions (compact form in
   * the narrow inspector, full form in the center) can happen locally
   * without plumbing extra context through every layer. Tools that don't
   * care about zone can ignore the prop.
   */
  component: ComponentType<{ toolId: string; zone?: Zone }>;
}

/** All zones. Used as the permissive default for `supportedZones`. */
export const ALL_ZONES: readonly Zone[] = ['center', 'right', 'bottom'] as const;

/*
 * `supportedZones` policy (rule of thumb):
 *   - Side-by-side, two-column, or dense-tabular tools need horizontal
 *     room and won't fit the inspector's narrow right column — mark them
 *     as ['center'] and optionally 'bottom' for a wide but short pane.
 *   - Small form / key-value tools (encoders, hashers, calculators) are
 *     happy in any zone — omit `supportedZones` so the permissive
 *     all-zones default kicks in.
 */
const entries: ToolDescriptor[] = [
  {
    id: 'text-diff',
    name: 'Text Diff',
    category: 'text',
    description: 'Side-by-side diff with inline change highlighting.',
    defaultZone: 'center',
    // Two-column diff — needs width; refuse the narrow inspector dock.
    supportedZones: ['center', 'bottom'],
    component: PlaceholderTool,
  },
  {
    id: 'case-transform',
    name: 'Case Transform',
    category: 'text',
    description: 'Convert between camel/snake/kebab/pascal/upper/lower.',
    defaultZone: 'center',
    component: PlaceholderTool,
  },
  {
    id: 'whitespace-clean',
    name: 'Whitespace Clean',
    category: 'text',
    description: 'Normalize whitespace, tabs, newlines, BOM.',
    defaultZone: 'center',
    component: PlaceholderTool,
  },
  {
    id: 'json-validator',
    name: 'JSON Validator',
    category: 'validation',
    description: 'Parse, pretty-print, and validate JSON against schemas.',
    defaultZone: 'center',
    // Pretty-printed JSON is tall; inspector column would force wrapping.
    supportedZones: ['center', 'bottom'],
    component: PlaceholderTool,
  },
  {
    id: 'yaml-validator',
    name: 'YAML Validator',
    category: 'validation',
    description: 'Parse YAML, surface errors, round-trip to JSON.',
    defaultZone: 'center',
    supportedZones: ['center', 'bottom'],
    component: PlaceholderTool,
  },
  {
    id: 'regex-tester',
    name: 'Regex Tester',
    category: 'validation',
    description: 'Test regex patterns against sample input with match groups.',
    defaultZone: 'center',
    component: PlaceholderTool,
  },
  {
    id: 'hash-workbench',
    name: 'Hash Workbench',
    category: 'data',
    description: 'Compute MD5/SHA-1/SHA-256/SHA-512 on text or files.',
    defaultZone: 'center',
    component: PlaceholderTool,
  },
  {
    id: 'base64-pad',
    name: 'Base64 Pad',
    category: 'data',
    description: 'Encode/decode base64 with URL-safe variant.',
    defaultZone: 'center',
    component: PlaceholderTool,
  },
  {
    id: 'url-codec',
    name: 'URL Codec',
    category: 'data',
    description: 'Percent-encode and decode URL components.',
    defaultZone: 'center',
    component: PlaceholderTool,
  },
  {
    id: 'hex-inspector',
    name: 'Hex Inspector',
    category: 'binary',
    description: 'Dense hex + ASCII viewer with offset navigation.',
    defaultZone: 'center',
    // Dense hex rows ARE the format — any column narrower than 16 bytes
    // of hex + ASCII breaks the layout.
    supportedZones: ['center'],
    component: PlaceholderTool,
  },
  {
    id: 'protobuf-decode',
    name: 'Protobuf Decode',
    category: 'binary',
    description: 'Decode protobuf wire format with .proto schema.',
    defaultZone: 'center',
    component: PlaceholderTool,
  },
  {
    id: 'cidr-calc',
    name: 'CIDR Calculator',
    category: 'network',
    description: 'Split CIDR ranges, compute masks, test membership.',
    defaultZone: 'center',
    component: PlaceholderTool,
  },
  {
    id: 'tls-inspector',
    name: 'TLS Inspector',
    category: 'network',
    description: 'Inspect certificate chains and protocol versions.',
    defaultZone: 'center',
    component: PlaceholderTool,
  },
];

const byId = new Map<string, ToolDescriptor>(entries.map((e) => [e.id, e]));

export function getTool(id: string): ToolDescriptor | undefined {
  return byId.get(id);
}

export function listTools(): ToolDescriptor[] {
  return entries;
}

export function listToolsByCategory(): Record<ToolCategory, ToolDescriptor[]> {
  const result: Record<ToolCategory, ToolDescriptor[]> = {
    text: [],
    validation: [],
    data: [],
    binary: [],
    network: [],
    utilities: [],
  };
  for (const entry of entries) {
    result[entry.category].push(entry);
  }
  return result;
}

/** Return the zones this tool accepts docks into. Falls back to ALL_ZONES. */
export function getSupportedZones(descriptor: ToolDescriptor): readonly Zone[] {
  return descriptor.supportedZones ?? ALL_ZONES;
}

/** Can this tool id be docked into `zone`? True for unknown ids (defensive
 *  — an unknown id is going to fail later via the missing-descriptor path
 *  anyway, and silently refusing drops on it would be confusing during
 *  dev when the registry is still in flux). */
export function toolAcceptsZone(toolId: string, zone: Zone): boolean {
  const descriptor = byId.get(toolId);
  if (!descriptor) return true;
  return getSupportedZones(descriptor).includes(zone);
}
