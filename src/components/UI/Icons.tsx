import React from 'react';

interface IconProps {
  className?: string;
  size?: number;
}

export const BuildingIcon: React.FC<IconProps> = ({ className = 'w-4 h-4', size }) => (
  <svg
    className={className}
    width={size}
    height={size}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5m0 0v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4M9 7h1m-1 4h1m4-4h1m-1 4h1"
    />
  </svg>
);

export const FloorIcon: React.FC<IconProps> = ({ className = 'w-4 h-4', size }) => (
  <svg
    className={className}
    width={size}
    height={size}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
    />
  </svg>
);

export const SearchIcon: React.FC<IconProps> = ({ className = 'w-4 h-4', size }) => (
  <svg
    className={className}
    width={size}
    height={size}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
    />
  </svg>
);

export const WashroomIcon: React.FC<IconProps> = ({ className = 'w-4 h-4', size }) => (
  <svg
    className={className}
    width={size}
    height={size}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
    />
  </svg>
);

export const RoomIcon: React.FC<IconProps> = ({ className = 'w-4 h-4', size }) => (
  <svg
    className={className}
    width={size}
    height={size}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z"
    />
  </svg>
);

export const AmenityIcon: React.FC<IconProps> = ({ className = 'w-4 h-4', size }) => (
  <svg
    className={className}
    width={size}
    height={size}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M18.364 5.636l-3.536 3.536m0 0a9 9 0 10-12.728 0l3.536 3.536m9.192-3.536L12 12m0 0l-3.536-3.536M12 12v9"
    />
  </svg>
);

export const ElevatorIcon: React.FC<IconProps> = ({ className = 'w-4 h-4', size }) => (
  <svg
    className={className}
    width={size}
    height={size}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M7 11l5-5 5 5M7 17l5 5 5-5"
    />
  </svg>
);

export const StairsIcon: React.FC<IconProps> = ({ className = 'w-4 h-4', size }) => (
  <svg
    className={className}
    width={size}
    height={size}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M3 19h4v-4h4v-4h4V7h4"
    />
  </svg>
);

export const WaterIcon: React.FC<IconProps> = ({ className = 'w-4 h-4', size }) => (
  <svg
    className={className}
    width={size}
    height={size}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 2.69l5.66 5.66a8 8 0 11-11.31 0z"
    />
  </svg>
);

export const LocationPinIcon: React.FC<IconProps> = ({ className = 'w-4 h-4', size }) => (
  <svg
    className={className}
    width={size}
    height={size}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M17.657 16.657L12 22.343l-5.657-5.657a8 8 0 1111.314 0z"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
    />
  </svg>
);

export const ClearIcon: React.FC<IconProps> = ({ className = 'w-3.5 h-3.5', size }) => (
  <svg
    className={className}
    width={size}
    height={size}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M6 18L18 6M6 6l12 12"
    />
  </svg>
);

export const InfoIcon: React.FC<IconProps> = ({ className = 'w-4 h-4', size }) => (
  <svg
    className={className}
    width={size}
    height={size}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <circle cx="12" cy="12" r="9" strokeWidth={1.8} />
    <path strokeLinecap="round" strokeWidth={1.8} d="M12 8h.01M12 11v5" />
  </svg>
);

export const BookIcon: React.FC<IconProps> = ({ className = 'w-4 h-4', size }) => (
  <svg
    className={className}
    width={size}
    height={size}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.8}
      d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
    />
  </svg>
);

export const GlassesIcon: React.FC<IconProps> = ({ className = 'w-4 h-4', size }) => (
  <svg
    className={className}
    width={size}
    height={size}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <circle cx="7" cy="14" r="3" strokeWidth="1.8" />
    <circle cx="17" cy="14" r="3" strokeWidth="1.8" />
    <path strokeLinecap="round" strokeWidth={1.8} d="M10 14h4M4 14L6 8h12l2 6" />
  </svg>
);

export const GraduationCapIcon: React.FC<IconProps> = ({ className = 'w-4 h-4', size }) => (
  <svg
    className={className}
    width={size}
    height={size}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 14l9-5-9-5-9 5 9 5z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 14l6.16-3.422A12.083 12.083 0 0118 20.118M6 10.6V16a6 6 0 0012 0v-5.4" />
  </svg>
);

export const ParkingIcon: React.FC<IconProps> = ({ className = 'w-4 h-4', size }) => (
  <svg
    className={className}
    width={size}
    height={size}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <circle cx="12" cy="12" r="9" strokeWidth="1.8" />
    <path strokeLinecap="round" strokeWidth={1.8} d="M9 16V8h3.5a2.5 2.5 0 010 5H9" />
  </svg>
);

export const UtensilsIcon: React.FC<IconProps> = ({ className = 'w-4 h-4', size }) => (
  <svg
    className={className}
    width={size}
    height={size}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.8}
      d="M12 3v18M17 4v6a3 3 0 01-3 3M17 13v8M7 4v5a2 2 0 002 2h0a2 2 0 002-2V4M9 11v10"
    />
  </svg>
);

export const StudyLabIcon: React.FC<IconProps> = ({ className = 'w-4 h-4', size }) => (
  <svg
    className={className}
    width={size}
    height={size}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <rect x="3" y="4" width="18" height="12" rx="2" strokeWidth={1.8} />
    <path strokeLinecap="round" strokeWidth={1.8} d="M2 20h20M9 16v4M15 16v4" />
  </svg>
);

