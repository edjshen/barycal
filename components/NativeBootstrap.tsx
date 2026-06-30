'use client';
import { useEffect } from 'react';
import { initNative } from '@/lib/native/bridge.js';

/**
 * Mounts once at the app root. On the web it does nothing; inside the Capacitor
 * native shell it sets up the status bar, hides the splash screen, and registers
 * the device for push notifications. Renders no UI.
 */
export default function NativeBootstrap() {
  useEffect(() => {
    void initNative();
  }, []);
  return null;
}
