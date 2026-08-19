/**
 * Location Smoothing, Noise Reduction, Outlier Rejection, and Map Path Snapping Engine
 * Designed for High-Precision Blue Dot Navigation on Mappedin Maps.
 */

export interface LocationPoint {
  latitude: number;
  longitude: number;
  accuracy?: number;
  heading?: number | null;
  speed?: number | null;
  timestamp?: number;
}

/**
 * Calculates Haversine distance in meters between two lat/lon points.
 */
export function haversineDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Calculates bearing in degrees (0-360) from point 1 to point 2.
 */
export function calculateBearingDegrees(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const y = Math.sin(deltaLambda) * Math.cos(phi2);
  const x =
    Math.cos(phi1) * Math.sin(phi2) -
    Math.sin(phi1) * Math.cos(phi2) * Math.cos(deltaLambda);

  const theta = Math.atan2(y, x);
  const bearing = ((theta * 180) / Math.PI + 360) % 360;
  return bearing;
}

/**
 * Smooths circular angles (like compass headings) taking wrap-around at 0/360 degrees into account.
 */
export function smoothAngleDegrees(
  currentAngle: number | null | undefined,
  targetAngle: number,
  alpha: number = 0.25
): number {
  if (currentAngle == null || Number.isNaN(currentAngle)) {
    return targetAngle;
  }
  let diff = targetAngle - currentAngle;
  // Normalize angle diff to [-180, 180]
  while (diff < -180) diff += 360;
  while (diff > 180) diff -= 360;

  const smoothed = (currentAngle + diff * alpha + 360) % 360;
  return smoothed;
}

/**
 * Distance from point (px, py) to line segment (x1, y1)-(x2, y2) in 2D coordinates.
 * Returns closest point on segment and distance in meters.
 */
export function projectPointOntoSegment(
  lat: number,
  lon: number,
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): { closestLat: number; closestLon: number; distanceMeters: number; t: number } {
  const dSeg = haversineDistanceMeters(lat1, lon1, lat2, lon2);
  if (dSeg < 0.1) {
    return {
      closestLat: lat1,
      closestLon: lon1,
      distanceMeters: haversineDistanceMeters(lat, lon, lat1, lon1),
      t: 0,
    };
  }

  // Convert to flat meters relative to (lat1, lon1)
  const cosLat = Math.cos((lat1 * Math.PI) / 180);
  const px = (lon - lon1) * 111320 * cosLat;
  const py = (lat - lat1) * 110540;

  const vx = (lon2 - lon1) * 111320 * cosLat;
  const vy = (lat2 - lat1) * 110540;

  const segLengthSq = vx * vx + vy * vy;
  if (segLengthSq === 0) {
    return {
      closestLat: lat1,
      closestLon: lon1,
      distanceMeters: haversineDistanceMeters(lat, lon, lat1, lon1),
      t: 0,
    };
  }

  let t = (px * vx + py * vy) / segLengthSq;
  t = Math.max(0, Math.min(1, t));

  const projLon = lon1 + (t * (lon2 - lon1));
  const projLat = lat1 + (t * (lat2 - lat1));

  const dist = haversineDistanceMeters(lat, lon, projLat, projLon);

  return {
    closestLat: projLat,
    closestLon: projLon,
    distanceMeters: dist,
    t,
  };
}

/**
 * Location smoothing engine class using Exponential Weighted Moving Average (EWMA)
 * with outlier rejection, stationary dampening, and velocity bounds.
 */
export class LocationSmoothingEngine {
  private smoothedLat: number | null = null;
  private smoothedLon: number | null = null;
  private smoothedAccuracy: number | null = null;
  private smoothedHeading: number | null = null;
  private lastTimestamp: number = 0;

  // Configuration parameters
  private readonly posAlpha: number; // Position smoothing factor (0.1 - 0.4)
  private readonly maxAllowedAccuracy: number; // Max GPS accuracy radius in meters
  private readonly maxSpeedMetersPerSec: number; // Max realistic walking speed (e.g. 5 m/s)
  private readonly stationaryThresholdMeters: number; // Micro-jitter threshold when standing still

