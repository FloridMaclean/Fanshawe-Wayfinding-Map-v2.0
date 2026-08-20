import React, { useRef, useEffect } from 'react';
import { useMapStore } from '../../store/useMapStore';
import { BuildingFloorSelect } from './BuildingFloorSelect';
import { SearchResults } from './SearchResults';
import { LocationDetailsPanel } from './LocationDetailsPanel';
import { DirectionsSetupPanel } from './DirectionsSetupPanel';
import { NavigationStepsPanel } from './NavigationStepsPanel';
import {
  SearchIcon,
  WashroomIcon,
  ParkingIcon,
  UtensilsIcon,
  StudyLabIcon,
  StudentServicesIcon,
  BookIcon,
  ClearIcon,
} from './Icons';

export const SearchPanel: React.FC = () => {
  const {
    isCollapsed,
    toggleCollapsed,
    searchQuery,
    setSearchQuery,
    setSearchFocused,
    directionsMode,
  } = useMapStore();

  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setSearchFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [setSearchFocused]);

  const quickFilters = [
    { label: 'Washrooms', fullLabel: 'Washrooms', query: 'Washroom', icon: WashroomIcon },
    { label: 'Parking', fullLabel: 'Parking', query: 'Parking', icon: ParkingIcon },
    { label: 'Cafes & Dining', fullLabel: 'Cafes & Dining', query: 'Cafe', icon: UtensilsIcon },
    { label: 'Study Labs', fullLabel: 'Study Labs', query: 'Lab', icon: StudyLabIcon },
    { label: 'Student Serv...', fullLabel: 'Student Services', query: 'Service', icon: StudentServicesIcon },
    { label: 'Career Devel...', fullLabel: 'Career Development', query: 'Career', icon: BookIcon },
  ];

  const isNavigating = directionsMode === 'navigating';

  return (
    <>
      {/* On Mobile Navigation: NavigationStepsPanel handles fixed floating panels directly */}
      {isNavigating && (
        <div className="block md:hidden">
          <NavigationStepsPanel />
        </div>
      )}

      {/* Main Panel Container for Desktop or non-navigating mobile views */}
      <div
        className={`absolute top-4 left-4 z-20 pointer-events-none ${
          isNavigating ? 'hidden md:block' : 'block'
        }`}
        style={{ position: 'absolute', top: '16px', left: '16px', zIndex: 30, pointerEvents: 'none' }}
      >
        <div
          ref={panelRef}
          className={`pointer-events-auto relative transition-all duration-300 ease-in-out ${
            isCollapsed
              ? 'w-12 h-12 rounded-2xl bg-white/95 backdrop-blur-md shadow-lg border border-gray-100 flex items-center justify-center'
              : 'w-80 sm:w-[350px] p-4 bg-white/95 backdrop-blur-md rounded-3xl shadow-xl border border-gray-100/90 flex flex-col gap-3.5 overflow-visible'
          }`}
        >
          {/* Toggle Button */}
          <button
            onClick={toggleCollapsed}
            title={isCollapsed ? 'Expand panel' : 'Collapse panel'}
            className={`transition-all flex items-center justify-center font-bold text-gray-600 bg-white hover:bg-gray-100 border border-gray-200/90 shadow-sm cursor-pointer ${
              isCollapsed
                ? 'w-full h-full rounded-2xl text-lg'
                : 'absolute right-4 top-4 w-9 h-9 rounded-full text-sm font-extrabold z-30 bg-gray-100 hover:bg-gray-200/80'
            }`}
          >
            {isCollapsed ? '»' : '«'}
          </button>

          {!isCollapsed && (
            <>
              {directionsMode === 'details' ? (
                <LocationDetailsPanel />
              ) : directionsMode === 'setup' ? (
                <DirectionsSetupPanel />
              ) : directionsMode === 'navigating' ? (
                <NavigationStepsPanel />
              ) : (
                <>
                  {/* Logo & Header */}
                <div className="w-full flex justify-center pt-0.5 pb-1">
                  <img
                    src="https://www.fanshawec.ca/themes/custom/de_theme/logo.png"
                    alt="Fanshawe Logo"
                    className="h-8 object-contain"
                  />
                </div>

                {/* Building & Floor Selection */}
                <BuildingFloorSelect />

                {/* Minimalist Search Section */}
                <div className="relative w-full flex flex-col gap-3 pt-0.5">
                  {/* Minimalist Search Input Bar */}
                  <div className="relative flex items-center w-full bg-[#f0f0f2] hover:bg-[#eaeaea] focus-within:bg-white focus-within:ring-2 focus-within:ring-teal-500/30 focus-within:border-teal-500 border border-transparent rounded-full transition-all">
                    <SearchIcon className="w-4 h-4 text-gray-500 ml-4 flex-shrink-0" />
                    <input
                      type="text"
                      placeholder="Search the campus..."
                      value={searchQuery}
                      onFocus={() => setSearchFocused(true)}
                      onBlur={() => {
                        setTimeout(() => setSearchFocused(false), 200);
                      }}
                      onChange={(e) => {
                        setSearchFocused(true);
                        setSearchQuery(e.target.value);
                      }}
                      className="w-full py-2.5 pl-2.5 pr-8 text-xs sm:text-[13px] font-normal text-gray-800 placeholder-gray-500 bg-transparent border-none outline-none focus:outline-none"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => {
                          setSearchQuery('');
                          setSearchFocused(false);
                        }}
                        className="absolute right-3 text-gray-400 hover:text-gray-600 cursor-pointer p-1"
                        title="Clear search"
                      >
                        <ClearIcon className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* 2-Column Grid Minimalist Category Cards */}
                  <div className="grid grid-cols-2 gap-2.5 w-full">
                    {quickFilters.map((filter) => {
                      const IconComp = filter.icon;
                      const isActive =
                        searchQuery.toLowerCase().includes(filter.query.toLowerCase());
                      return (
                        <button
                          key={filter.query}
                          title={filter.fullLabel}
                          onClick={() => {
                            setSearchFocused(true);
                            setSearchQuery(isActive ? '' : filter.query);
                          }}
                          className={`px-3 py-2.5 text-xs sm:text-[13px] font-medium rounded-2xl transition-all border cursor-pointer flex items-center gap-2.5 text-left w-full shadow-sm ${
                            isActive
                              ? 'bg-teal-50 text-teal-900 border-teal-400 font-semibold shadow-sm'
                              : 'bg-white text-gray-700 border-gray-200/90 hover:bg-gray-50 hover:border-gray-300'
                          }`}
                        >
                          <IconComp
                            className={`w-4 h-4 flex-shrink-0 ${
                              isActive ? 'text-teal-600' : 'text-gray-500'
                            }`}
                          />
                          <span className="truncate tracking-tight">{filter.label}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Dropdown Search Results */}
                  <SearchResults />
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  </>
);

};


