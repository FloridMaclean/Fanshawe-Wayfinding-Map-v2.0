import { create } from 'zustand';
import type { MapData, MapView, FloorStack, Floor } from '@mappedin/mappedin-js';
import { showSearchLocationMarker, clearSearchLocationMarker, getMarkerTarget } from '../utils/searchMarkerUtils';
import { showStepMarker, clearStepMarker } from '../utils/navigationMarkerUtils';

export function cleanString(str: string): string {
  if (!str) return '';
  return str.toLowerCase().replace(/[^a-z0-9]/g, '');
}

// Sort buildings: alphabetical, excluding Outdoor/Grounds stacks, ignoring space and special characters
export function sortBuildings(buildings: FloorStack[]): FloorStack[] {
  return [...buildings]
    .filter((b) => {
      const name = (b.name || '').toLowerCase();
      return !name.includes('outdoor') && !name.includes('grounds');
    })
    .sort((a, b) => {
      const cleanA = cleanString(a.name || '');
      const cleanB = cleanString(b.name || '');
      return cleanA.localeCompare(cleanB, undefined, { numeric: true, sensitivity: 'base' });
    });
}

export interface SearchEntry {
  item: any;
  searchText: string;
  roomName: string;
  buildingName: string;
  floorName?: string;
  catNames?: string;
  cleanRoom: string;
  cleanBuilding: string;
  cleanFloor: string;
  cleanCombined: string;
}

export function filterAndSortSearchEntries(
  entries: SearchEntry[],
  query: string,
  selectedBuildingId?: string
): SearchEntry[] {
  const rawQuery = (query || '').trim().toLowerCase();
  const cleanQuery = cleanString(rawQuery);

  if (!cleanQuery) {
    let sorted = [...entries];
    if (selectedBuildingId) {
      const inBuilding = sorted.filter(
        (entry) =>
          entry.item.floor?.floorStack?.id === selectedBuildingId ||
          entry.item.location?.floor?.floorStack?.id === selectedBuildingId
      );
      const other = sorted.filter(
        (entry) =>
          entry.item.floor?.floorStack?.id !== selectedBuildingId &&
          entry.item.location?.floor?.floorStack?.id !== selectedBuildingId
      );
      sorted = [...inBuilding, ...other];
    } else {
      sorted.sort((a, b) => {
        const comp = a.cleanRoom.localeCompare(b.cleanRoom, undefined, { numeric: true, sensitivity: 'base' });
        if (comp !== 0) return comp;
        return a.cleanBuilding.localeCompare(b.cleanBuilding, undefined, { numeric: true, sensitivity: 'base' });
      });
    }
    return sorted;
  }

  // Synonym map for common searches
  const synonyms: Record<string, string[]> = {
    washroom: ['washroom', 'restroom', 'bathroom', 'toilet', 'wc'],
    restroom: ['washroom', 'restroom', 'bathroom', 'toilet', 'wc'],
    bathroom: ['washroom', 'restroom', 'bathroom', 'toilet', 'wc'],
    toilet: ['washroom', 'restroom', 'bathroom', 'toilet', 'wc'],
    elevator: ['elevator', 'lift'],
    food: ['cafe', 'dining', 'cafeteria', 'food', 'restaurant', 'snack', 'tim hortons', 'subway', 'amenity'],
    coffee: ['cafe', 'coffee', 'tim hortons', 'starbucks'],
    amenity: ['amenity', 'cafe', 'dining', 'water', 'fountain', 'information', 'desk', 'service', 'vending'],
    room: ['room', 'lab', 'office', 'classroom', 'hall'],
  };

  let targetTerms = [rawQuery];
  for (const [key, list] of Object.entries(synonyms)) {
    if (list.includes(rawQuery)) {
      targetTerms = list;
      break;
    }
  }

  const cleanTargetTerms = targetTerms.map((t) => cleanString(t)).filter(Boolean);

  const scoredEntries: { entry: SearchEntry; rank: number; cleanRoom: string; cleanBuilding: string }[] = [];

  for (const entry of entries) {
    const cleanRoom = entry.cleanRoom || cleanString(entry.roomName);
    const cleanBuilding = entry.cleanBuilding || cleanString(entry.buildingName);
    const cleanCombined = entry.cleanCombined || cleanString(`${entry.roomName} ${entry.buildingName} ${entry.floorName || ''}`);

    let rank = -1;

    // Check exact room name match
    if (cleanRoom === cleanQuery) {
      rank = 0;
    }
    // Room name prefix match (e.g. "c1001" starts with "c")
    else if (cleanRoom.startsWith(cleanQuery)) {
      rank = 1;
    }
    // Any target term clean room prefix
    else if (cleanTargetTerms.some((ct) => cleanRoom.startsWith(ct))) {
      rank = 1;
    }
    // Room name contains cleanQuery
    else if (cleanRoom.includes(cleanQuery) || cleanTargetTerms.some((ct) => cleanRoom.includes(ct))) {
      rank = 2;
    }
    // Building name starts with cleanQuery (e.g. "cbuilding" starts with "c")
    else if (cleanBuilding.startsWith(cleanQuery) || cleanTargetTerms.some((ct) => cleanBuilding.startsWith(ct))) {
      rank = 3;
    }
    // Building name contains cleanQuery
    else if (cleanBuilding.includes(cleanQuery) || cleanTargetTerms.some((ct) => cleanBuilding.includes(ct))) {
      rank = 4;
    }
    // Combined room+building+floor contains cleanQuery
    else if (cleanCombined.includes(cleanQuery) || cleanTargetTerms.some((ct) => cleanCombined.includes(ct))) {
      rank = 5;
    }
    // For longer queries (>2 chars) or synonym queries, check entry.searchText
    else if (
      (cleanQuery.length > 2 || targetTerms.length > 1) &&
      targetTerms.some((term) => entry.searchText.includes(term))
    ) {
      rank = 6;
    }

    if (rank !== -1) {
      scoredEntries.push({ entry, rank, cleanRoom, cleanBuilding });
    }
  }

  // Sort matched entries by rank ascending, then by cleanRoom & cleanBuilding ignoring space and other characters
  scoredEntries.sort((a, b) => {
    if (a.rank !== b.rank) {
      return a.rank - b.rank;
    }

    const roomComp = a.cleanRoom.localeCompare(b.cleanRoom, undefined, {
      numeric: true,
      sensitivity: 'base',
    });
    if (roomComp !== 0) return roomComp;

    return a.cleanBuilding.localeCompare(b.cleanBuilding, undefined, {
      numeric: true,
      sensitivity: 'base',
    });
  });

  return scoredEntries.map((s) => s.entry);
}

