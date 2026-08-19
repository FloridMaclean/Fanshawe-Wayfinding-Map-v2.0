import type { MapView, Marker } from '@mappedin/mappedin-js';

let activeSearchMarker: Marker | null = null;

/**
 * Removes any currently visible search location marker from the map.
 */
export function clearSearchLocationMarker(mapView: MapView | null): void {
  if (activeSearchMarker && mapView) {
    try {
      mapView.Markers.remove(activeSearchMarker);
    } catch (e) {
      console.warn('Failed to remove search marker:', e);
    }
    activeSearchMarker = null;
  }
}

/**
 * Helper to safely extract a 3D Space or Polygon target object for Mappedin Markers.add.
 * Binding markers to 3D Space/Polygon geometry objects attaches the marker to the elevated 3D floor node,
 * rendering the marker at the exact same 3D altitude as the floor and eliminating perspective parallax drift.
 */
export function getMarkerTarget(item: any): any {
  if (!item) return null;

  // 1. Direct coordinate object or item with lat/lon
  if (typeof item.latitude === 'number' && typeof item.longitude === 'number') {
    return item;
  }

  // 2. Direct center coordinate on Space or Location
  if (item.center && typeof item.center.latitude === 'number') {
    return item.center;
  }

  // 3. Space object target (prefer space.center coordinate over 3D polygon volume)
  if (item.space) {
    if (item.space.center && typeof item.space.center.latitude === 'number') {
      return item.space.center;
    }
    return item.space;
  }

  // 4. Location object spaces array
  if (Array.isArray(item.spaces) && item.spaces.length > 0) {
    const firstSpace = item.spaces[0];
    if (firstSpace.center && typeof firstSpace.center.latitude === 'number') {
      return firstSpace.center;
    }
    return firstSpace;
  }

  // 5. Item locations array
  if (Array.isArray(item.locations) && item.locations.length > 0) {
    const firstLoc = item.locations[0];
    if (firstLoc.center && typeof firstLoc.center.latitude === 'number') {
      return firstLoc.center;
    }
    if (Array.isArray(firstLoc.spaces) && firstLoc.spaces.length > 0 && firstLoc.spaces[0].center) {
      return firstLoc.spaces[0].center;
    }
  }

  // Fallback to item
  return item;
}

/**
 * Creates and displays the popup marker for a searched location.
 * Uses exact 36px x 48px SVG pin geometry where the bottom tip (18px, 48px)
 * matches the exact bottom-center container anchor point (50%, 100%),
 * guaranteeing ZERO displacement when zooming in and out.
 */
export function showSearchLocationMarker(mapView: MapView | null, item: any): Marker | null {
  if (!mapView || !item) return null;

  // 1. Clear any existing search marker
  clearSearchLocationMarker(mapView);

  const rawName = (
    item.name ||
    item.displayName ||
    item.title ||
    item.externalId ||
    'Selected Location'
  ).trim();

  // Clean title for display
  const safeName = rawName
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

  // Exact 36px x 48px box layout with bottom tip anchored at (18px, 48px)
  const htmlContent = `
    <div class="search-location-marker-popup" style="
      position: relative;
      width: 36px;
      height: 48px;
      pointer-events: auto;
      user-select: none;
      z-index: 9999;
      cursor: pointer;
    ">
      <!-- Crisp SVG Teardrop Pin (36px x 48px) with Tip at (18, 48) -->
      <svg width="36" height="48" viewBox="0 0 36 48" fill="none" xmlns="http://www.w3.org/2000/svg" style="
        display: block;
        width: 36px;
        height: 48px;
        filter: drop-shadow(0px 4px 10px rgba(0, 0, 0, 0.4));
      ">
        <path d="M18 0C8.05887 0 0 8.05887 0 18C0 29.5 18 48 18 48C18 48 36 29.5 36 18C36 8.05887 27.9411 0 18 0Z" fill="#5c0628" stroke="#ffffff" stroke-width="2.5" stroke-linejoin="round"/>
        <circle cx="18" cy="17" r="7.5" fill="#ffffff"/>
        <circle cx="18" cy="17" r="4" fill="#5c0628"/>
      </svg>

      <!-- Glassmorphic Location Name Pill attached to Right of Pin Head -->
      <div style="
        position: absolute;
        left: 100%;
        top: 14px;
        transform: translateY(-50%);
        margin-left: 8px;
        background: rgba(15, 23, 42, 0.92);
        color: #ffffff;
        padding: 5px 12px;
        border-radius: 12px;
        border: 1.5px solid rgba(255, 255, 255, 0.3);
        font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 13px;
        font-weight: 700;
        line-height: 1.2;
        white-space: nowrap;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.35);
        pointer-events: none;
        max-width: 220px;
        overflow: hidden;
        text-overflow: ellipsis;
      ">${safeName}</div>
    </div>
  `;

  // Target 2D floor plane coordinate (eliminates 3D perspective parallax zoom drift)
  const target = getMarkerTarget(item);

  try {
    const marker = mapView.Markers.add(target, htmlContent, {
      rank: 'always-visible',
      placement: 'bottom',
    });
    activeSearchMarker = marker;
    return marker;
  } catch (e) {
    console.warn('Failed to add search location marker to map:', e);
    return null;
  }
}
