import React, { useState, useRef, useEffect } from 'react';
import { useMapStore } from '../../store/useMapStore';
import { getItemCategoryInfo } from './SearchResults';
import {
  FrameLocationIcon,
  ShareIcon,
  ClearIcon,
  CopyIcon,
  QrCodeIcon,
  CheckIcon,
} from './Icons';

export const LocationDetailsPanel: React.FC = () => {
  const { selectedLocation, setDirectionsMode, closeLocationPanel, openQrModal } = useMapStore();
  const [isShareMenuOpen, setIsShareMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const shareMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (shareMenuRef.current && !shareMenuRef.current.contains(event.target as Node)) {
        setIsShareMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!selectedLocation) return null;

  const title =
    selectedLocation.name ||
    selectedLocation.displayName ||
    selectedLocation.title ||
    selectedLocation.externalId ||
    'Selected Location';

  const floor =
    selectedLocation.floor ||
    selectedLocation.location?.floor ||
    (Array.isArray(selectedLocation.locations) && selectedLocation.locations[0]?.floor);
  const buildingName = floor?.floorStack?.name || 'Campus Building';
  const floorName = floor?.name || 'Ground';

  const category = getItemCategoryInfo(selectedLocation);
  const subtitle = `${buildingName}${floorName ? `, Floor: ${floorName}` : ''}`;
  const locationId =
    selectedLocation.name ||
    selectedLocation.displayName ||
    selectedLocation.title ||
    selectedLocation.externalId ||
    selectedLocation.id ||
    title;

  const shareUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}${window.location.pathname}?location=${encodeURIComponent(locationId)}`
      : 'https://fanshawec.ca';

  const handleCopyLink = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareUrl);
    }
    setCopied(true);
    setTimeout(() => {
      setCopied(false);
      setIsShareMenuOpen(false);
    }, 1800);
  };

  return (
    <div className="flex flex-col w-full text-gray-900 animate-fadeIn">
      {/* Top action row */}
      <div className="flex items-center justify-between w-full mb-3 pr-11">
        <div className="w-12 h-12 rounded-2xl bg-gray-50 border border-gray-200/90 flex items-center justify-center shadow-sm">
          <FrameLocationIcon className="w-6 h-6 text-gray-700" />
        </div>
        <div className="flex items-center gap-2 relative" ref={shareMenuRef}>
          <button
            onClick={() => setIsShareMenuOpen(!isShareMenuOpen)}
            className={`w-9 h-9 rounded-full flex items-center justify-center transition cursor-pointer ${
              isShareMenuOpen
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-gray-100 hover:bg-gray-200/80 text-gray-600'
            }`}
            title="Share location options"
          >
            <ShareIcon className="w-4 h-4" />
          </button>

          {/* Share Dropdown Menu */}
          {isShareMenuOpen && (
            <div className="absolute right-0 top-11 z-50 w-56 bg-white border border-gray-200/90 rounded-2xl shadow-xl p-1.5 flex flex-col gap-1 animate-fadeIn ring-1 ring-black/5">
              {/* Option 1: Copy link */}
              <button
                onClick={handleCopyLink}
                className="w-full text-left px-3 py-2.5 hover:bg-gray-100/80 rounded-xl flex items-center gap-3 transition cursor-pointer group"
              >
                <div className="p-2 rounded-lg bg-gray-100 group-hover:bg-blue-100 text-gray-700 group-hover:text-blue-600 transition flex-shrink-0">
                  {copied ? (
                    <CheckIcon className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <CopyIcon className="w-4 h-4" />
                  )}
                </div>
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="text-xs font-bold text-gray-900 leading-tight">
                    {copied ? 'Link Copied!' : 'Copy link'}
                  </span>
                  <span className="text-[10px] text-gray-500 font-medium truncate mt-0.5">
                    {copied ? 'Copied to clipboard' : 'Copy location URL'}
                  </span>
                </div>
              </button>

              {/* Option 2: QR code */}
              <button
                onClick={() => {
                  setIsShareMenuOpen(false);
                  openQrModal(shareUrl);
                }}
                className="w-full text-left px-3 py-2.5 hover:bg-gray-100/80 rounded-xl flex items-center gap-3 transition cursor-pointer group"
              >
                <div className="p-2 rounded-lg bg-gray-100 group-hover:bg-blue-100 text-gray-700 group-hover:text-blue-600 transition flex-shrink-0">
                  <QrCodeIcon className="w-4 h-4" />
                </div>
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="text-xs font-bold text-gray-900 leading-tight">
                    QR code
                  </span>
                  <span className="text-[10px] text-gray-500 font-medium truncate mt-0.5">
                    Mobile handoff QR code
                  </span>
                </div>
              </button>
            </div>
          )}

          {/* Close details button */}
          <button
            onClick={closeLocationPanel}
            className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200/80 flex items-center justify-center text-gray-600 transition cursor-pointer"
            title="Close details"
          >
            <ClearIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Location Title & Subtitle */}
      <h2 className="text-2xl font-bold text-gray-900 tracking-tight leading-tight">{title}</h2>
      <div className="text-sm text-gray-600 font-medium mt-1 flex items-center gap-2 flex-wrap">
        <span>{subtitle}</span>
      </div>

      {/* Directions Primary CTA Button */}
      <button
        onClick={() => setDirectionsMode('setup')}
        className="w-full mt-5 mb-4 py-3 px-4 bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded-2xl font-semibold text-base shadow-md shadow-blue-500/20 active:scale-[0.99] transition cursor-pointer flex items-center justify-center gap-2"
      >
        Directions
      </button>

      {/* Categories Section */}
      <div className="pt-3.5">
        <h3 className="text-base font-bold text-gray-900 mb-2">Categories</h3>
        <div className="flex flex-wrap gap-2">
          <span className="px-3.5 py-1.5 bg-gray-100/90 hover:bg-gray-200/80 text-gray-800 rounded-xl text-xs font-medium border border-gray-200/60 transition">
            {category.label === 'Location' ? 'Classrooms & Smart Rooms' : category.label}
          </span>
        </div>
      </div>
    </div>
  );
};
