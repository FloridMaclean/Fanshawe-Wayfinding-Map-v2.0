import React from 'react';
import { useMapStore } from '../../store/useMapStore';

export const ZoomControls: React.FC = () => {
  const { mapView, directionsMode } = useMapStore();
  const isNavigating = directionsMode === 'navigating';

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
    <div
      className={`absolute z-20 flex flex-col bg-white/85 backdrop-blur-md rounded-2xl shadow-xl border border-white/50 p-1 gap-1 transition-all duration-300 ${
        isNavigating ? 'bottom-56 right-4 md:bottom-6 md:right-6' : 'bottom-6 right-6'
      }`}
    >
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