export const StudentServicesIcon: React.FC<IconProps> = ({ className = 'w-4 h-4', size }) => (
  <svg
    className={className}
    width={size}
    height={size}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
  </svg>
);

export const WheelchairIcon: React.FC<IconProps> = ({ className = 'w-4 h-4', size }) => (
  <svg
    className={className}
    width={size}
    height={size}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <circle cx="12" cy="4" r="2" strokeWidth={1.8} />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.8}
      d="M12 6v6l4 2m-4-2H7v4l4 4"
    />
    <circle cx="10" cy="17" r="4" strokeWidth={1.8} />
  </svg>
);

export const SwapArrowsIcon: React.FC<IconProps> = ({ className = 'w-4 h-4', size }) => (
  <svg
    className={className}
    width={size}
    height={size}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.8}
      d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
    />
  </svg>
);

export const WalkingIcon: React.FC<IconProps> = ({ className = 'w-4 h-4', size }) => (
  <svg
    className={className}
    width={size}
    height={size}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <circle cx="13" cy="4" r="2" strokeWidth={1.8} />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.8}
      d="M13 6l-3 4-2-1.5M10 10l-2 9M10 10l4 3 2 7M14 13l3-4"
    />
  </svg>
);

export const ShareIcon: React.FC<IconProps> = ({ className = 'w-4 h-4', size }) => (
  <svg
    className={className}
    width={size}
    height={size}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.8}
      d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
    />
  </svg>
);

export const DotsMenuIcon: React.FC<IconProps> = ({ className = 'w-4 h-4', size }) => (
  <svg
    className={className}
    width={size}
    height={size}
    fill="currentColor"
    viewBox="0 0 24 24"
  >
    <circle cx="5" cy="12" r="2" />
    <circle cx="12" cy="12" r="2" />
    <circle cx="19" cy="12" r="2" />
  </svg>
);

export const ArrowLeftIcon: React.FC<IconProps> = ({ className = 'w-4 h-4', size }) => (
  <svg
    className={className}
    width={size}
    height={size}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M10 19l-7-7m0 0l7-7m-7 7h18"
    />
  </svg>
);

export const ArrowRightIcon: React.FC<IconProps> = ({ className = 'w-4 h-4', size }) => (
  <svg
    className={className}
    width={size}
    height={size}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M14 5l7 7m0 0l-7 7m7-7H3"
    />
  </svg>
);

export const TurnRightIcon: React.FC<IconProps> = ({ className = 'w-4 h-4', size }) => (
  <svg
    className={className}
    width={size}
    height={size}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2.2}
      d="M9 18V9a3 3 0 013-3h7m-3-3l3 3-3 3"
    />
  </svg>
);

export const TurnLeftIcon: React.FC<IconProps> = ({ className = 'w-4 h-4', size }) => (
  <svg
    className={className}
    width={size}
    height={size}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2.2}
      d="M15 18V9a3 3 0 00-3-3H5m3-3L5 6l3 3"
    />
  </svg>
);

export const TurnSlightLeftIcon: React.FC<IconProps> = ({ className = 'w-4 h-4', size }) => (
  <svg
    className={className}
    width={size}
    height={size}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2.2}
      d="M14 18l-4-9m0 0H6m4 0V4"
    />
  </svg>
);

export const TurnSlightRightIcon: React.FC<IconProps> = ({ className = 'w-4 h-4', size }) => (
  <svg
    className={className}
    width={size}
    height={size}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2.2}
      d="M10 18l4-9m0 0h4m-4 0V4"
    />
  </svg>
);


export const FrameLocationIcon: React.FC<IconProps> = ({ className = 'w-4 h-4', size }) => (
  <svg
    className={className}
    width={size}
    height={size}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <rect x="3" y="3" width="18" height="18" rx="4" strokeWidth="1.8" />
    <circle cx="8" cy="8" r="1.5" strokeWidth="1.8" />
    <rect x="12" y="11" width="5" height="5" strokeWidth="1.8" />
  </svg>
);

export const CheckIcon: React.FC<IconProps> = ({ className = 'w-4 h-4', size }) => (
  <svg
    className={className}
    width={size}
    height={size}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2.5}
      d="M5 13l4 4L19 7"
    />
  </svg>
);

export const CopyIcon: React.FC<IconProps> = ({ className = 'w-4 h-4', size }) => (
  <svg
    className={className}
    width={size}
    height={size}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.8}
      d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
    />
  </svg>
);

export const QrCodeIcon: React.FC<IconProps> = ({ className = 'w-4 h-4', size }) => (
  <svg
    className={className}
    width={size}
    height={size}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.8}
      d="M12 4v1m0 4v1m0 4v1m0 4v1M4 12h1m4 0h1m4 0h1m4 0h1M3 3h6v6H3V3zm12 0h6v6h-6V3zm0 12h6v6h-6v-6zM3 15h6v6H3v-6z"
    />
  </svg>
);

export const DotsHorizontalIcon: React.FC<IconProps> = ({ className = 'w-4 h-4', size }) => (
  <svg
    className={className}
    width={size}
    height={size}
    fill="currentColor"
    viewBox="0 0 24 24"
  >
    <circle cx="5" cy="12" r="2" />
    <circle cx="12" cy="12" r="2" />
    <circle cx="19" cy="12" r="2" />
  </svg>
);

export const RestartIcon: React.FC<IconProps> = ({ className = 'w-4 h-4', size }) => (
  <svg
    className={className}
    width={size}
    height={size}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
    />
  </svg>
);




