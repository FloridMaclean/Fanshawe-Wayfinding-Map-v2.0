import React, { useEffect, useRef } from 'react';
import {
  getMapData,
  show3dMap,
  type MapData,
  type MapView,
  type Facade,
  type Floor,
  type FloorStack,
  type TCancellablePromise,
} from '@mappedin/mappedin-js';
import { useMapStore } from '../../store/useMapStore';
import { ZoomControls } from '../UI/ZoomControls';
import {
  applySpaceColors,
  initProgressiveLabeling,
  type ProgressiveLabelingController,
} from '../../utils/mapStyleUtils';

const MAPPEDIN_KEY = 'mik_XGjrdBlPX6mgvmk3g56c007c8';
const MAPPEDIN_SECRET = 'mis_rPnCzgBR8o48FXMnRCAtqMioa2KRtNGdZPXBwrRdCaC8c901044';
const MAP_ID = '68d9d5d23b59c2000bfb9e9f';
const ANIMATION_DURATION = 150;

export const MappedinMap: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const isInitialized = useRef<boolean>(false);

  const {
    setMapData,
    setMapView,
    setLoading,
    setError,
    syncFromMapView,
    setZoomLevel,
    isLoading,
    error,
    directionsMode,
    selectedFloorId,
    floors,
  } = useMapStore();

  const currentFloor = floors.find((f) => f.id === selectedFloorId);
  const currentFloorName = currentFloor?.name || '';

  useEffect(() => {
    let isCancelled = false;
    let mapViewInstance: MapView | null = null;
    let progressiveController: ProgressiveLabelingController | null = null;
    const animationsByFacade = new Map<string, TCancellablePromise<any>>();
    const floorToShowByBuilding = new Map<string, Floor>();
    let elevation = 0;

    function updateFloorsToShow(mapData: MapData) {
      floorToShowByBuilding.clear();
      for (const floorStack of mapData.getByType('floor-stack')) {
        const floor = floorStack.floors.find((f) => f.elevation === elevation);
        if (floor) {
          floorToShowByBuilding.set(floorStack.id, floor);
        }
      }
    }

    function showFloors(building: FloorStack, mapView: MapView) {
      const floorToShow =
        floorToShowByBuilding.get(building.id) ?? building.defaultFloor;
      if (!floorToShow) return;

      const height = 10 * elevation;
      for (const floor of building.floors) {
        if (floor.id === floorToShow.id) {
          mapView.updateState(floor, {
            visible: true,
            altitude: height,
            footprint: {
              visible: elevation > 0,
              height,
              altitude: -height,
            },
          });
        } else {
          mapView.updateState(floor, { visible: false });
        }
      }
    }

    function openFacade(facade: Facade, mapView: MapView) {
      if (animationsByFacade.has(facade.id)) {
        animationsByFacade.get(facade.id)?.cancel();
      }
      showFloors(facade.floorStack, mapView);

      if (mapView.getState(facade)?.opacity === 0) return;

      const animation = mapView.animateState(
        facade,
        { opacity: 0 },
        { duration: ANIMATION_DURATION }
      );
      animationsByFacade.set(facade.id, animation);
      animation.then(() => {
        animationsByFacade.delete(facade.id);
      });
    }

    function closeFacade(facade: Facade, mapView: MapView) {
      if (animationsByFacade.has(facade.id)) {
        animationsByFacade.get(facade.id)?.cancel();
      }

      if (mapView.getState(facade)?.opacity === 1) return;

      const animation = mapView.animateState(
        facade,
        { opacity: 1 },
        { duration: ANIMATION_DURATION }
      );
      animationsByFacade.set(facade.id, animation);
      animation.then(() => {
        animationsByFacade.delete(facade.id);
        facade.floorStack.floors.forEach((floor) => {
          mapView.updateState(floor, { visible: false });
        });
      });
    }

    async function waitForContainer(el: HTMLDivElement, maxWaitMs = 5000): Promise<boolean> {
      const start = Date.now();
      while (Date.now() - start < maxWaitMs) {
        if (isCancelled) return false;
        const rect = el.getBoundingClientRect();
        const w = el.clientWidth || rect.width;
        const h = el.clientHeight || rect.height;
        if (w > 0 && h > 0) return true;
        await new Promise((res) => setTimeout(res, 50));
      }
      const rect = el.getBoundingClientRect();
      const w = el.clientWidth || rect.width;
      const h = el.clientHeight || rect.height;
      return w > 0 && h > 0;
    }

    async function fetchMapDataWithRetry(retries = 3): Promise<MapData> {
      let lastError: any = null;
      for (let attempt = 1; attempt <= retries; attempt++) {
        if (isCancelled) throw new Error('Initialization cancelled');
        try {
          return await getMapData({
            key: MAPPEDIN_KEY,
            secret: MAPPEDIN_SECRET,
            mapId: MAP_ID,
          });
        } catch (err: any) {
          lastError = err;
          if (attempt === retries || isCancelled) break;
          const isRateLimit = String(err?.message || err).includes('429');
          const delay = isRateLimit ? attempt * 1500 : attempt * 800;
          await new Promise((res) => setTimeout(res, delay));
        }
      }
      throw lastError || new Error('Failed to fetch map data');
    }

    async function initMap() {
      try {
        setLoading(true);
        setError(null);

        if (!containerRef.current || isCancelled) return;

        const hasSize = await waitForContainer(containerRef.current);
        if (isCancelled) return;
        if (!hasSize && containerRef.current) {
          containerRef.current.style.width = '100%';
          containerRef.current.style.height = '100%';
          containerRef.current.style.minHeight = '300px';
          containerRef.current.style.position = 'relative';
        }

        const data = await fetchMapDataWithRetry();
        if (isCancelled || !containerRef.current) return;

        const view = await show3dMap(containerRef.current, data);
        if (isCancelled) {
          try {
            view.destroy();
          } catch (e) {}
          return;
        }
        mapViewInstance = view;

        // 1. Activate and style spaces using predefined COLOR_GROUPS
        applySpaceColors(view, data);

        // 2. Keep all facades open (opacity 0) so dedicated building colors stay visible at all times
        data.getByType('floor-stack').forEach((fs) => {
          showFloors(fs, view);
          if (fs.facade) {
            view.updateState(fs.facade, { opacity: 0 });
          }
        });

        // 3. Initialize Building-First Labels & Progressive Detail Zoom (< 18.5 vs >= 18.5)
        progressiveController = initProgressiveLabeling(
          view,
          data,
          (buildingId) => {
            useMapStore.getState().setBuilding(buildingId);
          }
        );

        // Sync initial zoom level state
        setZoomLevel(view.Camera.zoomLevel);
        let lastZoom = view.Camera.zoomLevel;

        view.on('camera-change', (transform) => {
          if (isCancelled) return;
          const zoom = transform?.zoomLevel ?? view.Camera.zoomLevel;
          if (Math.abs(zoom - lastZoom) >= 0.25) {
            lastZoom = zoom;
            setZoomLevel(zoom);
          }
        });

        // Set manual floor visibility
        view.manualFloorVisibility = true;

        setMapData(data);
        setMapView(view);

        updateFloorsToShow(data);

        // Facades in view listener
        const facadesInView = new Set<string>();
        view.on('facades-in-view-change', (event) => {
          if (isCancelled) return;
          // Do NOT auto-switch floor during directions navigation or setup
          if (useMapStore.getState().directionsMode !== 'none') return;

          const { facades } = event;
          facadesInView.clear();

          if (facades.length > 0) {
            for (const facade of facades) {
              facadesInView.add(facade.id);
            }
            const primaryFacade = facades[0];
            const primaryFloor =
              floorToShowByBuilding.get(primaryFacade.floorStack.id) ??
              primaryFacade.floorStack.defaultFloor;
            if (primaryFloor && primaryFloor.id !== view.currentFloor?.id) {
              view.setFloor(primaryFloor);
            }
          }
        });

        // Floor change listener
        view.on('floor-change', (event) => {
          if (isCancelled) return;
          const { floor: newFloor } = event;
          elevation = newFloor.elevation;
          updateFloorsToShow(data);

          const { activeDirections, directionsMode } = useMapStore.getState();

          if (directionsMode !== 'none' && activeDirections) {
            try {
              view.updateState(newFloor, { visible: true });
              view.Navigation.draw(activeDirections, {
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
            } catch (e) {
              console.warn('Failed to redraw navigation on floor change:', e);
            }
          } else {
            // Keep all facades open so building space colors remain permanent during zoom/pan
            data.getByType('floor-stack').forEach((fs) => {
              showFloors(fs, view);
              if (fs.facade) {
                openFacade(fs.facade, view);
              }
            });

            // Re-apply space colors on floor change for complete color consistency
            applySpaceColors(view, data);
          }

          syncFromMapView(newFloor);
        });

        // Click listener to select room/space and show popup marker on exact location
        view.on('click', (event) => {
          if (isCancelled) return;
          const clickedSpace = event.spaces?.[0];
          if (clickedSpace) {
            useMapStore.getState().selectSearchResult(clickedSpace);
          }
        });

        if (!isCancelled) {
          isInitialized.current = true;
        }
      } catch (err: any) {
        if (isCancelled) return;
        console.error('Failed to initialize Mappedin Map:', err);
        setError(err.message || 'Error loading map');
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    }

    initMap();

    return () => {
      isCancelled = true;
      isInitialized.current = false;
      if (progressiveController) {
        try {
          progressiveController.destroy();
        } catch (e) {}
      }
      if (mapViewInstance) {
        try {
          mapViewInstance.destroy();
        } catch (e) {}
      }
    };
  }, [setMapData, setMapView, setLoading, setError, syncFromMapView, setZoomLevel]);

  return (
    <div className="absolute inset-0 w-full h-full overflow-hidden">
      {isLoading && (
        <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm z-30 flex items-center justify-center">
          <div className="bg-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3">
            <div className="w-5 h-5 border-3 border-teal-500 border-t-transparent rounded-full animate-spin" />
            <span className="font-semibold text-gray-700">Loading Campus Map...</span>
          </div>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 bg-red-950/40 backdrop-blur-sm z-30 flex items-center justify-center p-4">
          <div className="bg-white p-6 rounded-2xl shadow-2xl max-w-md text-center">
            <h3 className="text-lg font-bold text-red-600 mb-2">Error Loading Map</h3>
            <p className="text-sm text-gray-600 mb-4">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-teal-600 text-white font-semibold rounded-xl hover:bg-teal-700 transition"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      <div
        ref={containerRef}
        className="absolute inset-0 w-full h-full"
        style={{ width: '100%', height: '100%', minHeight: '300px' }}
      />
      <ZoomControls />

      {/* Dynamic Floating Floor Indicator Overlay during Navigation */}
      {directionsMode === 'navigating' && currentFloorName && (
        <div className="absolute top-4 right-4 z-20 pointer-events-auto bg-[#5c0628]/95 text-white backdrop-blur-md px-4 py-2.5 rounded-2xl shadow-2xl border border-white/20 flex items-center gap-3 animate-fadeIn">
          <div className="relative flex items-center justify-center">
            <span className="w-3 h-3 rounded-full bg-amber-400 animate-ping absolute" />
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 relative" />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-black uppercase tracking-wider text-rose-200">
              Active Map View
            </span>
            <span className="text-xs font-extrabold tracking-tight">
              {currentFloorName}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};


