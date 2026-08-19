import { create } from 'zustand';
import type { MapData, MapView, FloorStack, Floor } from '@mappedin/mappedin-js';
import { showSearchLocationMarker, clearSearchLocationMarker, getMarkerTarget } from '../utils/searchMarkerUtils';
import { showStepMarker, clearStepMarker } from '../utils/navigationMarkerUtils';
import { showUserLocationMarker, clearUserLocationMarker } from '../utils/userLocationMarkerUtils';
import { LocationSmoothingEngine } from '../utils/locationSmoothing';
import { deviceOrientationManager } from '../utils/deviceOrientationUtils';

const locationSmoothingEngine = new LocationSmoothingEngine({
  posAlpha: 0.28,
  maxAllowedAccuracy: 50,
  maxSpeedMetersPerSec: 5.5,
  stationaryThresholdMeters: 1.2,
});

// Fanshawe College London Campus Reference Center (Latitude, Longitude)
const FANSHAWE_CENTER_LAT = 43.0125;
const FANSHAWE_CENTER_LON = -81.2002;
const CAMPUS_RADIUS_METERS = 1500; // 1.5 km threshold for campus radius

/**
 * Calculates distance in meters between two lat/lon points using the Haversine formula.
 */
function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

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
        const cleanA = cleanString(a.roomName);
        const cleanB = cleanString(b.roomName);
        const comp = cleanA.localeCompare(cleanB, undefined, { numeric: true, sensitivity: 'base' });
        if (comp !== 0) return comp;
        const cleanBldgA = cleanString(a.buildingName);
        const cleanBldgB = cleanString(b.buildingName);
        return cleanBldgA.localeCompare(cleanBldgB, undefined, { numeric: true, sensitivity: 'base' });
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
    const cleanRoom = cleanString(entry.roomName);
    const cleanBuilding = cleanString(entry.buildingName);
    const cleanFloor = cleanString(entry.floorName || '');
    const cleanCombined = cleanString(`${entry.roomName} ${entry.buildingName} ${entry.floorName || ''}`);

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

  // Live Location & Out-of-Radius state
  isLiveLocationActive: boolean;
  userCoords: { latitude: number; longitude: number; accuracy?: number } | null;
  isOutOfRadius: boolean;
  userDistanceToCampus: number | null; // in meters
  locationError: string | null;
  watchId: number | null;
  blueDotInstance: any | null;
  isFollowingUser: boolean;
  isSimulationActive: boolean;
  simulationTimerId: any | null;

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

  // Live Location actions
  enableLiveLocation: () => void;
  disableLiveLocation: () => void;
  toggleLiveLocation: () => void;
  setUseCurrentLocationAsOrigin: () => void;
  setBlueDot: (blueDot: any) => void;
  toggleFollowUser: () => void;
  startSimulationMode: () => void;
  stopSimulationMode: () => void;
  toggleSimulationMode: () => void;
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

  isLiveLocationActive: false,
  userCoords: null,
  isOutOfRadius: false,
  userDistanceToCampus: null,
  locationError: null,
  watchId: null,
  blueDotInstance: null,
  isFollowingUser: false,
  isSimulationActive: false,
  simulationTimerId: null,

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

      return {
        item,
        roomName,
        buildingName,
        floorName,
        catNames,
        searchText: `${roomName} ${desc} ${catNames} ${floorName} ${buildingName}`.toLowerCase(),
      };
    });

    // Sort room entries by building name then room name naturally (ignoring space and other characters)
    searchEntries.sort((a, b) => {
      const cleanBldgA = cleanString(a.buildingName);
      const cleanBldgB = cleanString(b.buildingName);
      const bComp = cleanBldgA.localeCompare(cleanBldgB, undefined, { numeric: true, sensitivity: 'base' });
      if (bComp !== 0) return bComp;

      const cleanRoomA = cleanString(a.roomName);
      const cleanRoomB = cleanString(b.roomName);
      return cleanRoomA.localeCompare(cleanRoomB, undefined, { numeric: true, sensitivity: 'base' });
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

    if (get().isLiveLocationActive && get().userCoords) {
      const { latitude, longitude, accuracy } = get().userCoords!;
      const isOutOfRadius = get().isOutOfRadius;
      const distance = get().userDistanceToCampus;
      const distanceKm = distance ? (distance / 1000).toFixed(1) : '';
      const distanceText = isOutOfRadius ? `${distanceKm} km away` : 'On Campus';

      const fallbackCampusNode =
        get().searchItems.find((e) => (e.item.name || '').toUpperCase().includes('C116'))?.item ||
        get().searchItems[0]?.item;

      let userTarget: any = null;
      if (!isOutOfRadius) {
        try {
          if (typeof (mapView as any).createCoordinate === 'function') {
            userTarget = (mapView as any).createCoordinate(latitude, longitude, currentFloor);
          } else {
            userTarget = { latitude, longitude, floorId: currentFloor?.id, floor: currentFloor };
          }
        } catch (e) {
          userTarget = fallbackCampusNode;
        }
      } else {
        userTarget = fallbackCampusNode;
      }

      if (userTarget) {
        showUserLocationMarker(mapView, userTarget, {
          isOutOfRadius,
          distanceText,
          accuracy,
        });
      }
    }

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

    if (focusTarget) {
      try {
        mapView.Camera.focusOn(focusTarget, {
          minZoomLevel: 17.5,
          maxZoomLevel: 18.2,
          duration: 500,
        });
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
      const focusOptions = { minZoomLevel: 17.8, maxZoomLevel: 18.5, duration: 500 };
      const focusTarget = getMarkerTarget(item);
      mapView.Camera.focusOn(focusTarget || item, focusOptions);
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

    if (coord) {
      // Focus camera on step location with perfect dynamic framing (zoom ~18.5 - 19.0)
      try {
        const type = (inst?.action?.type || '').toLowerCase();
        const text = (inst?.action?.text || inst?.instruction || '').toLowerCase();
        const isStairsOrElevator =
          type.includes('connection') ||
          type.includes('stairs') ||
          type.includes('elevator') ||
          text.includes('stair') ||
          text.includes('elevator') ||
          !!inst?.action?.connection;

        mapView.Camera.focusOn(coord, {
          minZoomLevel: isStairsOrElevator ? 18.2 : 18.5,
          maxZoomLevel: isStairsOrElevator ? 18.7 : 19.0,
          pitch: 35,
          duration: 450,
        });
      } catch (e) {}

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
      selectedLocation: originLocation,
    });
    calculateDirections();
  },

  calculateDirections: async () => {
    const { mapView, originLocation, destinationLocation, isAccessiblePath, floorStacks } = get();
    if (!mapView || !originLocation || !destinationLocation) return;

    try {
      try {
        clearStepMarker(mapView);
        mapView.Navigation.clear();
      } catch (e) {}

      // Helper to find floor object from location item
      const getFloorObj = (loc: any) =>
        loc?.floor ||
        loc?.location?.floor ||
        (Array.isArray(loc?.locations) && loc?.locations[0]?.floor);

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

      const getDirectionsTarget = (loc: any) => {
        if (!loc) return null;
        if (loc.isUserLocation && loc.coordinate) {
          return loc.coordinate;
        }
        return loc;
      };

      const originTarget = getDirectionsTarget(originLocation);
      const destTarget = getDirectionsTarget(destinationLocation);

      let directions: any = null;
      try {
        directions = await mapView.getDirections(originTarget, destTarget, {
          accessible: isAccessiblePath,
        });
      } catch (e) {
        console.warn('Failed to calculate directions with primary target:', e);
      }

      if (!directions && originLocation?.isUserLocation) {
        try {
          directions = await mapView.getDirections(originLocation, destTarget, {
            accessible: isAccessiblePath,
          });
        } catch (e) {}
      }

      if (directions) {
        set({ activeDirections: directions, activeStepIndex: 0 });
        try {
          await mapView.Navigation.draw(directions, {
            setMapToDeparture: true,
            setMapOnConnectionClick: true,
            animatePathDrawing: true,
            pathOptions: {
              color: '#5c0628',
              accentColor: '#ffffff',
              displayArrowsOnPath: true,
              animateArrowsOnPath: true,
              showPulse: true,
              pulseIterations: Infinity,
              pulsePauseDuration: 400,
              width: 2.2,
              __EXPERIMENTAL__CONNECTION_COLOR: '#5c0628',
              __EXPERIMENTAL__CONNECTION_DASHED: true,
            },
            markerOptions: {
              departureColor: '#10B981',
              destinationColor: '#DC2626',
              animated: true,
            },
          });

          // Focus camera on origin to start navigation clearly
          try {
            mapView.Camera.focusOn(originLocation, {
              minZoomLevel: 18.5,
              maxZoomLevel: 19.0,
              pitch: 35,
              duration: 500,
            });
          } catch (e) {}

          // Show initial step marker on origin coordinate
          const firstInst = directions.instructions?.[0] as any;
          const firstCoord = firstInst?.coordinate || originLocation;
          if (firstCoord) {
            const originName = originLocation?.name || 'Start';
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

  enableLiveLocation: () => {
    const { watchId, mapView, mapData, searchItems, blueDotInstance } = get();
    if (watchId !== null) return; // Already watching

    set({ isLiveLocationActive: true, locationError: null });

    locationSmoothingEngine.reset();
    deviceOrientationManager.start();

    if (blueDotInstance && typeof blueDotInstance.enable === 'function') {
      try {
        blueDotInstance.enable({
          color: '#2563eb',
          accuracyRing: { color: '#3b82f6', opacity: 0.25 },
        });
      } catch (e) {
        console.warn('BlueDot enable warning:', e);
      }
    }

    // Fallback campus node (Building C116 / Ground Floor Entrance)
    const fallbackCampusNode =
      searchItems.find((e) => (e.item.name || '').toUpperCase().includes('C116'))?.item ||
      searchItems[0]?.item;

    const findClosestSpace = (lat: number, lon: number) => {
      const currentMapData = get().mapData;
      if (!currentMapData) return null;
      try {
        const spaces = currentMapData.getByType('space') as any[];
        let closest: any = null;
        let minD = Infinity;
        for (const s of spaces) {
          if (s.center && typeof s.center.latitude === 'number') {
            const dist = calculateHaversineDistance(lat, lon, s.center.latitude, s.center.longitude);
            if (dist < minD) {
              minD = dist;
              closest = s;
            }
          }
        }
        return { closestSpace: closest, distance: minD };
      } catch (e) {
        return null;
      }
    };

    const processPosition = (
      rawLat: number,
      rawLon: number,
      accuracy?: number,
      isSimulated: boolean = false
    ) => {
      // 1. Pass raw location fix through Location Smoothing & Noise Reduction Engine
      const headingFromSensor = deviceOrientationManager.getCurrentHeading();
      let smoothedPoint = locationSmoothingEngine.filter({
        latitude: rawLat,
        longitude: rawLon,
        accuracy: accuracy || 15,
        heading: headingFromSensor,
        timestamp: Date.now(),
      });

      const {
        mapView: currentMapView,
        mapData: currentMapData,
        directionsMode,
        activeDirections,
        activeStepIndex,
        originLocation,
        blueDotInstance: currentBlueDot,
        isFollowingUser,
        setActiveStepIndex,
      } = get();

      // 2. Map Path Snapping: If active route directions exist, snap smoothed point to polyline
      if (activeDirections?.instructions && activeDirections.instructions.length > 0) {
        const pathCoords = activeDirections.instructions
          .map((inst: any) => inst?.coordinate)
          .filter((c: any) => c && typeof c.latitude === 'number');

        if (pathCoords.length >= 2) {
          smoothedPoint = locationSmoothingEngine.snapToPath(smoothedPoint, pathCoords, 12.0);
        }
      }

      const { latitude, longitude } = smoothedPoint;
      const distAccuracy = smoothedPoint.accuracy || accuracy || 10;
      const heading = smoothedPoint.heading ?? headingFromSensor;

      const distance = calculateHaversineDistance(
        latitude,
        longitude,
        FANSHAWE_CENTER_LAT,
        FANSHAWE_CENTER_LON
      );
      const isOutOfRadius = !isSimulated && distance > CAMPUS_RADIUS_METERS;
      const distanceKm = (distance / 1000).toFixed(1);
      const distanceText = isOutOfRadius ? `${distanceKm} km away` : 'On Campus';

      set({
        userCoords: { latitude, longitude, accuracy: distAccuracy },
        userDistanceToCampus: Math.round(distance),
        isOutOfRadius,
      });

      if (currentMapView && currentMapData) {
        const spatialResult = findClosestSpace(latitude, longitude);
        const closestSpace = spatialResult?.closestSpace;
        const targetFloor =
          closestSpace?.floor ||
          currentMapView.currentFloor ||
          (currentMapData.getByType('floor') as Floor[]).find(
            (f) => f.elevation === 0 || f.name?.toLowerCase().includes('ground')
          );

        let userTarget: any = null;

        if (!isOutOfRadius) {
          try {
            if (typeof (currentMapView as any).createCoordinate === 'function') {
              userTarget = (currentMapView as any).createCoordinate(latitude, longitude, targetFloor);
            } else if (typeof (currentMapData as any).createCoordinate === 'function') {
              userTarget = (currentMapData as any).createCoordinate(latitude, longitude, targetFloor);
            } else {
              userTarget = {
                latitude,
                longitude,
                floorId: targetFloor?.id,
                floor: targetFloor,
              };
            }
          } catch (e) {
            console.warn('Could not create exact coordinate target, falling back:', e);
            userTarget = closestSpace || fallbackCampusNode;
          }
        } else {
          userTarget = fallbackCampusNode;
        }

        if (userTarget) {
          // Switch map floor to the user's actual building floor if different from current view floor
          if (targetFloor && targetFloor.id && currentMapView.currentFloor?.id !== targetFloor.id) {
            try {
              currentMapView.setFloor(targetFloor);
              get().syncFromMapView(targetFloor);
            } catch (e) {}
          }

          // Pass position and heading to Mappedin BlueDot engine
          if (currentBlueDot && typeof currentBlueDot.update === 'function') {
            try {
              currentBlueDot.update({
                latitude: userTarget.latitude ?? latitude,
                longitude: userTarget.longitude ?? longitude,
                accuracy: distAccuracy,
                floorOrFloorId: targetFloor,
              });
            } catch (e) {}
          }

          showUserLocationMarker(currentMapView, userTarget, {
            isOutOfRadius,
            distanceText,
            accuracy: distAccuracy,
            isSimulated,
            heading,
          });

          // Turn-by-Turn Auto Advancement: If navigating, check proximity to upcoming instruction waypoint
          if (
            directionsMode === 'navigating' &&
            activeDirections?.instructions &&
            activeStepIndex < activeDirections.instructions.length - 1
          ) {
            const nextInstruction = activeDirections.instructions[activeStepIndex + 1] as any;
            const nextCoord = nextInstruction?.coordinate;
            if (nextCoord && typeof nextCoord.latitude === 'number') {
              const distToNextStep = calculateHaversineDistance(
                latitude,
                longitude,
                nextCoord.latitude,
                nextCoord.longitude
              );
              // Auto-advance step when within 8 meters of next turn waypoint
              if (distToNextStep <= 8.0) {
                setActiveStepIndex(activeStepIndex + 1);
              }
            }
          }

          // Focus / Follow camera
          if (isFollowingUser) {
            if (currentBlueDot && typeof currentBlueDot.follow === 'function') {
              try {
                currentBlueDot.follow('position-and-heading', { zoomLevel: 18.8 });
              } catch (e) {
                currentMapView.Camera.focusOn(userTarget, {
                  minZoomLevel: 18.0,
                  maxZoomLevel: 19.0,
                  duration: 400,
                });
              }
            } else {
              try {
                currentMapView.Camera.focusOn(userTarget, {
                  minZoomLevel: 18.0,
                  maxZoomLevel: 19.0,
                  duration: 400,
                });
              } catch (e) {}
            }
          } else if (directionsMode !== 'navigating') {
            try {
              currentMapView.Camera.focusOn(userTarget, {
                minZoomLevel: 17.8,
                maxZoomLevel: 18.5,
                duration: 400,
              });
            } catch (e) {}
          }
        }

        // If origin location is set to "My Current Location", update its target coordinate dynamically
        if (originLocation?.isUserLocation) {
          const updatedOrigin = {
            ...originLocation,
            coordinate: userTarget,
            floor: targetFloor,
            isOutOfRadius,
          };
          set({ originLocation: updatedOrigin });
        }
      }
    };

    (get() as any)._processPosition = processPosition;

    if (typeof window !== 'undefined' && 'geolocation' in navigator) {
      const id = navigator.geolocation.watchPosition(
        (pos) => {
          processPosition(
            pos.coords.latitude,
            pos.coords.longitude,
            pos.coords.accuracy,
            false
          );
        },
        (err) => {
          console.warn('Geolocation warning/error:', err.message);
          set({
            locationError: err.message || 'Unable to retrieve your location',
          });
          // Fallback to campus coordinate on error so demo remains functional
          processPosition(FANSHAWE_CENTER_LAT, FANSHAWE_CENTER_LON, 10, false);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
      set({ watchId: id });
    } else {
      set({ locationError: 'Geolocation is not supported by your browser' });
      processPosition(FANSHAWE_CENTER_LAT, FANSHAWE_CENTER_LON, 10, false);
    }
  },

  disableLiveLocation: () => {
    const { watchId, mapView, blueDotInstance, stopSimulationMode } = get();
    stopSimulationMode();

    if (watchId !== null && typeof window !== 'undefined' && 'geolocation' in navigator) {
      navigator.geolocation.clearWatch(watchId);
    }
    deviceOrientationManager.stop();
    locationSmoothingEngine.reset();

    if (blueDotInstance && typeof blueDotInstance.disable === 'function') {
      try {
        blueDotInstance.disable();
      } catch (e) {}
    }
    if (mapView) {
      clearUserLocationMarker(mapView);
    }
    set({
      isLiveLocationActive: false,
      userCoords: null,
      watchId: null,
      userDistanceToCampus: null,
      isOutOfRadius: false,
      isFollowingUser: false,
    });
  },

  toggleLiveLocation: () => {
    const { isLiveLocationActive, enableLiveLocation, disableLiveLocation } = get();
    if (isLiveLocationActive) {
      disableLiveLocation();
    } else {
      enableLiveLocation();
    }
  },

  setUseCurrentLocationAsOrigin: () => {
    const {
      enableLiveLocation,
      searchItems,
      isOutOfRadius,
      userDistanceToCampus,
      userCoords,
      mapView,
      mapData,
      calculateDirections,
    } = get();

    enableLiveLocation();

    // Default target node on campus (C116 or first search item)
    const fallbackNode =
      searchItems.find((e) => (e.item.name || '').toUpperCase().includes('C116'))?.item ||
      searchItems[0]?.item;

    const currentOutOfRadius = isOutOfRadius;
    const distanceKm = userDistanceToCampus ? (userDistanceToCampus / 1000).toFixed(1) : '2.4';

    let originCoord: any = null;
    let targetFloor: any = null;
    if (userCoords && !currentOutOfRadius && mapView && mapData) {
      try {
        const spaces = mapData.getByType('space') as any[];
        let closestSpace: any = null;
        let minD = Infinity;
        for (const s of spaces) {
          if (s.center && typeof s.center.latitude === 'number') {
            const dist = calculateHaversineDistance(
              userCoords.latitude,
              userCoords.longitude,
              s.center.latitude,
              s.center.longitude
            );
            if (dist < minD) {
              minD = dist;
              closestSpace = s;
            }
          }
        }
        targetFloor =
          closestSpace?.floor ||
          mapView.currentFloor ||
          (mapData.getByType('floor') as Floor[]).find(
            (f) => f.elevation === 0 || f.name?.toLowerCase().includes('ground')
          );

        if (typeof (mapView as any).createCoordinate === 'function') {
          originCoord = (mapView as any).createCoordinate(userCoords.latitude, userCoords.longitude, targetFloor);
        } else if (mapData && typeof (mapData as any).createCoordinate === 'function') {
          originCoord = (mapData as any).createCoordinate(userCoords.latitude, userCoords.longitude, targetFloor);
        } else {
          originCoord = {
            latitude: userCoords.latitude,
            longitude: userCoords.longitude,
            floorId: targetFloor?.id,
            floor: targetFloor,
          };
        }
      } catch (e) {}
    }

    const baseObj = originCoord || fallbackNode;

    const userOriginObj = {
      ...baseObj,
      id: 'user-current-location',
      name: currentOutOfRadius
        ? `My Location (Out of Radius - ${distanceKm} km)`
        : 'My Current Location',
      displayName: currentOutOfRadius
        ? `My Location (Out of Radius - ${distanceKm} km)`
        : 'My Current Location',
      isUserLocation: true,
      isOutOfRadius: currentOutOfRadius,
      distanceKm,
      coordinate: originCoord,
    };

    set({ originLocation: userOriginObj });
    calculateDirections();
  },

  setBlueDot: (blueDot: any) => {
    set({ blueDotInstance: blueDot });
  },

  toggleFollowUser: () => {
    const { isFollowingUser, blueDotInstance, mapView, userCoords } = get();
    const newFollowing = !isFollowingUser;
    set({ isFollowingUser: newFollowing });

    if (newFollowing) {
      if (blueDotInstance && typeof blueDotInstance.follow === 'function') {
        try {
          blueDotInstance.follow('position-only', { zoomLevel: 18.5 });
        } catch (e) {}
      } else if (mapView && userCoords) {
        try {
          const target =
            typeof (mapView as any).createCoordinate === 'function'
              ? (mapView as any).createCoordinate(userCoords.latitude, userCoords.longitude, mapView.currentFloor)
              : mapView.currentFloor;
          if (target) {
            mapView.Camera.focusOn(target, { minZoomLevel: 17.8, maxZoomLevel: 18.5, duration: 400 });
          }
        } catch (e) {}
      }
    }
  },

  startSimulationMode: () => {
    const { stopSimulationMode, enableLiveLocation, mapData } = get();
    stopSimulationMode();
    enableLiveLocation();

    set({ isSimulationActive: true, isOutOfRadius: false });

    let waypoints: { latitude: number; longitude: number }[] = [];
    if (mapData) {
      try {
        const spaces = (mapData.getByType('space') as any[]).filter(
          (s) => s.center && typeof s.center.latitude === 'number'
        );
        if (spaces.length >= 4) {
          const step = Math.max(1, Math.floor(spaces.length / 8));
          for (let i = 0; i < spaces.length; i += step) {
            const s = spaces[i];
            waypoints.push({
              latitude: s.center.latitude,
              longitude: s.center.longitude,
            });
          }
        }
      } catch (e) {}
    }

    if (waypoints.length === 0) {
      waypoints = [
        { latitude: 43.0123, longitude: -81.2005 },
        { latitude: 43.0125, longitude: -81.2001 },
        { latitude: 43.0127, longitude: -81.1998 },
        { latitude: 43.0129, longitude: -81.1994 },
        { latitude: 43.0131, longitude: -81.1990 },
      ];
    }

    let currentIndex = 0;
    const processPos = (get() as any)._processPosition;

    const timer = setInterval(() => {
      if (!get().isSimulationActive) {
        clearInterval(timer);
        return;
      }
      const pt = waypoints[currentIndex];
      if (processPos) {
        processPos(pt.latitude, pt.longitude, 3, true);
      }
      currentIndex = (currentIndex + 1) % waypoints.length;
    }, 2200);

    set({ simulationTimerId: timer });
  },

  stopSimulationMode: () => {
    const { simulationTimerId } = get();
    if (simulationTimerId) {
      clearInterval(simulationTimerId);
    }
    set({ isSimulationActive: false, simulationTimerId: null });
  },

  toggleSimulationMode: () => {
    const { isSimulationActive, startSimulationMode, stopSimulationMode } = get();
    if (isSimulationActive) {
      stopSimulationMode();
    } else {
      startSimulationMode();
    }
  },
}));



