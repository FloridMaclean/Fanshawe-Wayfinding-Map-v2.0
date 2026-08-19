import React from 'react';
import { useMapStore } from '../../store/useMapStore';
import { LocationPinIcon } from './Icons';

export const ZoomControls: React.FC = () => {
  const {
    mapView,
    isLiveLocationActive,
    isOutOfRadius,
    isSimulationActive,
    isFollowingUser,
    toggleLiveLocation,
    toggleFollowUser,
    toggleSimulationMode,
  } = useMapStore();

  const handleZoomIn = () => {
    if (!mapView) return;
    const currentZoom = mapView.Camera.zoomLevel;
    const maxZoom = mapView.Camera.maxZoomLevel ?? 22;
    const targetZoom = Math.min(currentZoom + 1, maxZoom);
    mapView.Camera.animateTo({ zoomLevel: targetZoom }, { duration: 300 });
  };

  const handleZoomOut = () => {
    if (!mapView) return;
    const currentZoom = mapView.Camera.zoomLevel;
    const minZoom = mapView.Camera.minZoomLevel ?? 0;
    const targetZoom = Math.max(currentZoom - 1, minZoom);
    mapView.Camera.animateTo({ zoomLevel: targetZoom }, { duration: 300 });
  };

  return (
    <div className="absolute bottom-6 right-6 z-20 flex flex-col bg-white/85 backdrop-blur-md rounded-2xl shadow-xl border border-white/50 p-1 gap-1">
      {/* Live Location Toggle Button */}
      <button
        onClick={toggleLiveLocation}
        title={
          isSimulationActive
            ? 'Campus Walking Simulation Active'
            : isLiveLocationActive
            ? isOutOfRadius
              ? 'Live location active (Out of Radius)'
              : 'Live location active'
            : 'Enable live location'
        }
        className={`relative w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 cursor-pointer ${
          isSimulationActive
            ? 'bg-purple-600 text-white shadow-md shadow-purple-500/30'
            : isLiveLocationActive
            ? isOutOfRadius
              ? 'bg-amber-500 text-white shadow-md shadow-amber-500/30'
              : 'bg-blue-600 text-white shadow-md shadow-blue-500/30'
            : 'text-gray-700 hover:text-blue-600 hover:bg-blue-50/80 active:scale-90'
        }`}
        aria-label="Toggle Live Location"
      >
        <LocationPinIcon className="w-5 h-5" />

        {/* Pulsing indicator when active */}
        {(isLiveLocationActive || isSimulationActive) && (
          <span
            className={`absolute top-1 right-1 w-2.5 h-2.5 rounded-full animate-ping ${
              isSimulationActive
                ? 'bg-purple-300'
                : isOutOfRadius
                ? 'bg-amber-300'
                : 'bg-blue-300'
            }`}
          />
        )}
      </button>

      {/* Recenter & Follow Camera Toggle Button (visible when live location or simulation is active) */}
      {(isLiveLocationActive || isSimulationActive) && (
        <>
          <div className="h-[1px] w-6 bg-gray-200/80 mx-auto" />
          <button
            onClick={toggleFollowUser}
            title={isFollowingUser ? 'Camera Following Live Location (Click to Unfollow)' : 'Follow Live Location with Camera'}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 cursor-pointer ${
              isFollowingUser
                ? 'bg-teal-600 text-white shadow-md shadow-teal-600/30 font-bold'
                : 'text-gray-700 hover:text-teal-600 hover:bg-teal-50/80 active:scale-90'
            }`}
            aria-label="Toggle Camera Follow"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.2}
                d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
            </svg>
          </button>
        </>
      )}

      {/* Walking Simulation Mode Toggle Button */}
      {isLiveLocationActive && (
        <>
          <div className="h-[1px] w-6 bg-gray-200/80 mx-auto" />
          <button
            onClick={toggleSimulationMode}
            title={isSimulationActive ? 'Stop Campus Walking Simulation' : 'Start Campus Walking Simulation Demo'}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 cursor-pointer ${
              isSimulationActive
                ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30 font-bold animate-pulse'
                : 'text-gray-700 hover:text-purple-600 hover:bg-purple-50/80 active:scale-90'
            }`}
            aria-label="Toggle Walking Simulation"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
          </button>
        </>
      )}

      <div className="h-[1px] w-6 bg-gray-200/80 mx-auto" />

      <button
        onClick={handleZoomIn}
        disabled={!mapView}
        title="Zoom in"
        className="w-10 h-10 rounded-xl flex items-center justify-center text-gray-700 hover:text-teal-600 hover:bg-teal-50/80 active:scale-90 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 cursor-pointer"
        aria-label="Zoom in"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
        </svg>
      </button>

      <div className="h-[1px] w-6 bg-gray-200/80 mx-auto" />

      <button
        onClick={handleZoomOut}
        disabled={!mapView}
        title="Zoom out"
        className="w-10 h-10 rounded-xl flex items-center justify-center text-gray-700 hover:text-teal-600 hover:bg-teal-50/80 active:scale-90 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 cursor-pointer"
        aria-label="Zoom out"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M20 12H4" />
        </svg>
      </button>
    </div>
  );
};