  constructor(options?: {
    posAlpha?: number;
    maxAllowedAccuracy?: number;
    maxSpeedMetersPerSec?: number;
    stationaryThresholdMeters?: number;
  }) {
    this.posAlpha = options?.posAlpha ?? 0.28;
    this.maxAllowedAccuracy = options?.maxAllowedAccuracy ?? 50;
    this.maxSpeedMetersPerSec = options?.maxSpeedMetersPerSec ?? 6.0; // ~21 km/h max cap
    this.stationaryThresholdMeters = options?.stationaryThresholdMeters ?? 1.2;
  }

  /**
   * Resets internal state (e.g., when location tracking restarts or simulation toggles).
   */
  public reset(): void {
    this.smoothedLat = null;
    this.smoothedLon = null;
    this.smoothedAccuracy = null;
    this.smoothedHeading = null;
    this.lastTimestamp = 0;
  }

  /**
   * Processes a raw location fix and returns a smoothed, noise-filtered location fix.
   */
  public filter(rawPoint: LocationPoint): LocationPoint {
    const now = rawPoint.timestamp || Date.now();
    const rawAccuracy = rawPoint.accuracy ?? 15;

    // Initial fix check
    if (this.smoothedLat === null || this.smoothedLon === null) {
      this.smoothedLat = rawPoint.latitude;
      this.smoothedLon = rawPoint.longitude;
      this.smoothedAccuracy = rawAccuracy;
      this.smoothedHeading = rawPoint.heading ?? null;
      this.lastTimestamp = now;
      return {
        latitude: this.smoothedLat,
        longitude: this.smoothedLon,
        accuracy: this.smoothedAccuracy,
        heading: this.smoothedHeading,
        speed: rawPoint.speed,
        timestamp: now,
      };
    }

    // 1. Outlier Rejection: Ignore extremely poor accuracy fixes unless no better fix exists
    if (rawAccuracy > this.maxAllowedAccuracy && (this.smoothedAccuracy || 0) < 25) {
      return {
        latitude: this.smoothedLat,
        longitude: this.smoothedLon,
        accuracy: this.smoothedAccuracy || rawAccuracy,
        heading: this.smoothedHeading,
        speed: 0,
        timestamp: now,
      };
    }

    const distFromLast = haversineDistanceMeters(
      this.smoothedLat,
      this.smoothedLon,
      rawPoint.latitude,
      rawPoint.longitude
    );

    const deltaTimeSec = Math.max(0.1, (now - this.lastTimestamp) / 1000);
    const calculatedSpeed = distFromLast / deltaTimeSec;

    // 2. Velocity Bound / Jump Protection: Reject wild GPS jumps (> maxSpeedMetersPerSec)
    if (distFromLast > 35 && calculatedSpeed > this.maxSpeedMetersPerSec) {
      console.warn(
        `[LocationSmoothingEngine] Rejected GPS jump of ${distFromLast.toFixed(1)}m in ${deltaTimeSec.toFixed(1)}s (speed: ${calculatedSpeed.toFixed(1)}m/s)`
      );
      return {
        latitude: this.smoothedLat,
        longitude: this.smoothedLon,
        accuracy: this.smoothedAccuracy || rawAccuracy,
        heading: this.smoothedHeading,
        speed: 0,
        timestamp: now,
      };
    }

    // 3. Stationary Micro-Jitter Suppression: If change is less than threshold, hold position
    if (distFromLast < this.stationaryThresholdMeters) {
      if (rawPoint.heading != null && !Number.isNaN(rawPoint.heading)) {
        this.smoothedHeading = smoothAngleDegrees(this.smoothedHeading, rawPoint.heading, 0.2);
      }
      this.smoothedAccuracy = this.smoothedAccuracy
        ? this.smoothedAccuracy * 0.9 + rawAccuracy * 0.1
        : rawAccuracy;
      this.lastTimestamp = now;
      return {
        latitude: this.smoothedLat,
        longitude: this.smoothedLon,
        accuracy: this.smoothedAccuracy,
        heading: this.smoothedHeading,
        speed: 0,
        timestamp: now,
      };
    }

    // 4. Adaptive EWMA Smoothing
    // High accuracy -> trust incoming data more (higher alpha). Low accuracy -> rely on smoothed data.
    const accuracyRatio = Math.min(1.0, Math.max(0.1, 10 / Math.max(1, rawAccuracy)));
    const adaptiveAlpha = Math.min(0.65, Math.max(0.15, this.posAlpha * (0.8 + 0.4 * accuracyRatio)));

    this.smoothedLat = this.smoothedLat + (rawPoint.latitude - this.smoothedLat) * adaptiveAlpha;
    this.smoothedLon = this.smoothedLon + (rawPoint.longitude - this.smoothedLon) * adaptiveAlpha;
    this.smoothedAccuracy =
      (this.smoothedAccuracy ?? rawAccuracy) * (1 - adaptiveAlpha) + rawAccuracy * adaptiveAlpha;

    // 5. Heading Calculation (derive movement bearing if GPS heading is missing)
    let finalHeading = rawPoint.heading ?? null;
    if (distFromLast > 1.8 && (finalHeading == null || Number.isNaN(finalHeading))) {
      finalHeading = calculateBearingDegrees(
        this.smoothedLat,
        this.smoothedLon,
        rawPoint.latitude,
        rawPoint.longitude
      );
    }

    if (finalHeading != null && !Number.isNaN(finalHeading)) {
      this.smoothedHeading = smoothAngleDegrees(this.smoothedHeading, finalHeading, 0.3);
    }

    this.lastTimestamp = now;

    return {
      latitude: this.smoothedLat,
      longitude: this.smoothedLon,
      accuracy: Math.round(this.smoothedAccuracy),
      heading: this.smoothedHeading,
      speed: calculatedSpeed,
      timestamp: now,
    };
  }

