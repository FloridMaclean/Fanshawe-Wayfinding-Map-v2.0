import type { MapView, Marker } from '@mappedin/mappedin-js';
import { getMarkerTarget } from './searchMarkerUtils';

let activeStepMarker: Marker | null = null;

/**
 * Removes any active step indicator marker from the map.
 */
export function clearStepMarker(mapView: MapView | null): void {
  if (activeStepMarker && mapView) {
    try {
      mapView.Markers.remove(activeStepMarker);
    } catch (e) {
      console.warn('Failed to remove step marker:', e);
    }
    activeStepMarker = null;
  }
}

/**
 * Adds a visual step badge pin on the map at the given step coordinate.
 * Supports amber/gold dynamic floor change highlights and bold level tags.
 */
export function showStepMarker(
  mapView: MapView | null,
  target: any,
  stepIndex: number,
  instructionText: string,
  options?: { isFloorChange?: boolean; floorName?: string }
): Marker | null {
  if (!mapView || !target) return null;

  clearStepMarker(mapView);

  const isFloorChange = options?.isFloorChange;
  const floorName = options?.floorName;

  const safeText = (instructionText || `Step ${stepIndex + 1}`)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

  const badgeBg = isFloorChange ? '#d97706' : '#5c0628';
  const iconSymbol = isFloorChange ? '🪜' : `${stepIndex + 1}`;

  const htmlContent = `
    <div class="navigation-step-marker" style="
      position: relative;
      display: inline-flex;
      flex-direction: column;
      align-items: center;
      pointer-events: none;
      user-select: none;
      z-index: 9999;
      filter: drop-shadow(0 4px 12px rgba(0, 0, 0, 0.4));
    ">
      <!-- Main Badge Content Pill -->
      <div style="
        display: flex;
        align-items: center;
        gap: 8px;
        background-color: ${badgeBg};
        color: #ffffff;
        padding: 7px 14px 7px 10px;
        border-radius: 24px;
        border: 2.5px solid #ffffff;
        font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-weight: 700;
        font-size: 13.5px;
        line-height: 1.2;
        white-space: nowrap;
        box-shadow: 0 4px 10px rgba(0, 0, 0, 0.25);
      ">
        <span style="
          background-color: #ffffff;
          color: ${badgeBg};
          width: 24px;
          height: 24px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: 900;
          flex-shrink: 0;
          box-shadow: 0 1px 3px rgba(0,0,0,0.25);
        ">${iconSymbol}</span>
        <div style="display: flex; flex-direction: column;">
          <span style="max-width: 220px; overflow: hidden; text-overflow: ellipsis;">${safeText}</span>
          ${floorName ? `<span style="font-size: 10px; opacity: 0.95; font-weight: 800; color: #fef3c7;">Floor: ${floorName}</span>` : ''}
        </div>
      </div>

      <!-- Pointer Arrow Tail (In flow at bottom of column so 100% height matches tail tip) -->
      <div style="
        width: 0;
        height: 0;
        border-left: 7px solid transparent;
        border-right: 7px solid transparent;
        border-top: 7px solid ${badgeBg};
        margin-top: -1px;
      "></div>
    </div>
  `;

  const targetObj = getMarkerTarget(target);

  try {
    const marker = mapView.Markers.add(targetObj, htmlContent, {
      rank: 'always-visible',
      placement: 'bottom',
    });
    activeStepMarker = marker;
    return marker;
  } catch (e) {
    console.warn('Failed to add navigation step marker to map:', e);
    return null;
  }
}