let currentDirectionsRequestId = 0;

export function resolveDirectionCandidates(item: any): any[] {
  if (!item) return [];
  const candidates: any[] = [];
  const add = (candidate: any) => {
    if (candidate && !candidates.includes(candidate)) {
      candidates.push(candidate);
    }
  };

  const target = item?.item ? item.item : item;
  add(target);

  if (target?.space) add(target.space);
  if (target?.location) add(target.location);

  if (Array.isArray(target?.spaces)) {
    target.spaces.forEach((s: any) => add(s));
  }
  if (Array.isArray(target?.locations)) {
    target.locations.forEach((l: any) => {
      add(l);
      if (l.space) add(l.space);
      if (Array.isArray(l.spaces)) l.spaces.forEach((s: any) => add(s));
    });
  }

  if (target?.center && typeof target.center.latitude === 'number') {
    add(target.center);
  }
  const markerTarget = getMarkerTarget(target);
  if (markerTarget) add(markerTarget);

  return candidates;
}

export function getCoordLatLon(target: any): { latitude: number; longitude: number } | null {
  if (!target) return null;
  if (typeof target.latitude === 'number' && typeof target.longitude === 'number') {
    return { latitude: target.latitude, longitude: target.longitude };
  }
  if (target.center && typeof target.center.latitude === 'number') {
    return { latitude: target.center.latitude, longitude: target.center.longitude };
  }
  const markerT = getMarkerTarget(target);
  if (markerT && typeof markerT.latitude === 'number') {
    return { latitude: markerT.latitude, longitude: markerT.longitude };
  }
  return null;
}

export function calculateBearingAngle(
  start: { latitude: number; longitude: number },
  end: { latitude: number; longitude: number }
): number {
  const lat1 = (start.latitude * Math.PI) / 180;
  const lat2 = (end.latitude * Math.PI) / 180;
  const dLon = ((end.longitude - start.longitude) * Math.PI) / 180;

  const y = Math.sin(dLon) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  const brng = (Math.atan2(y, x) * 180) / Math.PI;
  return (brng + 360) % 360;
}

interface MapState {
  mapData: MapData | null;
  mapView: MapView | null;
  floorStacks: FloorStack[];
  floors: Floor[];
  selectedBuildingId: string;
  selectedFloorId: string;
  searchQuery: string;
  searchItems: SearchEntry[];
  searchResults: any[];
  isSearchFocused: boolean;
  isCollapsed: boolean;
  isLoading: boolean;
  error: string | null;
  zoomLevel: number;
  isDetailZoom: boolean;

