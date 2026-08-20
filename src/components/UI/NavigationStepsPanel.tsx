import React, { useState, useRef, useEffect } from 'react';
import { useMapStore } from '../../store/useMapStore';
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  TurnLeftIcon,
  TurnRightIcon,
  TurnSlightLeftIcon,
  TurnSlightRightIcon,
  StairsIcon,
  ElevatorIcon,
  LocationPinIcon,
  CheckIcon,
  ShareIcon,
  CopyIcon,
  QrCodeIcon,
  DotsHorizontalIcon,
  RestartIcon,
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
    setActiveStepIndex,
    setDirectionsMode,
    clearDirections,
    openQrModal,
    floorStacks,
    floors,
    selectedBuildingId,
    selectedFloorId,
  } = useMapStore();

  const [isShareMenuOpen, setIsShareMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const shareMenuRef = useRef<HTMLDivElement>(null);
  const mobileShareMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        shareMenuRef.current &&
        !shareMenuRef.current.contains(event.target as Node) &&
        mobileShareMenuRef.current &&
        !mobileShareMenuRef.current.contains(event.target as Node)
      ) {
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

  const rawDist = activeDirections?.distance;
  const totalMeters = typeof rawDist === 'number' ? Math.round(rawDist) : 280;
  const formattedDist =
    typeof rawDist === 'number'
      ? rawDist < 1000
        ? `${Math.round(rawDist)}m`
        : `${(rawDist / 1000).toFixed(1)}km`
      : '280m';
  const totalMinutes = Math.max(1, Math.round(totalMeters / 70));

  // Generate turn-by-turn steps from activeDirections if available, else standard fallback
  let steps: Step[] = [];

  if (activeDirections?.instructions && activeDirections.instructions.length > 0) {
    steps = activeDirections.instructions.map((inst: any, idx: number) => {
      const type = (inst.action?.type || '').toLowerCase();
      const bearing = (inst.action?.bearing || '').toLowerCase();
      const dist = Math.round(inst.distance || 20);
      const timeStr = dist > 40 ? `${Math.ceil(dist / 60)} min` : 'Less than a minute';
      const distStr = `${dist}m`;

      const targetFloorName =
        inst.action?.toFloor?.name ||
        inst.coordinate?.floor?.name ||
        inst.action?.fromFloor?.name;

      const connType = (inst.action?.connection?.type || inst.action?.connectionType || '').toLowerCase();
      const isConnection = !!inst.action?.connection || type.includes('connection') || type.includes('stairs') || type.includes('elevator') || connType.length > 0;
      const isFloorChange = isConnection || (inst.action?.toFloor && inst.action?.fromFloor && inst.action.toFloor.id !== inst.action.fromFloor.id);
      const isElevator = connType.includes('elevator') || type.includes('elevator');

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
          const nameStr = isElevator ? 'elevator' : 'stairs';
          text = `Take ${nameStr} to ${targetFloorName || 'next level'}`;
          IconComp = isElevator ? ElevatorIcon : StairsIcon;
        } else if (bearing.includes('slight left') || bearing.includes('slight-left')) {
          text = `Turn slightly left near hallway`;
          IconComp = TurnSlightLeftIcon;
        } else if (bearing.includes('slight right') || bearing.includes('slight-right')) {
          text = `Turn slightly right near hallway`;
          IconComp = TurnSlightRightIcon;
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
        if (type.includes('depart') || idx === 0) IconComp = TurnLeftIcon;
        else if (type.includes('arrive') || idx === activeDirections.instructions.length - 1) IconComp = LocationPinIcon;
        else if (isFloorChange) IconComp = isElevator ? ElevatorIcon : StairsIcon;
        else if (bearing.includes('slight left') || bearing.includes('slight-left')) IconComp = TurnSlightLeftIcon;
        else if (bearing.includes('slight right') || bearing.includes('slight-right')) IconComp = TurnSlightRightIcon;
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
        duration: 'Less than a minute',
        distanceText: '15m',
        floorTag: 'Ground Floor',
        icon: TurnLeftIcon,
      },
      {
        id: 1,
        instruction: 'Turn right at C112 - Financial Planning',
        duration: 'Less than a minute',
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
        duration: 'Less than a minute',
        distanceText: '10m',
        floorTag: 'Floor 2',
        icon: LocationPinIcon,
      },
    ];
  }

  const currentStep = steps[activeStepIndex] || steps[0];
  const CurrentIcon = currentStep.icon;
  const isLastStep = activeStepIndex === steps.length - 1;
  const progressPercent = steps.length > 1 ? (activeStepIndex / (steps.length - 1)) * 100 : 100;

  const handleStepChange = (newIndex: number) => {
    if (newIndex >= 0 && newIndex < steps.length) {
      setActiveStepIndex(newIndex);
    }
  };

  // Derive Building & Level labels for Mobile floating badge
  const selectedBuilding = floorStacks.find((fs) => fs.id === selectedBuildingId);
  const selectedFloor = floors.find((f) => f.id === selectedFloorId);

  let bldgName = selectedBuilding?.name || 'B';
  if (!bldgName.toLowerCase().includes('building')) {
    bldgName = `Building ${bldgName}`;
  }

  let levelName = selectedFloor?.name || '1 - B';
  if (!levelName.toLowerCase().includes('level') && !levelName.toLowerCase().includes('floor')) {
    levelName = `Level ${levelName}`;
  }

  return (
    <>
      {/* DESKTOP SIDEBAR VIEW (MD screens and up) */}
      <div className="hidden md:flex flex-col w-full text-gray-900 animate-fadeIn">
        {/* Header Bar */}
        <div className="flex items-center justify-between w-full pb-1 pr-2">
          <button
            onClick={() => setDirectionsMode('setup')}
            className="flex items-center gap-1.5 text-sm font-extrabold text-gray-700 hover:text-gray-900 cursor-pointer px-2 py-1 rounded-lg hover:bg-gray-100 transition"
          >
            <ArrowLeftIcon className="w-4 h-4 text-gray-700" />
            <span>Back</span>
          </button>

          <div className="relative" ref={shareMenuRef}>
            <button
              onClick={() => setIsShareMenuOpen(!isShareMenuOpen)}
              className="p-1.5 rounded-full hover:bg-gray-100 text-gray-600 transition cursor-pointer"
              title="Options"
            >
              <DotsHorizontalIcon className="w-5 h-5" />
            </button>

            {/* Share Dropdown Menu */}
            {isShareMenuOpen && (
              <div className="absolute right-0 top-8 z-50 w-52 bg-white border border-gray-200/90 rounded-2xl shadow-xl p-1.5 flex flex-col gap-1 animate-fadeIn ring-1 ring-black/5">
                <button
                  onClick={handleCopyLink}
                  className="w-full text-left px-3 py-2 hover:bg-gray-100/80 rounded-xl flex items-center gap-2 text-xs font-bold text-gray-800 transition cursor-pointer"
                >
                  {copied ? <CheckIcon className="w-4 h-4 text-emerald-600" /> : <CopyIcon className="w-4 h-4" />}
                  <span>{copied ? 'Link Copied!' : 'Copy link'}</span>
                </button>
                <button
                  onClick={() => {
                    setIsShareMenuOpen(false);
                    openQrModal(shareUrl);
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-gray-100/80 rounded-xl flex items-center gap-2 text-xs font-bold text-gray-800 transition cursor-pointer"
                >
                  <QrCodeIcon className="w-4 h-4" />
                  <span>QR code</span>
                </button>
                <button
                  onClick={clearDirections}
                  className="w-full text-left px-3 py-2 hover:bg-red-50 text-red-600 rounded-xl flex items-center gap-2 text-xs font-bold transition cursor-pointer"
                >
                  <span>Exit navigation</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Route title & total stats */}
        <div className="flex flex-col my-1">
          <span className="text-xs font-medium text-gray-500">
            Directions to {destName}
          </span>
          <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight mt-0.5">
            {totalMinutes} {totalMinutes === 1 ? 'minute' : 'minutes'} total
          </h2>
        </div>

        {/* Progress Range Slider Bar */}
        <div className="relative w-full py-1.5 my-1 flex items-center gap-2">
          <input
            type="range"
            min={0}
            max={Math.max(1, steps.length - 1)}
            value={activeStepIndex}
            onChange={(e) => handleStepChange(Number(e.target.value))}
            className="w-full accent-[#2563eb] h-2 bg-gray-200 rounded-lg cursor-pointer"
          />
        </div>

        <hr className="border-gray-100 my-2" />

        {/* Vertical Dotted Timeline Steps List */}
        <div className="relative flex flex-col gap-3 py-1 max-h-[48vh] overflow-y-auto pr-1">
          {/* Origin Node */}
          <div className="flex items-center gap-3 pl-1">
            <span className="w-3.5 h-3.5 rounded-full bg-gray-400 border-2 border-white shadow-xs flex-shrink-0" />
            <span className="text-sm font-extrabold text-gray-900 truncate">{originName}</span>
          </div>

          {/* Dotted Timeline Line & Steps */}
          <div className="relative ml-2.5 pl-5 border-l-2 border-dashed border-gray-300 flex flex-col gap-3 py-0.5">
            {steps.map((step, idx) => {
              const StepIcon = step.icon;
              const isActive = idx === activeStepIndex;

              return (
                <button
                  key={step.id}
                  onClick={() => handleStepChange(idx)}
                  className={`w-full text-left transition rounded-2xl p-3.5 flex items-start gap-3.5 cursor-pointer ${
                    isActive
                      ? 'bg-[#800020] text-white shadow-md border border-rose-950'
                      : 'bg-transparent text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <div
                    className={`p-2 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      isActive ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    <StepIcon className="w-5 h-5" />
                  </div>

                  <div className="flex flex-col flex-1 min-w-0">
                    <span
                      className={`text-sm font-extrabold leading-snug ${
                        isActive ? 'text-white' : 'text-gray-900'
                      }`}
                    >
                      {step.instruction}
                    </span>
                    <span
                      className={`text-xs font-medium mt-1 ${
                        isActive ? 'text-rose-100/90' : 'text-gray-500'
                      }`}
                    >
                      {step.duration} {step.distanceText ? `• ${step.distanceText}` : ''}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Destination Node */}
          <div className="flex items-center gap-3 pl-1">
            <div className="w-6 h-6 rounded-full bg-red-600 text-white flex items-center justify-center flex-shrink-0 shadow-md">
              <LocationPinIcon className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-sm font-extrabold text-gray-900 truncate">{destName}</span>
          </div>
        </div>

        {/* Bottom Control Buttons: Left & Right Square Buttons */}
        <div className="grid grid-cols-2 gap-3 w-full mt-3 pt-3 border-t border-gray-100">
          <button
            onClick={() => handleStepChange(activeStepIndex - 1)}
            disabled={activeStepIndex === 0}
            className={`py-3 px-4 rounded-2xl border flex items-center justify-center font-bold text-sm transition cursor-pointer ${
              activeStepIndex === 0
                ? 'bg-gray-100 border-gray-200 text-gray-300 cursor-not-allowed'
                : 'bg-[#f0f0f2] border-transparent hover:bg-gray-200 text-gray-800 active:scale-95 shadow-xs'
            }`}
            title="Previous step"
          >
            <ArrowLeftIcon className="w-5 h-5 text-gray-700" />
          </button>

          <button
            onClick={() => handleStepChange(activeStepIndex + 1)}
            disabled={activeStepIndex === steps.length - 1}
            className={`py-3 px-4 rounded-2xl border flex items-center justify-center font-bold text-sm transition cursor-pointer ${
              activeStepIndex === steps.length - 1
                ? 'bg-gray-100 border-gray-200 text-gray-300 cursor-not-allowed'
                : 'bg-[#f0f0f2] border-transparent hover:bg-gray-200 text-gray-800 active:scale-95 shadow-xs'
            }`}
            title="Next step"
          >
            <ArrowRightIcon className="w-5 h-5 text-gray-700" />
          </button>
        </div>
      </div>

      {/* MOBILE PHONE NAVIGATION VIEW (Mobile screens < 768px matching Seneca/Fanshawe screenshots) */}
      <div className="block md:hidden pointer-events-none animate-fadeIn">
        {/* 1. FLOATING TOP HEADER CARD */}
        <div className="fixed top-3 left-3 right-3 z-30 pointer-events-auto bg-white rounded-2xl p-3.5 shadow-xl border border-gray-100/90 flex flex-col gap-2.5">
          {/* Header Action Row */}
          <div className="flex items-center justify-between w-full">
            <button
              onClick={() => setDirectionsMode('setup')}
              className="flex items-center gap-1 text-xs font-bold text-gray-700 hover:text-gray-900 cursor-pointer py-1 px-1 rounded-lg transition"
            >
              <ArrowLeftIcon className="w-4 h-4 text-gray-700" />
              <span className="text-sm font-semibold">Close</span>
            </button>

            {/* Options Dropdown Menu Trigger (...) */}
            <div className="relative" ref={mobileShareMenuRef}>
              <button
                onClick={() => setIsShareMenuOpen(!isShareMenuOpen)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-gray-600 hover:bg-gray-100 transition cursor-pointer"
                title="Options"
              >
                <DotsHorizontalIcon className="w-5 h-5" />
              </button>

              {/* Mobile Share Dropdown Menu */}
              {isShareMenuOpen && (
                <div className="absolute right-0 top-9 z-50 w-56 bg-white border border-gray-200/90 rounded-2xl shadow-xl p-1.5 flex flex-col gap-1 ring-1 ring-black/5">
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
            </div>
          </div>

          {/* Main Maneuver Banner */}
          <div className="flex items-center gap-3.5 pt-0.5">
            <div className="w-11 h-11 rounded-2xl bg-gray-100 flex items-center justify-center flex-shrink-0 text-gray-800 shadow-inner">
              <CurrentIcon className="w-6 h-6 text-gray-800" />
            </div>
            <div className="flex flex-col flex-1 min-w-0">
              <h3 className="font-extrabold text-base text-gray-900 leading-snug truncate">
                {currentStep.instruction}
              </h3>
              <span className="text-xs text-gray-500 font-medium mt-0.5">
                {currentStep.duration}
              </span>
            </div>
          </div>
        </div>

        {/* 2 & 3. FLOATING BOTTOM CONTAINER (BADGE + SHEET) */}
        <div className="fixed bottom-3 left-3 right-3 z-30 pointer-events-auto flex flex-col items-center gap-2 font-sans">
          {/* FLOATING BUILDING / LEVEL BADGE */}
          <div className="bg-[#2b3545]/95 text-white px-4 py-1.5 rounded-xl text-xs font-semibold shadow-lg flex items-center gap-2 border border-slate-700/60 backdrop-blur-md">
            <span>{bldgName}</span>
            <span className="text-slate-400 font-normal">|</span>
            <span>{levelName}</span>
          </div>

          {/* FLOATING BOTTOM SHEET CARD */}
          <div className="w-full bg-white rounded-[26px] p-4 shadow-2xl border border-gray-100 flex flex-col gap-2.5">
          {/* Progress Timeline Slider */}
          <div className="relative w-full py-1.5 flex items-center justify-between">
            {/* Background Track Line */}
            <div className="absolute left-1 right-1 top-1/2 -translate-y-1/2 h-1.5 bg-gray-200 rounded-full z-0 pointer-events-none" />

            {/* Blue Filled Progress Line */}
            <div
              className="absolute left-1 top-1/2 -translate-y-1/2 h-1.5 bg-blue-600 rounded-full z-0 transition-all duration-300 pointer-events-none"
              style={{ width: `${progressPercent}%` }}
            />

            {/* Hidden Input Range Slider for Touch / Interaction */}
            <input
              type="range"
              min={0}
              max={steps.length - 1}
              value={activeStepIndex}
              onChange={(e) => handleStepChange(Number(e.target.value))}
              className="absolute inset-0 w-full opacity-0 cursor-pointer z-20"
            />

            {/* Start Ring Marker (Left) */}
            <div className="relative z-10 w-3.5 h-3.5 rounded-full border-2 border-gray-400 bg-white shadow-sm pointer-events-none flex-shrink-0" />

            {/* End Checkmark Badge (If arrived at final step) */}
            {isLastStep ? (
              <div className="relative z-10 w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-md scale-110 pointer-events-none flex-shrink-0">
                <CheckIcon className="w-3.5 h-3.5 text-white stroke-[3]" />
              </div>
            ) : (
              /* End Target Pin Circle (Right) */
              <div className="relative z-10 w-4 h-4 rounded-full border border-gray-400 bg-white flex items-center justify-center pointer-events-none flex-shrink-0 shadow-xs">
                <div className="w-1.5 h-1.5 rounded-full bg-gray-600" />
              </div>
            )}
          </div>

          {/* Status & Destination Text */}
          <div className="flex flex-col mt-0.5">
            <span className="text-xs text-gray-500 font-medium leading-tight">
              Directions to {destName}
            </span>
            <h2 className="text-lg font-extrabold text-gray-900 tracking-tight mt-0.5">
              {isLastStep ? 'You have arrived' : `${totalMinutes} ${totalMinutes === 1 ? 'minute' : 'minutes'} (${formattedDist})`}
            </h2>
          </div>

          {/* Action Control Buttons Row */}
          <div className="flex items-center gap-3 w-full mt-1">
            {!isLastStep ? (
              <>
                {/* Previous Step Button (<) */}
                <button
                  onClick={() => handleStepChange(activeStepIndex - 1)}
                  disabled={activeStepIndex === 0}
                  className="flex-1 py-3 bg-white border border-gray-200 hover:bg-gray-50 active:bg-gray-100 rounded-2xl flex items-center justify-center transition shadow-sm cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                  title="Previous Step"
                >
                  <ArrowLeftIcon className="w-5 h-5 text-gray-700" />
                </button>

                {/* Next Step Button (>) */}
                <button
                  onClick={() => handleStepChange(activeStepIndex + 1)}
                  disabled={activeStepIndex === steps.length - 1}
                  className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 active:bg-gray-300 text-gray-800 rounded-2xl flex items-center justify-center transition cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                  title="Next Step"
                >
                  <ArrowRightIcon className="w-5 h-5 text-gray-700" />
                </button>
              </>
            ) : (
              <>
                {/* Restart Navigation Button (↺) */}
                <button
                  onClick={() => handleStepChange(0)}
                  className="w-12 py-3 bg-gray-100 hover:bg-gray-200 active:bg-gray-300 text-gray-700 rounded-2xl flex items-center justify-center transition cursor-pointer flex-shrink-0"
                  title="Restart Navigation"
                >
                  <RestartIcon className="w-5 h-5 text-gray-700" />
                </button>

                {/* Primary Finish Button ("I'm done") */}
                <button
                  onClick={clearDirections}
                  className="flex-1 py-3 bg-gray-300 hover:bg-gray-400 active:bg-gray-500 text-gray-900 font-extrabold text-sm rounded-2xl flex items-center justify-center transition cursor-pointer shadow-xs"
                >
                  I'm done
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  </>
);
};

