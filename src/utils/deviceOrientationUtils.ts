/**
 * Utility for tracking real-time device orientation and compass heading.
 * Supports standard DeviceOrientation events as well as iOS webkitCompassHeading.
 */

import { smoothAngleDegrees } from './locationSmoothing';

export type OrientationCallback = (headingDegrees: number) => void;

class DeviceOrientationManager {
  private activeListener: ((event: DeviceOrientationEvent) => void) | null = null;
  private currentHeading: number | null = null;
  private callbacks: Set<OrientationCallback> = new Set();
  private isListening = false;

  /**
   * Request permission for Device Orientation if required (e.g. iOS 13+ Safari).
   */
  public async requestPermission(): Promise<boolean> {
    if (
      typeof window !== 'undefined' &&
      typeof (DeviceOrientationEvent as any) !== 'undefined' &&
      typeof (DeviceOrientationEvent as any).requestPermission === 'function'
    ) {
      try {
        const permissionState = await (DeviceOrientationEvent as any).requestPermission();
        return permissionState === 'granted';
      } catch (e) {
        console.warn('DeviceOrientation permission error:', e);
        return false;
      }
    }
    return true;
  }

  /**
   * Start tracking device orientation.
   */
  public start(callback?: OrientationCallback): void {
    if (callback) {
      this.callbacks.add(callback);
    }

    if (this.isListening || typeof window === 'undefined') return;

    const handleOrientation = (event: DeviceOrientationEvent) => {
      let heading: number | null = null;

      // 1. iOS webkitCompassHeading (0 = North, clockwise)
      if (typeof (event as any).webkitCompassHeading === 'number') {
        const rawHeading = (event as any).webkitCompassHeading;
        if (!Number.isNaN(rawHeading) && rawHeading >= 0) {
          heading = rawHeading;
        }
      }
      // 2. Standard W3C DeviceOrientation (alpha: 0-360)
      else if (event.alpha !== null && !Number.isNaN(event.alpha)) {
        heading = (360 - event.alpha) % 360;
      }

      if (heading !== null && !Number.isNaN(heading)) {
        this.currentHeading = smoothAngleDegrees(this.currentHeading, heading, 0.25);
        const headingValue = this.currentHeading;
        this.callbacks.forEach((cb) => cb(headingValue));
      }
    };

    this.activeListener = handleOrientation;

    const win = window as any;
    if ('ondeviceorientationabsolute' in win) {
      win.addEventListener('deviceorientationabsolute', handleOrientation, true);
    } else if ('ondeviceorientation' in win) {
      win.addEventListener('deviceorientation', handleOrientation, true);
    }

    this.isListening = true;
  }

  /**
   * Stop tracking device orientation.
   */
  public stop(callback?: OrientationCallback): void {
    if (callback) {
      this.callbacks.delete(callback);
    }

    if (this.callbacks.size === 0 && this.isListening && typeof window !== 'undefined') {
      const win = window as any;
      if (this.activeListener) {
        win.removeEventListener('deviceorientationabsolute', this.activeListener, true);
        win.removeEventListener('deviceorientation', this.activeListener, true);
        this.activeListener = null;
      }
      this.isListening = false;
      this.currentHeading = null;
    }
  }

  /**
   * Returns current heading in degrees or null if unavailable.
   */
  public getCurrentHeading(): number | null {
    return this.currentHeading;
  }
}

export const deviceOrientationManager = new DeviceOrientationManager();