  // Selected location & Directions state
  selectedLocation: any | null;
  originLocation: any | null;
  destinationLocation: any | null;
  directionsMode: 'none' | 'details' | 'setup' | 'navigating';
  isAccessiblePath: boolean;
  activeDirections: any | null;
  activeStepIndex: number;

  // QR Code Modal State
  qrModalUrl: string | null;

  // Actions
  setMapData: (mapData: MapData) => void;
  setMapView: (mapView: MapView) => void;
  setBuilding: (buildingId: string) => void;
  setFloor: (floorId: string) => void;
  setSearchQuery: (query: string) => void;
  setSearchFocused: (focused: boolean) => void;
  selectSearchResult: (item: any) => void;
  toggleCollapsed: () => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  syncFromMapView: (currentFloor: Floor) => void;
  setZoomLevel: (zoom: number) => void;

  setSelectedLocation: (item: any | null) => void;
  setOriginLocation: (item: any | null) => void;
  setDestinationLocation: (item: any | null) => void;
  setDirectionsMode: (mode: 'none' | 'details' | 'setup' | 'navigating') => void;
  setIsAccessiblePath: (accessible: boolean) => void;
  setActiveStepIndex: (index: number) => void;
  swapOriginAndDestination: () => void;
  calculateDirections: () => Promise<void>;
  clearDirections: () => void;
  closeLocationPanel: () => void;
  openQrModal: (url: string) => void;
  closeQrModal: () => void;
}

