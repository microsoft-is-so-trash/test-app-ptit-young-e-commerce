'use client';

import React, { useEffect, useRef, useState } from 'react';
import { ApiError, api } from '../lib/api';
import { DEMO_OFFLINE } from '../lib/demo-mode';
import {
  newPlacesSessionToken,
  parseCoordinates,
  PLACES_DEBOUNCE_MS,
  shouldSearchPlaces,
  type Coordinates,
  type PlaceSuggestion,
} from '../lib/place-search';

/**
 * I1.1: admin tìm địa chỉ (Places API New qua backend) rồi kéo ghim trên Google Maps JavaScript để
 * xác nhận. Ô nhập tay vĩ độ/kinh độ của form vẫn là dự phòng. Bản đồ chỉ tải khi có key giao diện
 * và đã có toạ độ; key giao diện giới hạn theo tên miền, chỉ bật Maps JavaScript (E1, Q22).
 */
const BROWSER_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY?.trim() ?? '';
const MAP_ZOOM = 17;

// Kiểu tối thiểu của Google Maps JavaScript API đang dùng (không thêm thư viện @types).
interface LatLngLike {
  lat(): number;
  lng(): number;
}
interface GoogleMarker {
  setPosition(position: Coordinates): void;
  getPosition(): LatLngLike | null;
  addListener(event: 'dragend', handler: () => void): void;
  setMap(map: null): void;
}
interface GoogleMap {
  panTo(position: Coordinates): void;
}
interface GoogleMapsNamespace {
  maps: {
    Map: new (element: HTMLElement, options: Record<string, unknown>) => GoogleMap;
    Marker: new (options: { position: Coordinates; map: GoogleMap; draggable: boolean; title: string }) => GoogleMarker;
  };
}
declare global {
  interface Window {
    google?: GoogleMapsNamespace;
    __ecoOilMapsReady?: () => void;
  }
}

let mapsLoader: Promise<GoogleMapsNamespace> | null = null;

