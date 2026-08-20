import React from 'react';
import { useMapStore } from '../../store/useMapStore';
import {
  WashroomIcon,
  ElevatorIcon,
  StairsIcon,
  AmenityIcon,
  WaterIcon,
  RoomIcon,
  LocationPinIcon,
  ClearIcon,
} from './Icons';

export function getItemCategoryInfo(item: any): {
  icon: React.FC<{ className?: string }>;
  label: string;
  colorClass: string;
} {
  const name = (item.name || item.displayName || item.title || '').toLowerCase();
  const type = (item.type || '').toLowerCase();

  if (
    name.includes('washroom') ||
    name.includes('restroom') ||
    name.includes('toilet') ||
    name.includes('bathroom')
  ) {
    return {
      icon: WashroomIcon,
      label: 'Washroom',
      colorClass: 'bg-emerald-100 text-emerald-900 border-emerald-300',
    };
  }
  if (name.includes('elevator') || name.includes('lift')) {
    return {
      icon: ElevatorIcon,
      label: 'Elevator',
      colorClass: 'bg-blue-100 text-blue-900 border-blue-300',
    };
  }
  if (name.includes('stairs') || name.includes('stairwell')) {
    return {
      icon: StairsIcon,
      label: 'Stairs',
      colorClass: 'bg-amber-100 text-amber-900 border-amber-300',
    };
  }
  if (
    name.includes('cafe') ||
    name.includes('food') ||
    name.includes('dining') ||
    name.includes('tim hortons') ||
    name.includes('subway')
  ) {
    return {
      icon: AmenityIcon,
      label: 'Dining / Amenity',
      colorClass: 'bg-orange-100 text-orange-900 border-orange-300',
    };
  }
  if (
    name.includes('water') ||
    name.includes('fountain') ||
    name.includes('refill')
  ) {
    return {
      icon: WaterIcon,
      label: 'Water Station',
      colorClass: 'bg-cyan-100 text-cyan-900 border-cyan-300',
    };
  }
  if (
    name.match(/\b[a-z]{1,2}\d{3,4}\b/) ||
    name.includes('room') ||
    name.includes('lab') ||
    name.includes('office') ||
    type === 'room'
  ) {
    return {
      icon: RoomIcon,
      label: 'Room / Office',
      colorClass: 'bg-teal-100 text-teal-900 border-teal-300',
    };
  }
  return {
    icon: LocationPinIcon,
    label: 'Location',
    colorClass: 'bg-gray-100 text-gray-900 border-gray-300',
  };
}

export const SearchResults: React.FC = () => {
  const { searchResults, isSearchFocused, searchQuery, selectSearchResult, setSearchFocused } =
    useMapStore();

  if (!isSearchFocused) return null;

  return (
    <div
      onMouseDown={(e) => e.preventDefault()}
      className="absolute top-full -left-2 -right-2 mt-2.5 max-h-[70vh] overflow-y-auto bg-white border-2 border-gray-300 rounded-3xl shadow-2xl z-50 divide-y divide-gray-100 flex flex-col ring-1 ring-black/15 animate-fadeIn"
    >
      {/* Header bar showing count & close button */}
      <div className="sticky top-0 bg-gray-100/95 backdrop-blur-sm px-4 py-2 border-b border-gray-200 flex items-center justify-between text-xs font-extrabold text-gray-800 uppercase tracking-wider z-10">
        <span>
          {searchQuery.trim()
            ? `Found ${searchResults.length} location${searchResults.length === 1 ? '' : 's'}`
            : `All Campus Locations (${searchResults.length})`}
        </span>
        <button
          onClick={() => setSearchFocused(false)}
          className="p-1 rounded-full text-gray-500 hover:text-gray-900 hover:bg-gray-200 transition-colors cursor-pointer flex items-center justify-center"
          title="Close list"
          aria-label="Close location list"
        >
          <ClearIcon className="w-4 h-4" />
        </button>
      </div>

      {searchResults.length === 0 ? (
        <div className="p-5 text-center text-xs text-gray-600 font-semibold">
          No matching rooms or locations found.
        </div>
      ) : (
        searchResults.slice(0, 50).map((item, index) => {
          const title =
            item.name || item.displayName || item.title || item.externalId || 'Unnamed Location';
          const floor =
            item.floor ||
            item.location?.floor ||
            (Array.isArray(item.locations) && item.locations[0]?.floor);
          const buildingName = floor?.floorStack?.name;
          const floorName = floor?.name;
          const category = getItemCategoryInfo(item);
          const CategoryIcon = category.icon;

          return (
            <button
              key={item.id || index}
              onClick={() => selectSearchResult(item)}
              className="w-full text-left px-4 py-3 hover:bg-teal-50/90 active:bg-teal-100 transition-colors flex items-center gap-3.5 group cursor-pointer"
            >
              <span className="p-2 rounded-xl bg-gray-100 text-gray-700 group-hover:bg-teal-600 group-hover:text-white transition-colors flex-shrink-0">
                <CategoryIcon className="w-4 h-4" />
              </span>
              <div className="flex flex-col flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-xs sm:text-sm text-gray-900 truncate group-hover:text-teal-950">
                    {title}
                  </span>
                  <span
                    className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md border ${category.colorClass} flex-shrink-0`}
                  >
                    {category.label}
                  </span>
                </div>
                {(buildingName || floorName) && (
                  <span className="text-xs text-gray-600 font-semibold truncate mt-0.5">
                    {[buildingName, floorName ? `Floor: ${floorName}` : null]
                      .filter(Boolean)
                      .join(' • ')}
                  </span>
                )}
              </div>
            </button>
          );
        })
      )}
    </div>
  );
};