export const useMapStore = create<MapState>((set, get) => ({
  mapData: null,
  mapView: null,
  floorStacks: [],
  floors: [],
  selectedBuildingId: '',
  selectedFloorId: '',
  searchQuery: '',
  searchItems: [],
  searchResults: [],
  isSearchFocused: false,
  isCollapsed: false,
  isLoading: true,
  error: null,
  zoomLevel: 17,
  isDetailZoom: false,

  selectedLocation: null,
  originLocation: null,
  destinationLocation: null,
  directionsMode: 'none',
  isAccessiblePath: false,
  activeDirections: null,
  activeStepIndex: 0,

  qrModalUrl: null,

  setMapData: (mapData: MapData) => {
    const rawStacks = mapData.getByType('floor-stack') as FloorStack[];
    const sortedStacks = sortBuildings(rawStacks);

    const types = ['space', 'poi', 'point-of-interest', 'room', 'amenity', 'location'];
    const itemsMap = new Map<string, any>();

    types.forEach((t) => {
      try {
        const items = mapData.getByType(t as any);
        if (Array.isArray(items)) {
          items.forEach((item: any) => {
            const name = item.name || item.displayName || item.title || item.externalId;
            if (name && typeof name === 'string' && name.trim() && !itemsMap.has(item.id)) {
              itemsMap.set(item.id, item);
            }
          });
        }
      } catch (e) {
        // Ignore unsupported type error if any
      }
    });

    const searchEntries: SearchEntry[] = Array.from(itemsMap.values()).map((item) => {
      const roomName = (item.name || item.displayName || item.title || item.externalId || '').trim();
      const desc = (item.description || item.type || '').toLowerCase();
      const floor =
        item.floor ||
        item.location?.floor ||
        (Array.isArray(item.locations) && item.locations[0]?.floor);
      const floorName = floor?.name || '';
      const buildingName = floor?.floorStack?.name || '';
      const catNames = Array.isArray(item.categories)
        ? item.categories
            .map((c: any) => (typeof c === 'string' ? c : c.name || '').toLowerCase())
            .join(' ')
        : (item.category?.name || item.category || '').toString().toLowerCase();

      const cleanRoom = cleanString(roomName);
      const cleanBuilding = cleanString(buildingName);
      const cleanFloor = cleanString(floorName);
      const cleanCombined = cleanString(`${roomName} ${buildingName} ${floorName}`);

      return {
        item,
        roomName,
        buildingName,
        floorName,
        catNames,
        cleanRoom,
        cleanBuilding,
        cleanFloor,
        cleanCombined,
        searchText: `${roomName} ${desc} ${catNames} ${floorName} ${buildingName}`.toLowerCase(),
      };
    });

    // Sort room entries by building name then room name naturally (ignoring space and other characters)
    searchEntries.sort((a, b) => {
      const bComp = a.cleanBuilding.localeCompare(b.cleanBuilding, undefined, { numeric: true, sensitivity: 'base' });
      if (bComp !== 0) return bComp;

      return a.cleanRoom.localeCompare(b.cleanRoom, undefined, { numeric: true, sensitivity: 'base' });
    });

    const initialResults = filterAndSortSearchEntries(searchEntries, get().searchQuery, get().selectedBuildingId);

    set({
      mapData,
      floorStacks: sortedStacks,
      searchItems: searchEntries,
      searchResults: initialResults.map((e) => e.item),
    });
  },

  setMapView: (mapView: MapView) => {
    const mapData = get().mapData;
    const floorStacks = get().floorStacks;

    // Find Ground floor (elevation === 0 or name contains 'ground')
    let groundFloor: Floor | undefined;
    if (mapData) {
      const allFloors = mapData.getByType('floor') as Floor[];
      groundFloor =
        allFloors.find(
          (f) => f.name?.toLowerCase().includes('ground') || f.elevation === 0
        ) || mapView.currentFloor || undefined;
    }

    if (!groundFloor && mapView.currentFloor) {
      groundFloor = mapView.currentFloor;
    }

    if (groundFloor) {
      try {
        mapView.setFloor(groundFloor);
      } catch (e) {
        console.warn('Failed to set initial ground floor view:', e);
      }
    }

    const currentFloor = groundFloor || mapView.currentFloor;
    const currentStack = currentFloor?.floorStack;
    const isBuildingInList =
      currentStack && floorStacks.some((fs) => fs.id === currentStack.id);

    let floors: Floor[] = [];
    if (isBuildingInList && currentStack) {
      floors = [...currentStack.floors].sort((a, b) => b.elevation - a.elevation);
    }

    set({
      mapView,
      selectedBuildingId: isBuildingInList ? currentStack.id : '',
      selectedFloorId: currentFloor?.id || '',
      floors,
      isLoading: false,
    });

    // Auto-select location or directions from URL parameters if present
    if (typeof window !== 'undefined') {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const fromParam = urlParams.get('from') || urlParams.get('origin');
        const toParam = urlParams.get('to') || urlParams.get('destination');
        const targetParam = urlParams.get('location');

        const searchItems = get().searchItems;
        const findMatchingItem = (param: string) => {
          const cleanTarget = param.trim().toLowerCase();
          const matchedEntry = searchItems.find((e) => {
            const item = e.item;
            return (
              (item.name && String(item.name).toLowerCase() === cleanTarget) ||
              (item.displayName && String(item.displayName).toLowerCase() === cleanTarget) ||
              (item.externalId && String(item.externalId).toLowerCase() === cleanTarget) ||
              (item.id && String(item.id).toLowerCase() === cleanTarget) ||
              (e.roomName && String(e.roomName).toLowerCase() === cleanTarget) ||
              e.searchText.includes(cleanTarget)
            );
          });
          return matchedEntry ? matchedEntry.item : null;
        };

        if (fromParam && toParam) {
          const originItem = findMatchingItem(fromParam);
          const destItem = findMatchingItem(toParam);
          if (originItem && destItem) {
            setTimeout(() => {
              get().setOriginLocation(originItem);
              get().setDestinationLocation(destItem);
              get().setDirectionsMode('navigating');
              get().calculateDirections();
            }, 350);
          }
        } else if (targetParam) {
          const matchedItem = findMatchingItem(targetParam);
          if (matchedItem) {
            setTimeout(() => {
              get().selectSearchResult(matchedItem);
            }, 350);
          }
        }
      } catch (e) {}
    }
  },

  setBuilding: (buildingId: string) => {
    const { mapView, mapData } = get();
    if (!mapView || !mapData) return;

    const floorStack = mapData.getById('floor-stack', buildingId) as FloorStack;
    if (!floorStack) return;

    const floors = [...floorStack.floors].sort((a, b) => b.elevation - a.elevation);
    
    // Find Ground floor (elevation === 0 or name contains 'ground')
    const targetFloor =
      floors.find(
        (f) => f.name?.toLowerCase().includes('ground') || f.elevation === 0
      ) ||
      floorStack.defaultFloor ||
      floors[0];

    if (targetFloor) {
      mapView.setFloor(targetFloor);
    } else {
      mapView.setFloorStack(buildingId);
    }

    // Get all spaces associated with this building to center on the building itself
    const spaces = mapData.getByType('space');
    const buildingSpaces = spaces.filter(
      (s) =>
        s.floor?.floorStack?.id === buildingId ||
        floorStack.floors.some((f) => f.id === s.floor?.id)
    );

    const focusTarget =
      buildingSpaces.length > 0
        ? buildingSpaces
        : targetFloor || mapView.currentFloor;

    const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 768;
    if (focusTarget) {
      try {
        mapView.Camera.focusOn(focusTarget, {
          minZoomLevel: 16.5,
          maxZoomLevel: 17.2,
          pitch: 0,
          padding: { top: 90, right: 90, bottom: 90, left: isDesktop ? 480 : 50 },
          duration: 500,
        } as any);
      } catch (e) {
        console.warn('Failed to focus camera on building center:', e);
      }
    }

    set({
      selectedBuildingId: buildingId,
      selectedFloorId: targetFloor?.id || mapView.currentFloor?.id || (floors[0]?.id ?? ''),
      floors,
    });
  },

  setFloor: (floorId: string) => {
    const { mapView, mapData } = get();
    if (!mapView || !mapData) return;

    const selectedFloor = mapData.getById('floor', floorId) as Floor;
    if (selectedFloor) {
      mapView.setFloor(selectedFloor);
      set({ selectedFloorId: floorId });
    }
  },

  setSearchFocused: (focused: boolean) => {
    set({ isSearchFocused: focused });
  },

  setSearchQuery: (query: string) => {
    const { searchItems, selectedBuildingId, mapView } = get();
    if (!query.trim()) {
      clearSearchLocationMarker(mapView);
    }
    const filteredEntries = filterAndSortSearchEntries(searchItems, query, selectedBuildingId);
    set({
      searchQuery: query,
      searchResults: filteredEntries.map((e) => e.item),
    });
  },

  selectSearchResult: (item: any) => {
    const { mapView, floorStacks, setBuilding, setFloor, searchItems } = get();
    if (!mapView) return;

    const floor =
      item.floor ||
      item.location?.floor ||
      (Array.isArray(item.locations) && item.locations[0]?.floor);

    if (floor) {
      const building = floorStacks.find((b) =>
        b.floors.some((f) => f.id === floor.id)
      );

      if (building) {
        setBuilding(building.id);
      }
      setFloor(floor.id);
    }

    // Show popup marker on exact location
    showSearchLocationMarker(mapView, item);

    try {
      const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 768;
      const focusOptions = {
        minZoomLevel: 16.8,
        maxZoomLevel: 17.5,
        pitch: 0,
        padding: { top: 90, right: 90, bottom: 90, left: isDesktop ? 480 : 50 },
        duration: 500,
      };
      const focusTarget = getMarkerTarget(item);
      mapView.Camera.focusOn(focusTarget || item, focusOptions as any);
    } catch (e) {
      console.warn('Could not focus camera on selected search result:', e);
    }

    // Find default origin (e.g. C116 or first item not equal to destination)
    const existingOrigin = get().originLocation;
    let origin = existingOrigin;
    if (!origin || (origin.id && origin.id === item.id)) {
      const defaultEntry = searchItems.find(
        (e) => (e.item.name || '').toUpperCase().includes('C116') || e.item.id !== item.id
      );
      if (defaultEntry) {
        origin = defaultEntry.item;
      }
    }

    // Update browser URL query param for deep linking
    const locationId =
      item.name || item.displayName || item.title || item.externalId || item.id;
    if (typeof window !== 'undefined' && locationId) {
      try {
        const url = new URL(window.location.href);
        url.searchParams.set('location', locationId);
        window.history.replaceState({}, '', url.toString());
      } catch (e) {}
    }

    set({
      searchQuery: item.name || item.displayName || item.title || item.externalId || '',
      isSearchFocused: false,
      selectedLocation: item,
      destinationLocation: item,
      originLocation: origin,
      directionsMode: 'details',
    });
  },

  toggleCollapsed: () => {
    set((state) => ({ isCollapsed: !state.isCollapsed }));
  },

  setLoading: (isLoading: boolean) => set({ isLoading }),
  setError: (error: string | null) => set({ error }),

  syncFromMapView: (currentFloor: Floor) => {
    const { mapData, floorStacks } = get();
    if (!currentFloor || !mapData) return;

    const currentStack = currentFloor.floorStack;
    const isBuildingInList =
      currentStack && floorStacks.some((fs) => fs.id === currentStack.id);
    const floors =
      isBuildingInList && currentStack
        ? [...currentStack.floors].sort((a, b) => b.elevation - a.elevation)
        : [];

    set({
      selectedBuildingId: isBuildingInList ? currentStack.id : '',
      selectedFloorId: currentFloor.id,
      floors,
    });
  },

  setZoomLevel: (zoom: number) => {
    const currentZoom = get().zoomLevel;
    if (Math.abs(currentZoom - zoom) < 0.25) return;
    set({
      zoomLevel: zoom,
      isDetailZoom: zoom >= 18.5,
    });
  },

  setSelectedLocation: (item: any | null) => set({ selectedLocation: item }),
  setOriginLocation: (item: any | null) => {
    set({ originLocation: item });
    get().calculateDirections();
  },
  setDestinationLocation: (item: any | null) => {
    set({ destinationLocation: item });
    get().calculateDirections();
  },
  setDirectionsMode: (mode: 'none' | 'details' | 'setup' | 'navigating') => {
    set({ directionsMode: mode });
    if (mode === 'setup' || mode === 'navigating') {
      get().calculateDirections();
    }
  },
  setIsAccessiblePath: (accessible: boolean) => {
    set({ isAccessiblePath: accessible });
    get().calculateDirections();
  },
  setActiveStepIndex: (index: number) => {
    const { mapView, activeDirections, originLocation, destinationLocation, floorStacks } = get();
    set({ activeStepIndex: index });

    if (!mapView) return;

    // Clear old step marker
    clearStepMarker(mapView);

    const inst = activeDirections?.instructions?.[index] as any;
    const isFirstStep = index === 0;
    const isLastStep = activeDirections?.instructions
      ? index === activeDirections.instructions.length - 1
      : false;

    // Get origin/destination floor helper
    const getFloorObj = (loc: any) =>
      loc?.floor ||
      loc?.location?.floor ||
      (Array.isArray(loc?.locations) && loc?.locations[0]?.floor);

    // Determine target floor for this step
    const targetFloor =
      inst?.coordinate?.floor ||
      inst?.action?.toFloor ||
      inst?.action?.fromFloor ||
      (isFirstStep ? getFloorObj(originLocation) : isLastStep ? getFloorObj(destinationLocation) : undefined);

    // If step is on a different floor than current map floor, switch floor automatically!
    if (targetFloor && targetFloor.id && mapView.currentFloor?.id !== targetFloor.id) {
      try {
        mapView.setFloor(targetFloor);
        try {
          mapView.updateState(targetFloor, { visible: true });
        } catch (e) {}

        if (activeDirections) {
          try {
            mapView.Navigation.draw(activeDirections, {
              setMapToDeparture: false,
              setMapOnConnectionClick: true,
              animatePathDrawing: false,
              pathOptions: {
                color: '#003BAF',
                accentColor: '#ffffff',
                displayArrowsOnPath: true,
                animateArrowsOnPath: true,
                showPulse: false,
                width: 3.0,
                __EXPERIMENTAL__CONNECTION_COLOR: '#003BAF',
                __EXPERIMENTAL__CONNECTION_DASHED: false,
              },
              markerOptions: {
                departureColor: '#003BAF',
                destinationColor: '#DC2626',
                animated: true,
              },
            });
          } catch (e) {}
        }

        // Sync floor selection state
        const currentStack = targetFloor.floorStack;
        const isBuildingInList = currentStack && floorStacks.some((fs) => fs.id === currentStack.id);
        const floors = isBuildingInList && currentStack
          ? [...currentStack.floors].sort((a, b) => b.elevation - a.elevation)
          : [];

        set({
          selectedBuildingId: isBuildingInList ? currentStack.id : get().selectedBuildingId,
          selectedFloorId: targetFloor.id,
          floors: floors.length > 0 ? floors : get().floors,
        });
      } catch (e) {
        console.warn('Failed to switch floor for step navigation:', e);
      }
    }

    // Get target coordinate or location for this step
    const coord = inst?.coordinate || (isFirstStep ? originLocation : destinationLocation);

    // Calculate bearing angle to orient camera facing direction of travel
    let cameraRotation: number | undefined = undefined;
    const nextInst = activeDirections?.instructions?.[index + 1] as any;
    const nextCoordObj = nextInst?.coordinate || (isLastStep ? undefined : getMarkerTarget(destinationLocation));

    const startPos = getCoordLatLon(coord);
    const endPos = getCoordLatLon(nextCoordObj);
    if (startPos && endPos) {
      cameraRotation = calculateBearingAngle(startPos, endPos);
    }

    if (coord) {
      // Focus camera on active step segment in 2D top-down overview zoomed out 10%
      try {
        const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 768;
        const stepPadding = { top: 100, right: 100, bottom: 100, left: isDesktop ? 480 : 50 };
        const targetsToFocus: any[] = [coord];
        if (nextCoordObj) targetsToFocus.push(nextCoordObj);

        if (targetsToFocus.length > 1) {
          mapView.Camera.focusOn(targetsToFocus, {
            pitch: 0,
            padding: stepPadding,
            duration: 500,
          } as any);
        } else {
          mapView.Camera.focusOn(coord, {
            minZoomLevel: 16.8,
            maxZoomLevel: 17.5,
            pitch: 0,
            padding: stepPadding,
            duration: 500,
          } as any);
        }
      } catch (e) {
        try {
          const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 768;
          mapView.Camera.focusOn(coord, {
            pitch: 0,
            padding: { top: 90, right: 90, bottom: 90, left: isDesktop ? 480 : 50 },
            duration: 450,
          } as any);
        } catch (err) {}
      }

      // Show step marker pin on map with floor tag options
      const originName = originLocation?.name || 'Start';
      const destName = destinationLocation?.name || 'Destination';
      const floorTag = targetFloor?.name ? ` (${targetFloor.name})` : '';
      const isConnection =
        !!inst?.action?.connection ||
        (inst?.action?.type || '').toLowerCase().includes('connection') ||
        (inst?.action?.type || '').toLowerCase().includes('stairs') ||
        (inst?.action?.type || '').toLowerCase().includes('elevator');
      const isFloorChange =
        isConnection ||
        (inst?.action?.toFloor && inst?.action?.fromFloor && inst.action.toFloor.id !== inst.action.fromFloor.id);

      const stepText =
        inst?.action?.text ||
        inst?.instruction ||
        (isFirstStep ? `Depart ${originName}${floorTag}` : `Arrive at ${destName}${floorTag}`);

      showStepMarker(mapView, coord, index, stepText, {
        isFloorChange,
        floorName: targetFloor?.name,
      });
    }
  },

  swapOriginAndDestination: () => {
    const { originLocation, destinationLocation, calculateDirections } = get();
    set({
      originLocation: destinationLocation,
      destinationLocation: originLocation,
      selectedLocation: destinationLocation,
    });
    calculateDirections();
  },

  calculateDirections: async () => {
    const { mapView, originLocation, destinationLocation, isAccessiblePath, floorStacks } = get();
    if (!mapView || !originLocation || !destinationLocation) return;

    currentDirectionsRequestId++;
    const requestId = currentDirectionsRequestId;

    try {
      try {
        clearStepMarker(mapView);
      } catch (e) {}

      // Helper to find floor object from location item
      const getFloorObj = (loc: any) =>
        loc?.floor ||
        loc?.location?.floor ||
        (Array.isArray(loc?.locations) && loc?.locations[0]?.floor) ||
        loc?.space?.floor;

      const originFloor = getFloorObj(originLocation);
      if (originFloor && originFloor.id && mapView.currentFloor?.id !== originFloor.id) {
        try {
          mapView.setFloor(originFloor);
          const currentStack = originFloor.floorStack;
          const isBuildingInList = currentStack && floorStacks.some((fs) => fs.id === currentStack.id);
          const floors = isBuildingInList && currentStack
            ? [...currentStack.floors].sort((a, b) => b.elevation - a.elevation)
            : [];
          set({
            selectedBuildingId: isBuildingInList ? currentStack.id : get().selectedBuildingId,
            selectedFloorId: originFloor.id,
            floors: floors.length > 0 ? floors : get().floors,
          });
        } catch (e) {}
      }

      // Resolve all candidate targets to find the route with absolute minimum physical distance
      const originCandidates = resolveDirectionCandidates(originLocation);
      const destCandidates = resolveDirectionCandidates(destinationLocation);

      let bestDirections: any = null;

      // 1. Try primary origin and destination locations first
      try {
        const d = await mapView.getDirections(originLocation, destinationLocation, { accessible: isAccessiblePath });
        if (d && typeof d.distance === 'number') {
          bestDirections = d;
        }
      } catch (e) {}

      // 2. Evaluate candidate target pairs concurrently if primary call returned no route
      if (!bestDirections && (originCandidates.length > 1 || destCandidates.length > 1)) {
        const maxCandidates = 3;
        const subOriginCandidates = originCandidates.slice(0, maxCandidates);
        const subDestCandidates = destCandidates.slice(0, maxCandidates);

        const candidateTasks: Promise<any>[] = [];
        for (const o of subOriginCandidates) {
          for (const dTarget of subDestCandidates) {
            candidateTasks.push(
              mapView
                .getDirections(o, dTarget, { accessible: isAccessiblePath })
                .catch(() => null)
            );
          }
        }

        const candidateResults = await Promise.all(candidateTasks);
        for (const res of candidateResults) {
          if (res && typeof res.distance === 'number') {
            if (!bestDirections || res.distance < bestDirections.distance) {
              bestDirections = res;
            }
          }
        }
      }

      // Check if a newer directions request was made while calculating
      if (requestId !== currentDirectionsRequestId) return;

      if (bestDirections) {
        set({ activeDirections: bestDirections, activeStepIndex: 0 });
        try {
          // Clear previous drawings cleanly before drawing new route line
          try {
            mapView.Navigation.clear();
          } catch (e) {}

          await mapView.Navigation.draw(bestDirections, {
            setMapToDeparture: true,
            setMapOnConnectionClick: true,
            animatePathDrawing: true,
            pathOptions: {
              color: '#003BAF',
              accentColor: '#ffffff',
              displayArrowsOnPath: true,
              animateArrowsOnPath: true,
              showPulse: false,
              width: 3.0,
              __EXPERIMENTAL__CONNECTION_COLOR: '#003BAF',
              __EXPERIMENTAL__CONNECTION_DASHED: false,
            },
            markerOptions: {
              departureColor: '#003BAF',
              destinationColor: '#DC2626',
              animated: true,
            },
          });

          if (requestId !== currentDirectionsRequestId) return;

          // Frame entire route from origin to destination on map in 2D top-down overview
          const routeCoords: any[] = [];
          if (bestDirections.instructions && Array.isArray(bestDirections.instructions)) {
            bestDirections.instructions.forEach((inst: any) => {
              if (inst.coordinate) routeCoords.push(inst.coordinate);
            });
          }
          const origCoord = getMarkerTarget(originLocation) || originLocation;
          const destCoord = getMarkerTarget(destinationLocation) || destinationLocation;
          if (origCoord) routeCoords.unshift(origCoord);
          if (destCoord) routeCoords.push(destCoord);

          if (routeCoords.length > 0) {
            const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 768;
            const routePadding = { top: 120, right: 120, bottom: 120, left: isDesktop ? 500 : 70 };

            try {
              mapView.Camera.focusOn(routeCoords, {
                pitch: 0,
                padding: routePadding,
                duration: 600,
              } as any);
            } catch (e) {
              try {
                if (origCoord) {
                  mapView.Camera.focusOn(origCoord, {
                    minZoomLevel: 16.8,
                    maxZoomLevel: 17.5,
                    pitch: 0,
                    padding: routePadding,
                    duration: 500,
                  } as any);
                }
              } catch (err) {}
            }
          }

          // Show initial step marker on origin coordinate
          const firstInst = bestDirections.instructions?.[0] as any;
          const firstCoord = firstInst?.coordinate || origCoord;
          if (firstCoord) {
            const originName = originLocation?.name || originLocation?.displayName || 'Start';
            const floorTag = originFloor?.name ? ` (${originFloor.name})` : '';
            const stepText = firstInst?.action?.text || firstInst?.instruction || `Depart ${originName}${floorTag}`;
            showStepMarker(mapView, firstCoord, 0, stepText);
          }
        } catch (e) {
          console.warn('Failed to draw directions:', e);
        }
      }
    } catch (err) {
      console.warn('Failed to calculate directions:', err);
    }
  },


  clearDirections: () => {
    const { mapView } = get();
    if (mapView) {
      try {
        clearStepMarker(mapView);
        mapView.Navigation.clear();
      } catch (e) {}
    }
    set({
      activeDirections: null,
      activeStepIndex: 0,
      directionsMode: 'none',
    });
  },

  closeLocationPanel: () => {
    const { mapView } = get();
    if (mapView) {
      try {
        clearStepMarker(mapView);
        clearSearchLocationMarker(mapView);
        mapView.Navigation.clear();
      } catch (e) {}
    }

    if (typeof window !== 'undefined') {
      try {
        const url = new URL(window.location.href);
        url.searchParams.delete('location');
        window.history.replaceState({}, '', url.toString());
      } catch (e) {}
    }

    set({
      selectedLocation: null,
      originLocation: null,
      destinationLocation: null,
      directionsMode: 'none',
      activeDirections: null,
      activeStepIndex: 0,
    });
  },

  openQrModal: (url: string) => set({ qrModalUrl: url }),
  closeQrModal: () => set({ qrModalUrl: null }),
}));



