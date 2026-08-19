import type { MapData, MapView, Space, FloorStack, Label, Marker } from '@mappedin/mappedin-js';

export interface ColorGroup {
  name: string;
  prefixes: string[];
  color: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
}

export const COLOR_GROUPS: Record<string, ColorGroup> = {
  amber: {
    name: 'G / J / SC Buildings',
    prefixes: ['G', 'J', 'SC'],
    color: '#f59e0b', // Amber 500
    badgeBg: 'rgba(245, 158, 11, 0.2)',
    badgeText: '#f59e0b',
    badgeBorder: '#fbbf24',
  },
  orange: {
    name: 'B / C / T Buildings',
    prefixes: ['B', 'C', 'T'],
    color: '#f97316', // Orange 500
    badgeBg: 'rgba(249, 115, 22, 0.2)',
    badgeText: '#f97316',
    badgeBorder: '#fb923c',
  },
  indigo: {
    name: 'A / D / E / F Buildings',
    prefixes: ['A', 'D', 'E', 'F'],
    color: '#6366f1', // Indigo 500
    badgeBg: 'rgba(99, 102, 241, 0.2)',
    badgeText: '#818cf8',
    badgeBorder: '#6366f1',
  },
  teal: {
    name: 'H / K / L / M / W / Z Buildings',
    prefixes: ['H', 'K', 'L', 'M', 'W', 'Z'],
    color: '#14b8a6', // Teal 500
    badgeBg: 'rgba(20, 184, 166, 0.2)',
    badgeText: '#2dd4bf',
    badgeBorder: '#14b8a6',
  },
  outdoor: {
    name: 'Outdoor & Grounds',
    prefixes: ['OUTDOOR', 'GROUNDS', 'CAMPUS'],
    color: '#10b981', // Emerald 500
    badgeBg: 'rgba(16, 185, 129, 0.2)',
    badgeText: '#34d399',
    badgeBorder: '#10b981',
  },
};

/**
 * Determines the building group key based on space or building name/code.
 */
export function getBuildingGroupKey(name: string): string {
  if (!name) return 'teal';
  const upper = name.toUpperCase();

  // Multi-character matches
  if (upper.includes('SC') || upper.startsWith('SC')) return 'amber';
  if (upper.includes('OUTDOOR') || upper.includes('GROUNDS') || upper.includes('OUT')) return 'outdoor';

  // Check prefix matches
  const match = upper.match(/\b([A-Z]{1,2})\b/);
  if (match) {
    const code = match[1];
    if (['G', 'J', 'SC'].includes(code)) return 'amber';
    if (['B', 'C', 'T'].includes(code)) return 'orange';
    if (['A', 'D', 'E', 'F'].includes(code)) return 'indigo';
    if (['H', 'K', 'L', 'M', 'W', 'Z'].includes(code)) return 'teal';
  }

  // Check leading character of room numbers (e.g. G1002, B2014)
  const roomMatch = upper.match(/^([A-Z])\d/);
  if (roomMatch) {
    const code = roomMatch[1];
    if (['G', 'J'].includes(code)) return 'amber';
    if (['B', 'C', 'T'].includes(code)) return 'orange';
    if (['A', 'D', 'E', 'F'].includes(code)) return 'indigo';
    if (['H', 'K', 'L', 'M', 'W', 'Z'].includes(code)) return 'teal';
  }

  return 'teal';
}

/**
 * Extracts a concise 1-3 letter code for building badges.
 */
export function getBuildingCode(name: string): string {
  if (!name) return 'BD';
  const upper = name.toUpperCase();
  if (upper.includes('STUDENT CENTRE') || upper.includes('STUDENT CENTER')) return 'SC';
  if (upper.includes('OUTDOOR') || upper.includes('GROUNDS')) return 'OUT';

  const match = upper.match(/\b([A-Z]{1,2})\b/);
  if (match) return match[1];

  return name.trim().slice(0, 2).toUpperCase();
}

/**
 * Returns color hex string for a given space based on COLOR_GROUPS.
 */
export function getSpaceColor(space: Space): string {
  const buildingName = space.floor?.floorStack?.name || space.floor?.name || space.name || '';
  const groupKey = getBuildingGroupKey(buildingName);
  return COLOR_GROUPS[groupKey]?.color || '#14b8a6';
}

/**
 * Activates and styles all spaces on the map using predefined COLOR_GROUPS.
 * Preserves dedicated building colors continuously across all zoom levels.
 */
export function applySpaceColors(view: MapView, data: MapData): void {
  const floorStacks = data.getByType('floor-stack') as FloorStack[];
  const spaces = data.getByType('space');
  const styledSpaceIds = new Set<string>();

  // Map floor ID to spaces
  const spacesByFloorId = new Map<string, Space[]>();
  spaces.forEach((s) => {
    if (s.floor?.id) {
      const list = spacesByFloorId.get(s.floor.id) || [];
      list.push(s);
      spacesByFloorId.set(s.floor.id, list);
    }
  });

  // Style each building stack's spaces with its dedicated group color
  floorStacks.forEach((building) => {
    const groupKey = getBuildingGroupKey(building.name);
    const group = COLOR_GROUPS[groupKey] || COLOR_GROUPS.teal;

    // Apply dedicated color to all spaces inside building floors
    building.floors?.forEach((floor) => {
      const spacesOnFloor = spacesByFloorId.get(floor.id) || [];
      spacesOnFloor.forEach((space) => {
        try {
          view.updateState(space, { color: group.color });
          styledSpaceIds.add(space.id);
        } catch (e) {
          // ignore individual space errors
        }
      });
    });
  });

  // Fallback for any unmapped spaces
  spaces.forEach((space) => {
    if (!styledSpaceIds.has(space.id)) {
      try {
        const color = getSpaceColor(space);
        view.updateState(space, { color });
      } catch (e) {
        console.warn('Failed to update space color for space:', space.id, e);
      }
    }
  });
}