  /**
   * Snaps a position to the nearest segment of a navigation path polyline if within maxSnapDistanceMeters.
   */
  public snapToPath(
    point: LocationPoint,
    pathCoordinates: Array<{ latitude: number; longitude: number }>,
    maxSnapDistanceMeters: number = 10
  ): LocationPoint {
    if (!pathCoordinates || pathCoordinates.length < 2) {
      return point;
    }

    let minDistance = Infinity;
    let bestSnapLat = point.latitude;
    let bestSnapLon = point.longitude;

    for (let i = 0; i < pathCoordinates.length - 1; i++) {
      const p1 = pathCoordinates[i];
      const p2 = pathCoordinates[i + 1];
      if (typeof p1.latitude !== 'number' || typeof p2.latitude !== 'number') continue;

      const proj = projectPointOntoSegment(
        point.latitude,
        point.longitude,
        p1.latitude,
        p1.longitude,
        p2.latitude,
        p2.longitude
      );

      if (proj.distanceMeters < minDistance) {
        minDistance = proj.distanceMeters;
        bestSnapLat = proj.closestLat;
        bestSnapLon = proj.closestLon;
      }
    }

    if (minDistance <= maxSnapDistanceMeters) {
      // Blend 80% snapped to path, 20% raw smoothed coordinate for organic feel
      const blendFactor = Math.max(0.6, 1.0 - minDistance / maxSnapDistanceMeters);
      const snappedLat = point.latitude + (bestSnapLat - point.latitude) * blendFactor;
      const snappedLon = point.longitude + (bestSnapLon - point.longitude) * blendFactor;

      return {
        ...point,
        latitude: snappedLat,
        longitude: snappedLon,
        accuracy: Math.min(point.accuracy ?? 10, 4), // High confidence when snapped to path
      };
    }

    return point;
  }
}
