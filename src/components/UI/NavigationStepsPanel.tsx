import React, { useState, useRef, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useMapStore } from '../../store/useMapStore';
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  TurnLeftIcon,
  TurnRightIcon,
  TurnSlightLeftIcon,
  StairsIcon,
  LocationPinIcon,
  CheckIcon,
  ShareIcon,
  CopyIcon,
  QrCodeIcon,
  ClearIcon,
} from './Icons';

interface Step {
  id: number;
  instruction: string;
  duration: string;
  distanceText?: string;
  floorTag?: string;
  isFloorChange?: boolean;
  icon: React.FC<{ className?: string }>;
}

export const NavigationStepsPanel: React.FC = () => {
  const {
    originLocation,
    destinationLocation,
    activeDirections,
    activeStepIndex,
    isLiveLocationActive,
    isOutOfRadius,
    setActiveStepIndex,
    setDirectionsMode,
    clearDirections,
  } = useMapStore();

  const [isShareMenuOpen, setIsShareMenuOpen] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
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

  const originName =
    originLocation?.name ||
    originLocation?.displayName ||
    originLocation?.title ||
    originLocation?.externalId ||
    'Start Location';

  const destName =
    destinationLocation?.name ||
    destinationLocation?.displayName ||
    destinationLocation?.title ||
    destinationLocation?.externalId ||
    'Destination';

  const originId =
    originLocation?.name ||
    originLocation?.displayName ||
    originLocation?.title ||
    originLocation?.externalId ||
    originLocation?.id ||
    originName;

  const destId =
    destinationLocation?.name ||
    destinationLocation?.displayName ||
    destinationLocation?.title ||
    destinationLocation?.externalId ||
    destinationLocation?.id ||
    destName;

  const shareUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}${window.location.pathname}?from=${encodeURIComponent(originId)}&to=${encodeURIComponent(destId)}`
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

  const totalMeters = Math.round(activeDirections?.distance ?? 280);
  const totalMinutes = Math.max(1, Math.round(totalMeters / 70));

  // Generate turn-by-turn steps from activeDirections if available, else standard fallback
  let steps: Step[] = [];

  if (activeDirections?.instructions && activeDirections.instructions.length > 0) {
    steps = activeDirections.instructions.map((inst: any, idx: number) => {
      const type = (inst.action?.type || '').toLowerCase();
      const bearing = (inst.action?.bearing || '').toLowerCase();
      const dist = Math.round(inst.distance || 20);
      const timeStr = dist > 40 ? `${Math.ceil(dist / 60)} min` : 'Less than a min';
      const distStr = `${dist}m`;

      const targetFloorName =
        inst.action?.toFloor?.name ||
        inst.coordinate?.floor?.name ||
        inst.action?.fromFloor?.name;

      const isConnection = !!inst.action?.connection || type.includes('connection') || type.includes('stairs') || type.includes('elevator');
      const isFloorChange = isConnection || (inst.action?.toFloor && inst.action?.fromFloor && inst.action.toFloor.id !== inst.action.fromFloor.id);

      let text = inst.action?.text || inst.instruction || '';
      let IconComp = ArrowRightIcon;

      if (!text) {
        if (idx === 0 || type.includes('depart')) {
          const turnDir = bearing.includes('left') ? 'left' : bearing.includes('right') ? 'right' : 'out';
          text = `Leave ${originName} and turn ${turnDir}`;
          IconComp = turnDir === 'left' ? TurnLeftIcon : TurnRightIcon;
        } else if (idx === activeDirections.instructions.length - 1 || type.includes('arrive')) {
          text = `Arrive at ${destName}`;
          IconComp = LocationPinIcon;
        } else if (isFloorChange) {
          const connType = inst.action?.connection?.type || inst.action?.connectionType || 'stairs';
          text = `Take ${connType} to ${targetFloorName || 'next floor'}`;
          IconComp = StairsIcon;
        } else if (bearing.includes('slight left') || bearing.includes('slight-left')) {
          text = `Turn slightly left near hallway`;
          IconComp = TurnSlightLeftIcon;
        } else if (bearing.includes('left')) {
          text = `Turn left along main corridor`;
          IconComp = TurnLeftIcon;
        } else if (bearing.includes('right')) {
          text = `Turn right towards ${destName}`;
          IconComp = TurnRightIcon;
        } else {
          text = `Continue straight for ${dist}m`;
          IconComp = ArrowRightIcon;
        }
      } else {
        if (type.includes('depart')) IconComp = TurnLeftIcon;
        else if (type.includes('arrive')) IconComp = LocationPinIcon;
        else if (isFloorChange) IconComp = StairsIcon;
        else if (bearing.includes('left')) IconComp = TurnLeftIcon;
        else if (bearing.includes('right')) IconComp = TurnRightIcon;
        else IconComp = ArrowRightIcon;
      }

      return {
        id: idx,
        instruction: text,
        duration: timeStr,
        distanceText: distStr,
        floorTag: targetFloorName ? `Level: ${targetFloorName}` : undefined,
        isFloorChange,
        icon: IconComp,
      };
    });
  }

  // If steps array is short, populate clean default walkthrough steps matching Fanshawe layout
  if (steps.length === 0) {
    steps = [
      {
        id: 0,
        instruction: `Leave ${originName} and turn left`,
        duration: 'Less than a min',
        distanceText: '15m',
        floorTag: 'Ground Floor',
        icon: TurnLeftIcon,
      },
      {
        id: 1,
        instruction: 'Turn right at C112 - Financial Planning',
        duration: 'Less than a min',
        distanceText: '35m',
        floorTag: 'Ground Floor',
        icon: TurnRightIcon,
      },
      {
        id: 2,
        instruction: 'Take elevator/stairs to Floor 2',
        duration: '1 min',
        distanceText: '10m',
        floorTag: 'Floor Change ➔ Level 2',
        isFloorChange: true,
        icon: StairsIcon,
      },
      {
        id: 3,
        instruction: `Continue straight on Floor 2 towards ${destName}`,
        duration: '1 min',
        distanceText: '80m',
        floorTag: 'Floor 2',
        icon: ArrowRightIcon,
      },
      {
        id: 4,
        instruction: `Arrive at ${destName}`,
        duration: 'Less than a min',
        distanceText: '10m',
        floorTag: 'Floor 2',
        icon: LocationPinIcon,
      },
    ];
  }

  const currentStep = steps[activeStepIndex] || steps[0];
  const CurrentIcon = currentStep.icon;

  const handleStepChange = (newIndex: number) => {
    if (newIndex >= 0 && newIndex < steps.length) {
      setActiveStepIndex(newIndex);
    }
  };

  return (
    <div className="flex flex-col w-full text-gray-900 animate-fadeIn">
      {/* Header Bar */}
      <div className="flex items-center justify-between w-full pb-2 pr-11">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setDirectionsMode('setup')}
            className="flex items-center gap-1 text-xs font-bold text-gray-700 hover:text-gray-900 cursor-pointer px-2 py-1 rounded-lg hover:bg-gray-100 transition"
          >
            <ArrowLeftIcon className="w-4 h-4 text-gray-700" />
            <span>Options</span>
          </button>
          {isLiveLocationActive && (
            <span
              className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full flex items-center gap-1 border ${
                isOutOfRadius
                  ? 'bg-amber-100 text-amber-800 border-amber-300'
                  : 'bg-blue-100 text-blue-800 border-blue-300 animate-pulse'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${isOutOfRadius ? 'bg-amber-600' : 'bg-blue-600'}`} />
              {isOutOfRadius ? 'Out of Radius' : 'Live GPS'}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Share navigation button & dropdown */}
          <div className="relative" ref={shareMenuRef}>
            <button
              onClick={() => setIsShareMenuOpen(!isShareMenuOpen)}
              className={`w-7 h-7 rounded-full flex items-center justify-center transition cursor-pointer ${
                isShareMenuOpen
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-gray-100 hover:bg-gray-200/80 text-gray-600'
              }`}
              title="Share navigation directions"
            >
              <ShareIcon className="w-3.5 h-3.5" />
            </button>

            {/* Share Dropdown Menu */}
            {isShareMenuOpen && (
              <div className="absolute right-0 top-8 z-50 w-56 bg-white border border-gray-200/90 rounded-2xl shadow-xl p-1.5 flex flex-col gap-1 animate-fadeIn ring-1 ring-black/5">
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
                      {copied ? 'Copied to clipboard' : 'Copy directions link'}
                    </span>
                  </div>
                </button>

                {/* Option 2: QR code */}
                <button
                  onClick={() => {
                    setIsShareMenuOpen(false);
                    setShowQrModal(true);
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
          </div>

          <button
            onClick={clearDirections}
            className="text-xs font-bold text-red-600 hover:text-red-800 hover:bg-red-50 px-2 py-1 rounded-lg transition cursor-pointer"
            title="Exit navigation"
          >
            Exit
          </button>
        </div>
      </div>

      {/* Route title & total stats */}
      <div className="flex flex-col mb-3">
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500 font-semibold uppercase tracking-wider">
            Route to {destName}
          </span>
          <span className="text-xs font-extrabold text-[#5c0628] bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200">
            Step {activeStepIndex + 1} of {steps.length}
          </span>
        </div>
        <h2 className="text-xl font-extrabold text-gray-900 tracking-tight mt-0.5">
          {totalMinutes} {totalMinutes === 1 ? 'min' : 'mins'} ({totalMeters}m)
        </h2>
      </div>

      {/* Progress Timeline Slider with step numbers */}
      <div className="relative w-full py-2 mb-3 flex items-center justify-between px-1">
        {/* Horizontal track line */}
        <div className="absolute left-3 right-3 top-1/2 -translate-y-1/2 h-1 bg-gray-200 rounded-full z-0" />

        {/* Timeline dots with step numbers */}
        {steps.map((step, idx) => {
          const isActive = idx === activeStepIndex;
          const isPassed = idx < activeStepIndex;
          return (
            <button
              key={step.id}
              onClick={() => handleStepChange(idx)}
              className={`relative z-10 w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs transition-all cursor-pointer shadow-sm ${
                isActive
                  ? 'bg-[#5c0628] text-white ring-4 ring-rose-900/20 scale-125 font-black'
                  : isPassed
                  ? 'bg-rose-800 text-white'
                  : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
              }`}
              title={`Step ${idx + 1}: ${step.instruction}`}
            >
              {isPassed ? <CheckIcon className="w-3.5 h-3.5" /> : idx + 1}
            </button>
          );
        })}
      </div>

      <hr className="border-gray-100 my-1.5" />

      {/* Origin Room Label */}
      <div className="flex items-center gap-2.5 py-1.5 pl-1">
        <span className="w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-emerald-200 flex-shrink-0" />
        <span className="text-xs font-bold text-gray-600 truncate">From: {originName}</span>
      </div>

      {/* Current Step Maroon Highlight Card */}
      <div className="w-full bg-[#5c0628] rounded-2xl p-4 text-white shadow-lg flex items-center gap-3.5 my-2 border border-rose-900/40">
        <div className="p-3 rounded-xl bg-white/15 flex items-center justify-center flex-shrink-0 shadow-inner">
          <CurrentIcon className="w-6.5 h-6.5 text-white" />
        </div>
        <div className="flex flex-col flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-0.5">
            <span className="text-[10px] font-black tracking-wider uppercase text-rose-200 bg-white/10 px-2 py-0.5 rounded-md">
              Step {activeStepIndex + 1}
            </span>
            {currentStep.isFloorChange && (
              <span className="text-[10px] font-black text-amber-200 bg-amber-950/60 border border-amber-400/40 px-2 py-0.5 rounded-md animate-pulse">
                Floor Change
              </span>
            )}
            {currentStep.floorTag && (
              <span className="text-[10px] font-bold text-rose-100 bg-white/15 px-2 py-0.5 rounded-md">
                {currentStep.floorTag}
              </span>
            )}
          </div>
          <span className="font-extrabold text-sm sm:text-base text-white leading-snug">
            {currentStep.instruction}
          </span>
          <span className="text-xs text-rose-200/90 font-medium mt-1">
            {currentStep.duration} {currentStep.distanceText ? `• ${currentStep.distanceText}` : ''}
          </span>
        </div>
      </div>

      {/* Full Step-by-Step List */}
      <div className="flex flex-col gap-2 max-h-[35vh] overflow-y-auto pr-1 my-2 divide-y divide-gray-100">
        {steps.map((step, idx) => {
          const StepIcon = step.icon;
          const isActive = idx === activeStepIndex;
          const isPassed = idx < activeStepIndex;

          return (
            <button
              key={step.id}
              onClick={() => handleStepChange(idx)}
              className={`pt-2 pb-2 flex items-center gap-3 text-left transition rounded-xl px-2 cursor-pointer ${
                isActive
                  ? 'bg-rose-50/80 font-bold'
                  : isPassed
                  ? 'opacity-60 hover:opacity-100'
                  : 'hover:bg-gray-50'
              }`}
            >
              <div
                className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold ${
                  isActive
                    ? 'bg-[#5c0628] text-white'
                    : isPassed
                    ? 'bg-gray-200 text-gray-600'
                    : 'bg-gray-100 text-gray-700'
                }`}
              >
                {isPassed ? <CheckIcon className="w-3.5 h-3.5" /> : idx + 1}
              </div>

              <div className="p-1 rounded-md text-gray-700 flex-shrink-0">
                <StepIcon className="w-4.5 h-4.5" />
              </div>

              <div className="flex flex-col flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span
                    className={`text-xs sm:text-sm leading-tight truncate ${
                      isActive
                        ? 'text-[#5c0628] font-extrabold'
                        : isPassed
                        ? 'text-gray-500 line-through'
                        : 'text-gray-800 font-semibold'
                    }`}
                  >
                    {step.instruction}
                  </span>
                  {step.isFloorChange && (
                    <span className="text-[9px] font-extrabold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-md flex-shrink-0">
                      Floor Change
                    </span>
                  )}
                </div>
                <span className="text-[11px] text-gray-400 font-medium mt-0.5">
                  {step.duration} {step.distanceText ? `• ${step.distanceText}` : ''} {step.floorTag ? `(${step.floorTag})` : ''}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Bottom Prev / Next Navigation Buttons */}
      <div className="grid grid-cols-2 gap-2.5 w-full mt-2 pt-2 border-t border-gray-100">
        <button
          onClick={() => handleStepChange(activeStepIndex - 1)}
          disabled={activeStepIndex === 0}
          className={`py-2.5 px-4 rounded-2xl border flex items-center justify-center gap-2 font-bold text-xs transition cursor-pointer ${
            activeStepIndex === 0
              ? 'bg-gray-50 border-gray-200 text-gray-300 cursor-not-allowed'
              : 'bg-white border-gray-200 hover:bg-gray-100 text-gray-800 active:scale-98 shadow-xs'
          }`}
          title="Previous step"
        >
          <ArrowLeftIcon className="w-4 h-4" />
          <span>Previous Step</span>
        </button>

        <button
          onClick={() => handleStepChange(activeStepIndex + 1)}
          disabled={activeStepIndex === steps.length - 1}
          className={`py-2.5 px-4 rounded-2xl border flex items-center justify-center gap-2 font-bold text-xs transition cursor-pointer ${
            activeStepIndex === steps.length - 1
              ? 'bg-gray-50 border-gray-200 text-gray-300 cursor-not-allowed'
              : 'bg-[#5c0628] hover:bg-[#4a041f] border-rose-950 text-white active:scale-98 shadow-md'
          }`}
          title="Next step"
        >
          <span>Next Step</span>
          <ArrowRightIcon className="w-4 h-4" />
        </button>
      </div>

      {/* QR Code Mobile Handoff Panel Overlay */}
      {showQrModal && (
        <div className="absolute inset-0 z-40 bg-white rounded-3xl p-4 flex flex-col items-center justify-between text-center animate-fadeIn shadow-2xl border border-gray-100/90 overflow-hidden">
          {/* Top Header Row with Close 'X' Button */}
          <div className="w-full flex items-start justify-between text-left pb-1">
            <div className="flex flex-col min-w-0 flex-1 pr-2">
              <h3 className="text-xl font-extrabold text-gray-900 tracking-tight leading-tight">
                Mobile Handoff
              </h3>
              <p className="text-xs text-gray-500 font-medium mt-0.5 leading-snug">
                Scan with phone camera to open directions on mobile
              </p>
            </div>
            <button
              onClick={() => setShowQrModal(false)}
              className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center transition cursor-pointer flex-shrink-0"
              title="Close Mobile Handoff"
              aria-label="Close Mobile Handoff"
            >
              <ClearIcon className="w-4 h-4" />
            </button>
          </div>

          {/* QR Code Container */}
          <div className="w-full flex-1 my-1.5 p-2.5 bg-white rounded-2xl border-2 border-gray-200/90 shadow-2xs flex items-center justify-center overflow-hidden">
            <QRCodeSVG
              value={shareUrl}
              size={180}
              level="H"
              includeMargin={false}
              className="max-h-full max-w-full"
              imageSettings={{
                src: 'https://www.fanshawec.ca/themes/custom/de_theme/logo.png',
                x: undefined,
                y: undefined,
                height: 26,
                width: 26,
                excavate: true,
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};