function loadGoogleMaps(key: string): Promise<GoogleMapsNamespace> {
  if (window.google?.maps) return Promise.resolve(window.google);
  if (mapsLoader) return mapsLoader;
  mapsLoader = new Promise<GoogleMapsNamespace>((resolve, reject) => {
    window.__ecoOilMapsReady = () => (window.google ? resolve(window.google) : reject(new Error('Google Maps không sẵn sàng')));
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?${new URLSearchParams({ key, v: 'weekly', loading: 'async', callback: '__ecoOilMapsReady' })}`;
    script.async = true;
    script.onerror = () => {
      mapsLoader = null;
      reject(new Error('Không tải được bản đồ'));
    };
    document.head.appendChild(script);
  });
  return mapsLoader;
}

function StationPinMap({ position, onMove }: { position: Coordinates; onMove: (position: Coordinates) => void }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<GoogleMap | null>(null);
  const markerRef = useRef<GoogleMarker | null>(null);
  const onMoveRef = useRef(onMove);
  const [error, setError] = useState<string | null>(null);
  onMoveRef.current = onMove;

  useEffect(() => {
    let cancelled = false;
    void loadGoogleMaps(BROWSER_KEY)
      .then((google) => {
        if (cancelled || !containerRef.current || mapRef.current) return;
        mapRef.current = new google.maps.Map(containerRef.current, {
          center: position,
          zoom: MAP_ZOOM,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
        });
        markerRef.current = new google.maps.Marker({ position, map: mapRef.current, draggable: true, title: 'Vị trí trạm' });
        markerRef.current.addListener('dragend', () => {
          const moved = markerRef.current?.getPosition();
          if (moved) onMoveRef.current({ lat: moved.lat(), lng: moved.lng() });
        });
      })
      .catch((loadError: unknown) => setError(loadError instanceof Error ? loadError.message : 'Không tải được bản đồ'));
    return () => {
      cancelled = true;
    };
    // Bản đồ chỉ tạo một lần; vị trí mới được cập nhật ở effect bên dưới.
  }, []);

  useEffect(() => {
    markerRef.current?.setPosition(position);
    mapRef.current?.panTo(position);
  }, [position.lat, position.lng]);

  useEffect(() => () => markerRef.current?.setMap(null), []);

  if (error) {
    return <p className="text-sm font-semibold text-error" role="alert">{error}. Hãy nhập vĩ độ, kinh độ bằng tay.</p>;
  }
  return (
    <div className="grid gap-1">
      <div ref={containerRef} className="h-64 w-full overflow-hidden rounded-xl border border-outline-variant" aria-label="Bản đồ vị trí trạm" />
      <p className="text-xs text-on-surface-variant">Kéo ghim trên bản đồ để chỉnh vị trí.</p>
    </div>
  );
}

export function StationLocationPicker({ lat, lng, onPick }: { lat: string; lng: string; onPick: (position: Coordinates) => void }) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sessionTokenRef = useRef(newPlacesSessionToken());
  const requestIdRef = useRef(0);
  const position = parseCoordinates(lat, lng);

  useEffect(() => {
    if (DEMO_OFFLINE || !shouldSearchPlaces(query)) {
      setSuggestions([]);
      return;
    }
    const requestId = ++requestIdRef.current;
    const timer = setTimeout(() => {
      setSearching(true);
      setError(null);
      api
        .placesAutocomplete(query.trim(), sessionTokenRef.current)
        .then((result) => {
          if (requestId === requestIdRef.current) setSuggestions(result);
        })
        .catch((searchError: unknown) => {
          if (requestId !== requestIdRef.current) return;
          setSuggestions([]);
          setError(searchError instanceof ApiError || searchError instanceof Error ? searchError.message : 'Không tìm được địa chỉ.');
        })
        .finally(() => {
          if (requestId === requestIdRef.current) setSearching(false);
        });
    }, PLACES_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query]);

  async function choose(suggestion: PlaceSuggestion): Promise<void> {
    setError(null);
    try {
      const place = await api.placeDetails(suggestion.place_id, sessionTokenRef.current);
      onPick({ lat: place.lat, lng: place.lng });
      setQuery(suggestion.text);
    } catch (detailsError) {
      setError(detailsError instanceof ApiError || detailsError instanceof Error ? detailsError.message : 'Không lấy được vị trí.');
    } finally {
      // Place Details kết thúc phiên tìm kiếm; lần tìm sau dùng phiên mới (tính phí theo phiên).
      sessionTokenRef.current = newPlacesSessionToken();
      requestIdRef.current += 1;
      setSuggestions([]);
    }
  }

  return (
    <div className="grid gap-2 md:col-span-2">
      {!DEMO_OFFLINE ? (
        <label className="grid gap-1 text-sm font-semibold text-on-surface-variant">
          Tìm vị trí theo địa chỉ
          <input
            className="min-h-11 rounded-xl border border-outline-variant bg-surface-container-lowest px-3 font-normal text-on-surface transition focus:border-primary"
            value={query}
            placeholder="Gõ địa chỉ trạm, ví dụ 22 Hàng Bạc"
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
      ) : null}
      {searching ? <p className="text-xs text-on-surface-variant">Đang tìm…</p> : null}
      {error ? <p className="text-sm font-semibold text-error" role="alert">{error}</p> : null}
      {suggestions.length > 0 ? (
        <ul className="grid gap-1 rounded-xl border border-outline-variant bg-surface-container-lowest p-1" aria-label="Gợi ý địa chỉ">
          {suggestions.map((suggestion) => (
            <li key={suggestion.place_id}>
              <button
                type="button"
                className="w-full rounded-lg px-3 py-2 text-left text-sm text-on-surface transition hover:bg-surface-container-high"
                onClick={() => { void choose(suggestion); }}
              >
                <span className="font-semibold">{suggestion.main_text ?? suggestion.text}</span>
                {suggestion.secondary_text ? <span className="block text-xs text-on-surface-variant">{suggestion.secondary_text}</span> : null}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {BROWSER_KEY && position ? <StationPinMap position={position} onMove={onPick} /> : null}
    </div>
  );
}
