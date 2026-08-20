import React from 'react';
import { useMapStore } from '../../store/useMapStore';
import { BuildingIcon, FloorIcon } from './Icons';

export const BuildingFloorSelect: React.FC = () => {
  const {
    floorStacks,
    floors,
    selectedBuildingId,
    selectedFloorId,
    setBuilding,
    setFloor,
  } = useMapStore();

  return (
    <div className="grid grid-cols-2 gap-2.5 w-full">
      {/* Building Selector */}
      <div className="flex flex-col flex-1 min-w-0">
        <label className="text-[11px] font-extrabold text-gray-900 uppercase tracking-wider mb-1 flex items-center gap-1.5">
          <BuildingIcon className="w-4 h-4 text-teal-600 flex-shrink-0" />
          <span className="truncate">Buildings</span>
        </label>
        <div className="relative w-full">
          <select
            value={selectedBuildingId}
            onChange={(e) => setBuilding(e.target.value)}
            className="w-full pl-3 pr-8 py-2.5 text-xs sm:text-[13px] font-bold bg-white text-gray-900 border-2 border-gray-200 hover:border-teal-500 focus:border-teal-600 rounded-2xl shadow-sm appearance-none outline-none transition-all cursor-pointer truncate"
          >
            <option value="" className="text-gray-500 font-medium">
              Select building...
            </option>
            {floorStacks.map((fs) => (
              <option key={fs.id} value={fs.id} className="text-gray-900 font-bold py-1">
                {fs.name}
              </option>
            ))}
          </select>
          {/* Custom Chevron Arrow */}
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-600">
            <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20">
              <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
            </svg>
          </div>
        </div>
      </div>

      {/* Floor Selector */}
      <div className="flex flex-col flex-1 min-w-0">
        <label className="text-[11px] font-extrabold text-gray-900 uppercase tracking-wider mb-1 flex items-center gap-1.5">
          <FloorIcon className="w-4 h-4 text-teal-600 flex-shrink-0" />
          <span className="truncate">Floors</span>
        </label>
        <div className="relative w-full">
          <select
            value={selectedFloorId}
            onChange={(e) => setFloor(e.target.value)}
            className="w-full pl-3 pr-8 py-2.5 text-xs sm:text-[13px] font-bold bg-white text-gray-900 border-2 border-gray-200 hover:border-teal-500 focus:border-teal-600 rounded-2xl shadow-sm appearance-none outline-none transition-all cursor-pointer truncate"
          >
            <option value="" className="text-gray-500 font-medium">
              Select floor...
            </option>
            {floors.map((f) => (
              <option key={f.id} value={f.id} className="text-gray-900 font-bold py-1">
                {f.name}
              </option>
            ))}
          </select>
          {/* Custom Chevron Arrow */}
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-600">
            <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20">
              <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
};
