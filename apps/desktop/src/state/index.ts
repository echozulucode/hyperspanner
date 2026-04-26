export {
  useWorkspaceStore,
  selectZoneTools,
  selectActive,
  clearWorkspaceStorage,
} from './workspace';

export type {
  Zone,
  CenterSplit,
  SplitSide,
  OpenTool,
  ZoneCollapseState,
  WorkspaceState,
  WorkspaceActions,
  WorkspaceStore,
} from './workspace.types';

export { DEFAULT_COLLAPSED, DEFAULT_WORKSPACE } from './presets';

export { useTool } from './useTool';
export type { UseToolReturn } from './useTool';

export {
  useFavoritesStore,
  useFavorites,
  useIsFavorite,
  useToggleFavorite,
  toggleFavorite,
  removeFavorite,
  clearAllFavorites,
} from './useFavorites';

export {
  useRecentsStore,
  useRecents,
  useTrackOpen,
  trackOpen,
  forgetRecent,
  clearRecents,
  RECENTS_CAP,
} from './useRecents';
