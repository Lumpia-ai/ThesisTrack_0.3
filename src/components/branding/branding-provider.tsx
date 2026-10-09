'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from 'react';
import {
  DEFAULT_BRANDING,
  SYSTEM_LOGO_SRC,
  getCssVariableMap,
  sanitizeBrandingSettings,
  type BrandingSettings
} from '@/lib/branding';

type BrandingContextValue = {
  branding: BrandingSettings;
  setBranding: (branding: BrandingSettings) => void;
  refreshBranding: () => Promise<void>;
};

const BrandingContext = createContext<BrandingContextValue | null>(null);
const BRANDING_SYNC_STORAGE_KEY = 'thesistrack.branding.current';
const BRANDING_PREVIEW_STORAGE_KEY = 'thesistrack.branding.preview';
const BRANDING_SYNC_EVENT = 'thesistrack:branding-updated';
const BRANDING_PREVIEW_EVENT = 'thesistrack:branding-preview-updated';
const BRANDING_SYNC_CHANNEL = 'thesistrack-branding';
const BRANDING_PREVIEW_CHANNEL = 'thesistrack-branding-preview';

function ensureFaviconElement() {
  let element = document.querySelector<HTMLLinkElement>('link[rel="icon"]');

  if (!element) {
    element = document.createElement('link');
    element.rel = 'icon';
    document.head.appendChild(element);
  }

  return element;
}

export function applyBrandingToDocument(brandingInput: BrandingSettings) {
  if (typeof document === 'undefined') {
    return;
  }

  const branding = sanitizeBrandingSettings(brandingInput);
  const root = document.documentElement;
  const cssVariables = getCssVariableMap(branding);

  Object.entries(cssVariables).forEach(([name, value]) => {
    root.style.setProperty(name, value);
  });

  root.dataset.themePreset = branding.themePreset;
  root.dataset.systemName = branding.systemName;

  if (branding.systemName) {
    document.title = branding.systemName;
  }

  ensureFaviconElement().href = branding.assets.favicon || branding.assets.mainLogo || SYSTEM_LOGO_SRC;
}

export function publishBrandingUpdate(brandingInput: BrandingSettings) {
  if (typeof window === 'undefined') {
    return;
  }

  const branding = sanitizeBrandingSettings(brandingInput);

  try {
    window.localStorage.setItem(BRANDING_SYNC_STORAGE_KEY, JSON.stringify(branding));
  } catch {
    // Local storage can be unavailable in strict browser modes.
  }

  window.dispatchEvent(new CustomEvent(BRANDING_SYNC_EVENT, {
    detail: branding
  }));

  if ('BroadcastChannel' in window) {
    const channel = new BroadcastChannel(BRANDING_SYNC_CHANNEL);
    channel.postMessage(branding);
    channel.close();
  }
}

export function publishBrandingPreview(brandingInput: BrandingSettings) {
  if (typeof window === 'undefined') {
    return;
  }

  const branding = sanitizeBrandingSettings(brandingInput);

  try {
    window.localStorage.setItem(BRANDING_PREVIEW_STORAGE_KEY, JSON.stringify(branding));
  } catch {
    // Local storage can be unavailable in strict browser modes.
  }

  window.dispatchEvent(new CustomEvent(BRANDING_PREVIEW_EVENT, {
    detail: branding
  }));

  if ('BroadcastChannel' in window) {
    const channel = new BroadcastChannel(BRANDING_PREVIEW_CHANNEL);
    channel.postMessage(branding);
    channel.close();
  }
}

export function clearBrandingPreview() {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.removeItem(BRANDING_PREVIEW_STORAGE_KEY);
  } catch {
    // Ignore storage cleanup issues.
  }
}

function isBrandingPreviewSession() {
  if (typeof window === 'undefined') {
    return false;
  }

  return new URLSearchParams(window.location.search).get('brandingPreview') === '1';
}

export function BrandingProvider({ children }: { children: ReactNode }) {
  const [branding, setBrandingState] = useState<BrandingSettings>(() => sanitizeBrandingSettings(DEFAULT_BRANDING));

  const setBranding = useCallback((nextBranding: BrandingSettings) => {
    const normalizedBranding = sanitizeBrandingSettings(nextBranding);

    setBrandingState(normalizedBranding);
    applyBrandingToDocument(normalizedBranding);
  }, []);

  const refreshBranding = useCallback(async () => {
    try {
      if (isBrandingPreviewSession()) {
        const previewBranding = window.localStorage.getItem(BRANDING_PREVIEW_STORAGE_KEY);

        if (previewBranding) {
          setBranding(sanitizeBrandingSettings(JSON.parse(previewBranding)));
          return;
        }
      }

      const response = await fetch('/api/branding', {
        cache: 'no-store'
      });
      const payload = (await response.json()) as {
        success?: boolean;
        branding?: unknown;
      };

      if (!response.ok || !payload.success) {
        throw new Error('Unable to load branding.');
      }

      setBranding(sanitizeBrandingSettings(payload.branding));
    } catch {
      setBranding(sanitizeBrandingSettings(DEFAULT_BRANDING));
    }
  }, [setBranding]);

  useEffect(() => {
    applyBrandingToDocument(branding);
  }, [branding]);

  useEffect(() => {
    void refreshBranding();
  }, [refreshBranding]);

  useEffect(() => {
    const applySyncedBranding = (value: unknown) => {
      setBranding(sanitizeBrandingSettings(value));
    };
    const isPreview = isBrandingPreviewSession();
    const storageKey = isPreview ? BRANDING_PREVIEW_STORAGE_KEY : BRANDING_SYNC_STORAGE_KEY;
    const eventName = isPreview ? BRANDING_PREVIEW_EVENT : BRANDING_SYNC_EVENT;
    const channelName = isPreview ? BRANDING_PREVIEW_CHANNEL : BRANDING_SYNC_CHANNEL;

    const handleCustomEvent = (event: Event) => {
      applySyncedBranding((event as CustomEvent<unknown>).detail);
    };

    const handleStorageEvent = (event: StorageEvent) => {
      if (event.key !== storageKey || !event.newValue) {
        return;
      }

      try {
        applySyncedBranding(JSON.parse(event.newValue));
      } catch {
        // Ignore malformed storage payloads.
      }
    };

    let channel: BroadcastChannel | null = null;

    if ('BroadcastChannel' in window) {
      channel = new BroadcastChannel(channelName);
      channel.onmessage = (event) => {
        applySyncedBranding(event.data);
      };
    }

    try {
      const cachedBranding = window.localStorage.getItem(storageKey);

      if (cachedBranding) {
        applySyncedBranding(JSON.parse(cachedBranding));
      }
    } catch {
      // The API refresh still provides the authoritative branding.
    }

    window.addEventListener(eventName, handleCustomEvent);
    window.addEventListener('storage', handleStorageEvent);

    return () => {
      window.removeEventListener(eventName, handleCustomEvent);
      window.removeEventListener('storage', handleStorageEvent);
      channel?.close();
    };
  }, [setBranding]);

  const value = useMemo<BrandingContextValue>(() => ({
    branding,
    setBranding,
    refreshBranding
  }), [branding, refreshBranding, setBranding]);

  return (
    <BrandingContext.Provider value={value}>
      {children}
    </BrandingContext.Provider>
  );
}

export function useBranding() {
  const context = useContext(BrandingContext);

  if (!context) {
    return {
      branding: sanitizeBrandingSettings(DEFAULT_BRANDING),
      setBranding: applyBrandingToDocument,
      refreshBranding: async () => undefined
    };
  }

  return context;
}
