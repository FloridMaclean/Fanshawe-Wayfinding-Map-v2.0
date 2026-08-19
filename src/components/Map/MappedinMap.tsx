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
import { BlueDot } from '@mappedin/blue-dot';
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
    setBlueDot,
    setLoading,
    setError,
    syncFromMapView,
    setZoomLevel,
    isLoading,
    error,
    directionsMode,
    selectedFloorId,
    floors,
    isLiveLocationActive,
    isOutOfRadius,
    userDistanceToCampus,
    isSimulationActive,
    toggleSimulationMode,
    stopSimulationMode,
  } = useMapStore();

  const currentFloor = floors.find((f) => f.id === selectedFloorId);
  const currentFloorName = currentFloor?.name || '';

  useEffect(() => {
    if (!containerRef.current || isInitialized.current) return;
    isInitialized.current = true;

    let mapViewInstance: MapView | null = null;
    let blueDotInstance: BlueDot | null = null;
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

    async function initMap() {
      try {
        setLoading(true);
        setError(null);

        const data = await getMapData({
          key: MAPPEDIN_KEY,
          secret: MAPPEDIN_SECRET,
          mapId: MAP_ID,
        });

        if (!containerRef.current) return;

        const view = await show3dMap(containerRef.current, data);
        mapViewInstance = view;

        // Initialize Mappedin native BlueDot extension
        try {
          blueDotInstance = new BlueDot(view);
          setBlueDot(blueDotInstance);
        } catch (bdErr) {
          console.warn('Could not initialize Mappedin BlueDot extension:', bdErr);
        }

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
          const { floor: newFloor } = event;
          elevation = newFloor.elevation;
          updateFloorsToShow(data);

          // Keep all facades open so building space colors remain permanent during zoom/pan
          data.getByType('floor-stack').forEach((fs) => {
            showFloors(fs, view);
            if (fs.facade) {
              openFacade(fs.facade, view);
            }
          });

          // Re-apply space colors on floor change for complete color consistency
          applySpaceColors(view, data);

          syncFromMapView(newFloor);
        });

        // Click listener to select room/space and show popup marker on exact location
        view.on('click', (event) => {
          const clickedSpace = event.spaces?.[0];
          if (clickedSpace) {
            useMapStore.getState().selectSearchResult(clickedSpace);
          }
        });
      } catch (err: any) {
        console.error('Failed to initialize Mappedin Map:', err);
        setError(err.message || 'Error loading map');
      } finally {
        setLoading(false);
      }
    }

    initMap();

    return () => {
      if (progressiveController) {
        progressiveController.destroy();
      }
      if (blueDotInstance) {
        try {
          blueDotInstance.destroy();
        } catch (e) {}
      }
      if (mapViewInstance) {
        try {
          mapViewInstance.destroy();
        } catch (e) {}
      }
    };
  }, [setMapData, setMapView, setBlueDot, setLoading, setError, syncFromMapView]);

  return (
    <div className="relative w-full h-full flex-1 overflow-hidden">
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

      <div ref={containerRef} className="w-full h-full" />
      <ZoomControls />

      {/* Floating Out of Radius Banner */}
      {isLiveLocationActive && isOutOfRadius && !isSimulationActive && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 pointer-events-auto bg-amber-950/95 text-white backdrop-blur-md px-4 py-3 rounded-2xl shadow-2xl border border-amber-400/40 flex flex-col sm:flex-row sm:items-center gap-3 animate-fadeIn max-w-[92vw] sm:max-w-lg">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-8 h-8 rounded-full bg-amber-500/30 flex items-center justify-center flex-shrink-0 text-amber-300 font-extrabold text-base">
              ⚠️
            </div>
            <div className="flex flex-col flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-amber-200 uppercase tracking-wide">
                  Out of Campus Radius
                </span>
                {userDistanceToCampus && (
                  <span className="text-[10px] font-bold bg-amber-900/80 px-2 py-0.5 rounded-md border border-amber-500/30 text-amber-300">
                    {(userDistanceToCampus / 1000).toFixed(1)} km away
                  </span>
                )}
              </div>
              <p className="text-[11px] text-amber-100 font-medium leading-tight mt-0.5">
                You are off campus. Switch to Simulation Demo to preview live walking positioning.
              </p>
            </div>
          </div>
          <button
            onClick={toggleSimulationMode}
            className="px-3 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center justify-center gap-1.5 self-end sm:self-auto cursor-pointer"
          >
            <span>▶</span> Test Walking Demo
          </button>
        </div>
      )}

      {/* Floating Active Simulation Banner */}
      {isSimulationActive && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 pointer-events-auto bg-purple-950/95 text-white backdrop-blur-md px-4 py-2.5 rounded-2xl shadow-2xl border border-purple-400/40 flex items-center gap-3 animate-fadeIn max-w-[92vw] sm:max-w-md">
          <div className="relative flex items-center justify-center">
            <span className="w-3 h-3 rounded-full bg-purple-400 animate-ping absolute" />
            <span className="w-2.5 h-2.5 rounded-full bg-purple-300 relative" />
          </div>
          <div className="flex flex-col flex-1 min-w-0">
            <span className="text-[10px] font-black uppercase tracking-wide text-purple-200">
              Campus Walking Simulation
            </span>
            <p className="text-[11px] text-purple-100 font-medium leading-tight mt-0.5 truncate">
              Simulating live indoor GPS walking across Fanshawe Campus
            </p>
          </div>
          <button
            onClick={stopSimulationMode}
            className="px-2.5 py-1 bg-white/20 hover:bg-white/30 text-white font-bold text-xs rounded-lg transition cursor-pointer flex-shrink-0"
          >
            Stop Demo
          </button>
        </div>
      )}

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

