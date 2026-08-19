import type { MapView, Marker } from '@mappedin/mappedin-js';

let activeUserLocationMarker: Marker | null = null;
let currentMarkerHeading: number | null = null;

/**
 * Removes any active user location marker from the map.
 */
export function clearUserLocationMarker(mapView: MapView | null): void {
  if (activeUserLocationMarker && mapView) {
    try {
      mapView.Markers.remove(activeUserLocationMarker);
    } catch (e) {
      console.warn('Failed to remove user location marker:', e);
    }
    activeUserLocationMarker = null;
  }
}

export interface UserLocationMarkerOptions {
  isOutOfRadius?: boolean;
  distanceText?: string;
  accuracy?: number;
  isSimulated?: boolean;
  heading?: number | null;
}

/**
 * Adds or updates a live user location marker on the map with compass directional cone and smooth animations.
 */
export function showUserLocationMarker(
  mapView: MapView | null,
  target: any,
  options?: UserLocationMarkerOptions
): Marker | null {
  if (!mapView || !target) return null;

  // Clear existing user location marker before drawing updated HTML
  clearUserLocationMarker(mapView);

  const isOutOfRadius = !!options?.isOutOfRadius;
  const isSimulated = !!options?.isSimulated;
  const distanceText = options?.distanceText || '';
  const accuracy = options?.accuracy;
  const heading = options?.heading ?? currentMarkerHeading;
  if (options?.heading != null) {
    currentMarkerHeading = options.heading;
  }

  const accuracyText =
    !isOutOfRadius && accuracy && accuracy > 0
      ? ` (±${Math.round(accuracy)}m)`
      : '';

  const mainColor = isOutOfRadius
    ? '#f59e0b'
    : isSimulated
    ? '#8b5cf6'
    : '#2563eb'; // Amber if out of campus, Purple if simulated, Blue if live GPS

  const ringColor = isOutOfRadius
    ? 'rgba(245, 158, 11, 0.35)'
    : isSimulated
    ? 'rgba(139, 92, 246, 0.35)'
    : 'rgba(37, 99, 235, 0.35)';

  const coneGradient = isOutOfRadius
    ? 'linear-gradient(180deg, rgba(245, 158, 11, 0.5) 0%, rgba(245, 158, 11, 0) 100%)'
    : isSimulated
    ? 'linear-gradient(180deg, rgba(139, 92, 246, 0.5) 0%, rgba(139, 92, 246, 0) 100%)'
    : 'linear-gradient(180deg, rgba(37, 99, 235, 0.55) 0%, rgba(37, 99, 235, 0) 100%)';

  const labelText = isOutOfRadius
    ? `Out of Campus Radius ${distanceText ? `(${distanceText})` : ''}`
    : isSimulated
    ? `Campus Simulation Mode`
    : `Live Location${accuracyText}`;

  const headingTransform =
    heading != null && !Number.isNaN(heading)
      ? `transform: rotate(${heading}deg); transition: transform 0.3s cubic-bezier(0.25, 0.1, 0.25, 1);`
      : 'display: none;';

  const htmlContent = `
    <div class="user-live-location-marker" style="
      position: relative;
      width: 48px;
      height: 48px;
      display: flex;
      align-items: center;
      justify-content: center;
      pointer-events: none;
      user-select: none;
      z-index: 9999;
      transition: all 0.3s cubic-bezier(0.25, 0.1, 0.25, 1);
    ">
      <!-- Directional Heading Cone Spotlight (visible when heading is known) -->
      <div class="user-heading-cone" style="
        position: absolute;
        top: -24px;
        left: 50%;
        margin-left: -20px;
        width: 40px;
        height: 48px;
        background: ${coneGradient};
        clip-path: polygon(50% 100%, 0% 0%, 100% 0%);
        transform-origin: 50% 100%;
        ${headingTransform}
        pointer-events: none;
        z-index: 1;
      "></div>

      <!-- Outer Pulsing Radar Ring -->
      <div style="
        position: absolute;
        width: 42px;
        height: 42px;
        border-radius: 50%;
        background-color: ${ringColor};
        animation: userLocationPulse 1.8s infinite cubic-bezier(0.215, 0.61, 0.355, 1);
        z-index: 1;
      "></div>
      
      <!-- White Ring Border -->
      <div style="
        position: relative;
        width: 24px;
        height: 24px;
        border-radius: 50%;
        background-color: #ffffff;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.38);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 2;
      ">
        <!-- Center Solid Glowing Core -->
        <div style="
          width: 15px;
          height: 15px;
          border-radius: 50%;
          background-color: ${mainColor};
          box-shadow: inset 0 1px 2px rgba(255, 255, 255, 0.6), 0 0 8px ${mainColor};
        "></div>
      </div>

      <!-- Live Status Badge Label -->
      <div style="
        position: absolute;
        top: 100%;
        left: 50%;
        transform: translateX(-50%);
        margin-top: 4px;
        background: ${mainColor};
        color: #ffffff;
        padding: 3.5px 10px;
        border-radius: 14px;
        font-family: system-ui, -apple-system, sans-serif;
        font-size: 11px;
        font-weight: 800;
        white-space: nowrap;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        border: 1.5px solid #ffffff;
        pointer-events: none;
        z-index: 3;
        display: flex;
        align-items: center;
        gap: 5px;
      ">
        <span style="display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: #ffffff; animation: pulseDot 1s infinite alternate;"></span>
        ${labelText}
      </div>

      <style>
        @keyframes userLocationPulse {
          0% {
            transform: scale(0.6);
            opacity: 0.95;
          }
          100% {
            transform: scale(1.65);
            opacity: 0;
          }
        }
        @keyframes pulseDot {
          from { opacity: 0.35; }
          to { opacity: 1; }
        }
      </style>
    </div>
  `;

  try {
    const marker = mapView.Markers.add(target, htmlContent, {
      rank: 'always-visible',
      placement: 'center',
    });
    activeUserLocationMarker = marker;
    return marker;
  } catch (e) {
    console.warn('Failed to add user location marker to map:', e);
    return null;
  }
}
