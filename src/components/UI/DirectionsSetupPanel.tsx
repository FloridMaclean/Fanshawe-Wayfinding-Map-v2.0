import React, { useState, useRef, useEffect } from 'react';
import { useMapStore, filterAndSortSearchEntries } from '../../store/useMapStore';
import {
  ArrowLeftIcon,
  DotsMenuIcon,
  FrameLocationIcon,
  SwapArrowsIcon,
  WheelchairIcon,
  WalkingIcon,
} from './Icons';

export const DirectionsSetupPanel: React.FC = () => {
  const {
    originLocation,
    destinationLocation,
    isAccessiblePath,
    activeDirections,
    searchItems,
    isLiveLocationActive,
    isOutOfRadius,
    userDistanceToCampus,
    setOriginLocation,
    setDestinationLocation,
    setDirectionsMode,
    setIsAccessiblePath,
    swapOriginAndDestination,
    setUseCurrentLocationAsOrigin,
  } = useMapStore();

  const [isEditingOrigin, setIsEditingOrigin] = useState(false);
  const [isEditingDest, setIsEditingDest] = useState(false);
  const [originFilter, setOriginFilter] = useState('');
  const [destFilter, setDestFilter] = useState('');

  const setupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (setupRef.current && !setupRef.current.contains(event.target as Node)) {
        setIsEditingOrigin(false);
        setIsEditingDest(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const originName =
    originLocation?.name ||
    originLocation?.displayName ||
    originLocation?.title ||
    originLocation?.externalId ||
    'Choose starting point';

  const destName =
    destinationLocation?.name ||
    destinationLocation?.displayName ||
    destinationLocation?.title ||
    destinationLocation?.externalId ||
    'Choose destination';

  // Calculate estimated time from activeDirections or fallback calculation based on distance/walking speed
  const totalMeters = activeDirections?.distance ?? 280; // default ~280 meters if fallback
  const totalMinutes = Math.max(1, Math.round(totalMeters / 70)); // ~70m per min walking speed

  const filteredOriginItems = filterAndSortSearchEntries(searchItems, originFilter);
  const filteredDestItems = filterAndSortSearchEntries(searchItems, destFilter);

  return (
    <div ref={setupRef} className="flex flex-col w-full text-gray-900 animate-fadeIn">
      {/* Top Header */}
      <div className="flex items-center justify-between w-full pb-3 pr-11">
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setDirectionsMode('details')}
            className="p-1.5 rounded-full hover:bg-gray-100 text-gray-700 transition cursor-pointer"
            title="Back to location details"
          >
            <ArrowLeftIcon className="w-5 h-5" />
          </button>
          <h2 className="text-xl font-bold text-gray-900 tracking-tight">Directions</h2>
        </div>
        <button
          className="p-1.5 rounded-full hover:bg-gray-100 text-gray-500 transition cursor-pointer"
          title="More options"
        >
          <DotsMenuIcon className="w-5 h-5" />
        </button>
      </div>

      {/* Origin & Destination Inputs Container */}
      <div className="relative w-full flex flex-col gap-2.5 mt-1">
        {/* Origin input box */}
        <div className="relative w-full">
          <div className="w-full bg-[#f2f2f4] hover:bg-[#eaeaea] transition-colors rounded-2xl px-3.5 py-3 flex items-center gap-3 border border-transparent focus-within:border-blue-500 focus-within:bg-white">
            {/* Visual indicator dot & icon */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className={`w-2 h-2 rounded-full ${originLocation?.isUserLocation ? 'bg-blue-600 animate-pulse' : 'bg-gray-400'}`} />
              <div className="p-1 rounded-lg bg-gray-200/80 text-gray-700">
                <FrameLocationIcon className="w-4 h-4" />
              </div>
            </div>

            {isEditingOrigin ? (
              <input
                type="text"
                autoFocus
                value={originFilter}
                onChange={(e) => setOriginFilter(e.target.value)}
                placeholder="Search origin room..."
                onBlur={() => setTimeout(() => setIsEditingOrigin(false), 200)}
                className="w-full bg-transparent text-sm font-semibold text-gray-900 outline-none"
              />
            ) : (
              <button
                onClick={() => setIsEditingOrigin(true)}
                className="w-full text-left font-semibold text-sm text-gray-900 truncate cursor-pointer"
              >
                {originName}
              </button>
            )}
          </div>

          {/* Autocomplete list for origin */}
          {isEditingOrigin && (
            <div className="absolute top-full -left-2 -right-2 mt-2 max-h-[60vh] overflow-y-auto bg-white rounded-3xl border-2 border-gray-300 shadow-2xl z-50 divide-y divide-gray-100 ring-1 ring-black/15 animate-fadeIn">
              {/* Option 0: Use My Current Location */}
              <button
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  setUseCurrentLocationAsOrigin();
                  setIsEditingOrigin(false);
                }}
                className="w-full text-left px-4 py-3 bg-blue-50/80 hover:bg-blue-100 text-sm font-extrabold text-blue-700 flex justify-between items-center transition cursor-pointer border-b border-blue-100"
              >
                <span className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse" />
                  Use My Current Location
                </span>
                <span className="text-[11px] text-blue-800 bg-blue-200/80 px-2 py-0.5 rounded-md font-bold">
                  {isOutOfRadius ? 'Out of Radius' : 'GPS'}
                </span>
              </button>

              {filteredOriginItems.slice(0, 25).map((entry) => (
                <button
                  key={entry.item.id}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    setOriginLocation(entry.item);
                    setIsEditingOrigin(false);
                  }}
                  className="w-full text-left px-4 py-2.5 hover:bg-blue-50/90 text-sm font-bold text-gray-900 flex justify-between items-center transition cursor-pointer"
                >
                  <span className="truncate pr-2">{entry.roomName}</span>
                  {entry.buildingName && (
                    <span className="text-[11px] text-gray-600 font-semibold bg-gray-100 px-2 py-0.5 rounded-md border border-gray-200 flex-shrink-0">
                      {entry.buildingName}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Destination input box */}
        <div className="relative w-full">
          <div className="w-full bg-[#f2f2f4] hover:bg-[#eaeaea] transition-colors rounded-2xl px-3.5 py-3 flex items-center gap-3 border border-transparent focus-within:border-blue-500 focus-within:bg-white">
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="w-2 h-2 rounded-full bg-blue-600" />
              <div className="p-1 rounded-lg bg-gray-200/80 text-gray-700">
                <FrameLocationIcon className="w-4 h-4" />
              </div>
            </div>

            {isEditingDest ? (
              <input
                type="text"
                autoFocus
                value={destFilter}
                onChange={(e) => setDestFilter(e.target.value)}
                placeholder="Search destination..."
                onBlur={() => setTimeout(() => setIsEditingDest(false), 200)}
                className="w-full bg-transparent text-sm font-semibold text-gray-900 outline-none"
              />
            ) : (
              <button
                onClick={() => setIsEditingDest(true)}
                className="w-full text-left font-semibold text-sm text-gray-900 truncate cursor-pointer"
              >
                {destName}
              </button>
            )}
          </div>

          {/* Autocomplete list for destination */}
          {isEditingDest && (
            <div className="absolute top-full -left-2 -right-2 mt-2 max-h-[60vh] overflow-y-auto bg-white rounded-3xl border-2 border-gray-300 shadow-2xl z-50 divide-y divide-gray-100 ring-1 ring-black/15 animate-fadeIn">
              {filteredDestItems.slice(0, 25).map((entry) => (
                <button
                  key={entry.item.id}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    setDestinationLocation(entry.item);
                    setIsEditingDest(false);
                  }}
                  className="w-full text-left px-4 py-2.5 hover:bg-blue-50/90 text-sm font-bold text-gray-900 flex justify-between items-center transition cursor-pointer"
                >
                  <span className="truncate pr-2">{entry.roomName}</span>
                  {entry.buildingName && (
                    <span className="text-[11px] text-gray-600 font-semibold bg-gray-100 px-2 py-0.5 rounded-md border border-gray-200 flex-shrink-0">
                      {entry.buildingName}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Swap button floating on the right side */}
        <button
          onClick={swapOriginAndDestination}
          className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white border border-gray-200 shadow-md flex items-center justify-center text-gray-600 hover:bg-gray-50 active:scale-95 transition cursor-pointer z-10"
          title="Swap origin and destination"
        >
          <SwapArrowsIcon className="w-4 h-4" />
        </button>
      </div>

      {/* Out of Radius Notice Card */}
      {(isOutOfRadius || originLocation?.isOutOfRadius) && (
        <div className="w-full bg-amber-50/90 border border-amber-300/80 rounded-2xl p-3.5 mt-3 flex flex-col gap-1.5 animate-fadeIn shadow-2xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-amber-900 font-extrabold text-xs uppercase tracking-wider">
              <span className="text-sm">⚠️</span>
              <span>Out of Radius</span>
            </div>
            <span className="text-[10px] font-bold text-amber-900 bg-amber-200/80 px-2 py-0.5 rounded-md border border-amber-300">
              {userDistanceToCampus ? `${(userDistanceToCampus / 1000).toFixed(1)} km away` : 'Too far away'}
            </span>
          </div>
          <p className="text-xs text-amber-800 font-medium leading-tight">
            You are currently too far away from Fanshawe College for live GPS navigation.
          </p>
        </div>
      )}

      {/* Divider */}
      <hr className="border-gray-100 my-4" />

      {/* Route Options Section */}
      <div className="flex items-center justify-between w-full">
        <span className="text-base font-bold text-gray-900">Route Options</span>

        {/* Accessible Path Toggle Button */}
        <button
          onClick={() => setIsAccessiblePath(!isAccessiblePath)}
          className={`relative inline-flex items-center h-8 rounded-full w-14 transition-colors cursor-pointer p-0.5 border ${
            isAccessiblePath
              ? 'bg-blue-600 border-blue-600 justify-end'
              : 'bg-gray-200 border-gray-300 justify-start'
          }`}
          title={isAccessiblePath ? 'Accessible route enabled' : 'Toggle accessible route'}
        >
          <span className="w-7 h-7 rounded-full bg-white shadow-md flex items-center justify-center text-gray-700 transition-transform">
            <WheelchairIcon className={`w-4 h-4 ${isAccessiblePath ? 'text-blue-600' : 'text-gray-500'}`} />
          </span>
        </button>
      </div>

      {/* Route Summary Box */}
      <div className="mt-5 w-full bg-white border border-gray-200/90 rounded-3xl p-4 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-2xl bg-gray-100 text-gray-900 flex items-center justify-center">
            <WalkingIcon className="w-6 h-6" />
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-extrabold text-gray-900 leading-tight">
              {totalMinutes} {totalMinutes === 1 ? 'minute' : 'minutes'}
            </span>
            <span className="text-xs text-gray-500 font-medium">To {destName}</span>
          </div>
        </div>

        <button
          onClick={() => setDirectionsMode('navigating')}
          className="px-7 py-2.5 bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded-full font-bold text-sm shadow-md shadow-blue-500/20 active:scale-95 transition cursor-pointer"
        >
          Start
        </button>
      </div>
    </div>
  );
};