export const ZOOM_DETAIL_THRESHOLD = 18.5;

export interface ProgressiveLabelingController {
  updateZoom: (zoomLevel: number) => void;
  destroy: () => void;
}

/**
 * Initializes building-first labels and progressive detail zoom.
 * - At zoom < 18.5: displays high-level building markers/names, room labels hidden.
 * - At zoom >= 18.5: room numbers and layout labels fade in.
 */
export function initProgressiveLabeling(
  view: MapView,
  data: MapData,
  onBuildingSelect?: (buildingId: string) => void
): ProgressiveLabelingController {
  const roomLabels: Label[] = [];
  const buildingMarkers: { marker: Marker; elementId: string; buildingId: string }[] = [];

  // 1. Create Room Labels for all named spaces
  const spaces = data.getByType('space');
  spaces.forEach((space) => {
    if (space.name && space.name.trim()) {
      try {
        const label = view.Labels.add(space, space.name);
        if (label) {
          roomLabels.push(label);
        }
      } catch (e) {
        console.warn('Could not add space label:', space.name, e);
      }
    }
  });

  // 2. Create Building Markers for each FloorStack
  const floorStacks = data.getByType('floor-stack') as FloorStack[];
  floorStacks.forEach((building) => {
    if (!building.name || building.name.toLowerCase().includes('outdoor')) return;

    // Find anchor space in this building
    const defaultFloor = building.defaultFloor || building.floors[0];
    const buildingSpaces = spaces.filter(
      (s) => s.floor?.id === defaultFloor?.id || s.floor?.floorStack?.id === building.id
    );

    const anchorSpace =
      buildingSpaces.find((s) => s.name && !s.name.toLowerCase().includes('corridor')) ||
      buildingSpaces[Math.floor(buildingSpaces.length / 2)];

    if (!anchorSpace) return;

    const groupKey = getBuildingGroupKey(building.name);
    const group = COLOR_GROUPS[groupKey] || COLOR_GROUPS.teal;
    const code = getBuildingCode(building.name);
    const elementId = `building-marker-${building.id.replace(/[^a-zA-Z0-9_-]/g, '_')}`;

    const htmlContent = `
      <div id="${elementId}" class="building-marker-badge" data-building-id="${building.id}" style="
        background: rgba(15, 23, 42, 0.95);
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
        border: 1.5px solid ${group.badgeBorder};
        border-radius: 12px;
        padding: 5px 12px;
        color: white;
        font-family: system-ui, -apple-system, sans-serif;
        box-shadow: 0 8px 20px rgba(0,0,0,0.35);
        display: flex;
        align-items: center;
        gap: 8px;
        cursor: pointer;
        transition: opacity 0.2s ease, transform 0.2s ease;
        pointer-events: auto;
        white-space: nowrap;
        user-select: none;
        opacity: 1 !important;
      ">
        <span style="
          background: ${group.color};
          color: #ffffff;
          font-weight: 800;
          font-size: 11px;
          padding: 2px 7px;
          border-radius: 6px;
          letter-spacing: 0.5px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
          opacity: 1 !important;
        ">${code}</span>
        <span style="
          font-size: 12px;
          font-weight: 600;
          color: #ffffff;
          letter-spacing: 0.2px;
          opacity: 1 !important;
        ">${building.name}</span>
      </div>
    `;

    try {
      const targetObj = (anchorSpace as any)?.center || anchorSpace;
      const marker = view.Markers.add(targetObj, htmlContent, {
        rank: 'always-visible',
        placement: 'center',
      });
      if (marker) {
        buildingMarkers.push({ marker, elementId, buildingId: building.id });
      }
    } catch (e) {
      console.warn('Failed to add building marker:', building.name, e);
    }
  });

  // Attach click listener for building markers
  const handleMarkerClick = (e: MouseEvent) => {
    const target = (e.target as HTMLElement)?.closest('.building-marker-badge') as HTMLElement;
    if (target) {
      const bId = target.getAttribute('data-building-id');
      if (bId && onBuildingSelect) {
        onBuildingSelect(bId);
      }
    }
  };
  document.addEventListener('click', handleMarkerClick);

  let isDetailState: boolean | null = null;

  const updateZoom = (zoomLevel: number) => {
    const shouldShowDetails = zoomLevel >= ZOOM_DETAIL_THRESHOLD;

    if (shouldShowDetails === isDetailState) return;
    isDetailState = shouldShowDetails;

    // Toggle Room / Detail Labels (Fade in / out)
    roomLabels.forEach((label) => {
      try {
        view.updateState(label, { enabled: shouldShowDetails });
      } catch (e) {
        // Fallback
      }
    });

    // Ensure Building Markers always maintain 100% crisp full opacity
    buildingMarkers.forEach(({ elementId }) => {
      const el = document.getElementById(elementId);
      if (el) {
        el.style.opacity = '1';
        el.style.transform = shouldShowDetails ? 'scale(0.95)' : 'scale(1)';
      }
    });
  };

  // Initial update
  updateZoom(view.Camera.zoomLevel);

  // Subscribe to camera-change event
  const cameraListener = (transform: any) => {
    const zoom = transform?.zoomLevel ?? view.Camera.zoomLevel;
    updateZoom(zoom);
  };

  view.on('camera-change', cameraListener);

  return {
    updateZoom,
    destroy: () => {
      document.removeEventListener('click', handleMarkerClick);
      try {
        view.off?.('camera-change', cameraListener);
      } catch (e) {
        // ignore
      }
    },
  };
}
