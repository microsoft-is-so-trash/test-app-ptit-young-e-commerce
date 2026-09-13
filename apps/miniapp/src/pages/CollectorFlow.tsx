import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { ContainerLookupResponse, GeoPoint, RouteStop } from '@eco-oil/shared-types';
import { ApiError, api } from '../lib/api';
import { getLatestStationReceipt, type StoredStationReceipt } from '../lib/outbox-db';
import { useOnlineStatus, useOutboxRows, useOutboxStats } from '../lib/outbox-hooks';
import { canUseOfflineCache, loadRouteWithCache, prefetchRouteData, type RouteLoadResult } from '../lib/offline-cache';
import { startOutboxSyncWorker } from '../lib/outbox-sync';
import { pendingStationDeliveryStorage } from '../lib/storage';
import type { PendingStationDeliveryDraft } from '../lib/storage';
import { zaloClient } from '../lib/zalo-client';
import { findRowForStop, reconcileRouteProgress, type CompletedStop } from '../lib/collector-metrics';
import {
  completeCollectorShiftSafely,
  createLocationAttemptRunner,
  createRouteRefreshRunner,
  refreshRouteWithLocation,
  type LocationAttemptResult,
  type RouteRefreshNotice,
} from '../lib/collector-runtime';
import { useAuthStore } from '../stores/auth-store';
import { StatusView } from '../components/StatusView';
import { CollectorNotice } from '../components/CollectorNotice';
import { CollectorRouteScreen } from './collector/CollectorRouteScreen';
import { CollectorQrScreen } from './collector/CollectorQrScreen';
import { CollectorEntryScreen } from './collector/CollectorEntryScreen';
import { CollectorSummaryScreen } from './collector/CollectorSummaryScreen';
import { SavedStationReceiptView } from './collector/SavedStationReceiptView';
import { OutboxQueueScreen } from './collector/OutboxQueueScreen';
import { StationDeliveryFlow } from './StationDeliveryFlow';

type CollectorScreen =
  | { name: 'route' }
  | { name: 'qr'; stop: RouteStop }
  | { name: 'entry'; stop: RouteStop; container: ContainerLookupResponse; containerCode: string }
  | { name: 'summary' }
  | { name: 'station-delivery' }
  | { name: 'receipt-view' }
  | { name: 'outbox' };
interface CollectorFlowProps {
  /** Báo cho vỏ ngoài biết đang ở màn nào để ẩn thanh tab khi thao tác dở dang. */
  onScreenChange?: (screen: CollectorScreen['name']) => void;
}

export function CollectorFlow({ onScreenChange }: CollectorFlowProps = {}) {
  const queryClient = useQueryClient();
  const collectorStorageId = useAuthStore((state) => state.user?.collectorId ?? state.user?.id ?? null);
  const [restoredShift] = useState(() => collectorStorageId ? pendingStationDeliveryStorage.load(collectorStorageId) : null);
  const restoredRouteId = restoredShift?.routeId ?? restoredShift?.activeRoute?.route_id ?? undefined;
  const [screen, setScreen] = useState<CollectorScreen>(() => restoredRouteId && Object.keys(restoredShift?.completed ?? {}).length > 0 ? { name: 'summary' } : { name: 'route' });
  const [location, setLocation] = useState<GeoPoint | null>(null);
  const [locationDenied, setLocationDenied] = useState(false);
  const [completed, setCompleted] = useState<Record<string, CompletedStop>>(restoredShift?.completed ?? {});
  const [pendingDelivery, setPendingDelivery] = useState<PendingStationDeliveryDraft | null>(restoredShift?.pendingDelivery ?? null);
  const [initialStopCount, setInitialStopCount] = useState<number | null>(restoredShift?.totalStops ?? null);
  const [routeClientUuid] = useState(() => restoredShift?.routeClientUuid ?? crypto.randomUUID());
  const [shiftStarted, setShiftStarted] = useState(() => Boolean(restoredShift?.activeRoute?.persisted));
  const [shiftError, setShiftError] = useState<string | null>(null);
  const [finishing, setFinishing] = useState(false);
  const [lastReceipt, setLastReceipt] = useState<StoredStationReceipt | null>(null);
  const [prefetching, setPrefetching] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshNotice, setRefreshNotice] = useState<RouteRefreshNotice | null>(null);
  const refreshRunner = useRef<(() => Promise<void>) | null>(null);
  const locationRunner = useRef<(() => Promise<LocationAttemptResult>) | null>(null);
  const routeDataRef = useRef<RouteLoadResult | undefined>(undefined);
  const locationRef = useRef<GeoPoint | null>(null);
  const online = useOnlineStatus();

  useEffect(() => {
    onScreenChange?.(screen.name);
  }, [onScreenChange, screen.name]);
  const outboxStats = useOutboxStats();
  const outboxRows = useOutboxRows();

  if (locationRunner.current === null) {
    locationRunner.current = createLocationAttemptRunner(() => zaloClient.getLocation());
  }

  useEffect(() => {
    void startOutboxSyncWorker();
    let active = true;
    void locationRunner.current?.().then(({ point, failed }) => {
      if (!active) return;
      setLocation(point);
      setLocationDenied(failed);
    });
    return () => {
      active = false;
    };
  }, []);

  const route = useQuery<RouteLoadResult>({
    queryKey: ['collector-route', collectorStorageId, location],
    queryFn: async () => {
      try {
        return await loadRouteWithCache(location ?? undefined, collectorStorageId);
      } catch (error) {
        if (restoredShift?.activeRoute && canUseOfflineCache(error)) {
          return { route: restoredShift.activeRoute, fromCache: true, cachedAt: restoredShift.savedAt };
        }
        throw error;
      }
    },
    staleTime: 15_000,
  });
  const routeProgress = route.data
    ? reconcileRouteProgress(route.data.route, completed, route.data.route.route_id ?? restoredRouteId, outboxRows)
    : { completed, completedOrderIds: Object.keys(completed), skippedOrderIds: [] };
  routeDataRef.current = route.data;
  locationRef.current = location;

  useEffect(() => {
    const loadedRouteId = route.data?.route.route_id;
    if (!loadedRouteId || !restoredRouteId || loadedRouteId === restoredRouteId) return;
    setCompleted({});
    setPendingDelivery(null);
    setInitialStopCount(route.data?.route.stops.length ?? 0);
    setShiftStarted(Boolean(route.data?.route.persisted));
    setScreen({ name: 'route' });
  }, [restoredRouteId, route.data?.route.route_id, route.data?.route.persisted, route.data?.route.stops.length]);

  useEffect(() => {
    let active = true;
    if (!collectorStorageId) {
      setLastReceipt(null);
      return () => {
        active = false;
      };
    }
    void getLatestStationReceipt(collectorStorageId).then((receipt) => {
      if (active) setLastReceipt(receipt);
    }).catch(() => {
      if (active) setLastReceipt(null);
    });
    return () => {
      active = false;
    };
  }, [collectorStorageId]);

  if (refreshRunner.current === null) {
    refreshRunner.current = createRouteRefreshRunner(
      async () => {
        const fallback = routeDataRef.current?.route.stops.find((stop) => stop.ward_center)?.ward_center ?? locationRef.current;
        const attempt = locationRunner.current;
        const refreshed = await refreshRouteWithLocation(
          async () => {
            const result = await attempt?.() ?? { point: null, failed: true };
            if (result.failed) throw result.error ?? new Error('Không lấy được GPS');
            return result.point;
          },
          (point) => loadRouteWithCache(point, collectorStorageId),
          fallback,
        );
        if (refreshed.point) {
          setLocation(refreshed.point);
        }
        setLocationDenied(refreshed.gpsFallback ?? false);
        if (refreshed.data) {
          queryClient.setQueryData(['collector-route', collectorStorageId, refreshed.point], refreshed.data);
        }
        return refreshed;
      },
      ({ busy, notice }) => {
        setRefreshing(busy);
        setRefreshNotice(notice);
      },
    );
  }
  const refreshRoute = refreshRunner.current;

  useEffect(() => {
    const wardCenter = route.data?.route.stops.find((stop) => stop.ward_center)?.ward_center;
    if (!location && wardCenter) {
      setLocation(wardCenter);
      setLocationDenied(true);
    }
  }, [location, route.data]);

  useEffect(() => {
    if (route.data) {
      setInitialStopCount((current) => Math.max(current ?? 0, route.data.route.stops.length));
    }
  }, [initialStopCount, route.data]);

  useEffect(() => {
    const activeRoute = route.data?.route;
    if (!activeRoute?.persisted || !collectorStorageId) return;
    setShiftStarted(true);
    pendingStationDeliveryStorage.save(collectorStorageId, {
      completed,
      totalStops: initialStopCount ?? activeRoute.stops.length,
      savedAt: new Date().toISOString(),
      activeRoute,
      routeId: activeRoute.route_id ?? undefined,
      routeClientUuid: activeRoute.client_uuid ?? routeClientUuid,
      pendingDelivery: pendingDelivery ?? undefined,
    });
  }, [collectorStorageId, completed, initialStopCount, pendingDelivery, route.data?.route, routeClientUuid]);

  async function startShift(): Promise<void> {
    if (!route.data || prefetching) {
      return;
    }
    if (!online) {
      setShiftError('Cần kết nối mạng một lần để bắt đầu ca và giữ tuyến.');
      return;
    }
    setPrefetching(true);
    setShiftError(null);
    try {
      const startedRoute = route.data.route.persisted
        ? route.data.route
        : await api.startRoute(routeClientUuid, location ?? undefined);
      await prefetchRouteData(startedRoute, location, collectorStorageId);
      queryClient.setQueryData(['collector-route', collectorStorageId, location], { route: startedRoute, fromCache: false, cachedAt: null });
      if (collectorStorageId) {
        pendingStationDeliveryStorage.save(collectorStorageId, {
          completed,
          totalStops: initialStopCount ?? startedRoute.stops.length,
          savedAt: new Date().toISOString(),
          activeRoute: startedRoute,
          routeId: startedRoute.route_id ?? undefined,
          routeClientUuid: startedRoute.client_uuid ?? routeClientUuid,
          pendingDelivery: pendingDelivery ?? undefined,
        });
      }
      setShiftStarted(true);
    } catch (error) {
      setShiftError(error instanceof ApiError ? error.message : 'Không thể bắt đầu ca. Vui lòng thử lại.');
    } finally {
      setPrefetching(false);
    }
  }

  async function cancelShift(): Promise<void> {
    if (!shiftStarted || Object.keys(completed).length > 0 || prefetching) return;
    if (typeof window !== 'undefined' && !window.confirm('Bạn có chắc muốn hủy ca thu gom này không?')) return;
    setPrefetching(true);
    setShiftError(null);
    try {
      await api.cancelCurrentRoute();
      if (collectorStorageId) pendingStationDeliveryStorage.clear(collectorStorageId);
      setShiftStarted(false);
      await queryClient.invalidateQueries({ queryKey: ['collector-route'] });
    } catch (error) {
      setShiftError(error instanceof ApiError ? error.message : 'Không thể hủy ca. Vui lòng thử lại.');
    } finally {
      setPrefetching(false);
    }
  }

  function onCollectionSaved(stop: RouteStop, liters: number, kilograms: number | null, clientUuid: string): void {
    const nextCompleted = { ...completed, [stop.order_id]: { liters, kilograms, clientUuid, stop } };
    const totalStops = Math.max(initialStopCount ?? route.data?.route.stops.length ?? 0, Object.keys(nextCompleted).length);
    setCompleted(nextCompleted);
    setInitialStopCount(totalStops);
    if (collectorStorageId) {
      pendingStationDeliveryStorage.save(collectorStorageId, {
        completed: nextCompleted,
        totalStops,
        savedAt: new Date().toISOString(),
        activeRoute: route.data?.route.persisted ? route.data.route : undefined,
        routeId: route.data?.route.route_id ?? restoredRouteId,
        routeClientUuid: route.data?.route.client_uuid ?? routeClientUuid,
        pendingDelivery: pendingDelivery ?? undefined,
      });
    }
    setScreen({ name: 'route' });
    void queryClient.invalidateQueries({ queryKey: ['collector-route'] });
  }

  function clearPersistedShift(): void {
    if (collectorStorageId) pendingStationDeliveryStorage.clear(collectorStorageId);
    setPendingDelivery(null);
  }

  async function finishShift(): Promise<boolean> {
    if (finishing) return false;
    if (route.data?.route.persisted && !online) {
      setShiftError('Đang ngoại tuyến. Ca và tuyến vẫn được giữ trên máy; hãy kết nối mạng để kết ca.');
      return false;
    }
    setFinishing(true);
    setShiftError(null);
    try {
      const completedSafely = await completeCollectorShiftSafely({
        persisted: Boolean(route.data?.route.persisted),
        online,
        completeRemote: () => api.completeCurrentRoute().then(() => undefined),
        clearLocal: clearPersistedShift,
      });
      if (!completedSafely) return false;
    } catch (error) {
      setShiftError(error instanceof ApiError ? error.message : 'Không thể kết ca. Vui lòng thử lại.');
      return false;
    } finally {
      setFinishing(false);
    }
    setCompleted({});
    setInitialStopCount(route.data?.route.stops.length ?? 0);
    setShiftStarted(false);
    setScreen({ name: 'route' });
    return true;
  }

  let content: ReactNode;
  if (screen.name === 'outbox') {
    content = <OutboxQueueScreen onBack={() => setScreen({ name: 'route' })} />;
  } else if (screen.name === 'receipt-view' && lastReceipt) {
    content = <SavedStationReceiptView receipt={lastReceipt} onBack={() => setScreen({ name: 'route' })} />;
  } else if (screen.name === 'qr') {
     content = <CollectorQrScreen stop={screen.stop} onBack={() => setScreen({ name: 'route' })} onContinue={(container, containerCode) => setScreen({ name: 'entry', stop: screen.stop, container, containerCode })} />;
  } else if (screen.name === 'entry') {
    content = (
      <CollectorEntryScreen
        stop={screen.stop}
        container={screen.container}
        containerCode={screen.containerCode}
        onBack={() => setScreen({ name: 'qr', stop: screen.stop })}
        onSuccess={(liters, kilograms, clientUuid) => onCollectionSaved(screen.stop, liters, kilograms, clientUuid)}
      />
    );
  } else if (screen.name === 'summary') {
    content = <CollectorSummaryScreen route={route.data?.route} completed={routeProgress.completed} completedCount={routeProgress.completedOrderIds.length} totalStops={initialStopCount ?? route.data?.route.stops.length ?? 0} onBack={() => setScreen({ name: 'route' })} onOpenDelivery={() => setScreen({ name: 'station-delivery' })} />;
  } else if (screen.name === 'station-delivery') {
    content = <StationDeliveryFlow completed={routeProgress.completed} pendingDelivery={pendingDelivery} collectorId={collectorStorageId} routeId={route.data?.route.route_id ?? restoredRouteId} onPendingDelivery={(draft) => setPendingDelivery(draft)} onReceiptSaved={setLastReceipt} onBack={() => setScreen({ name: 'summary' })} onFinish={finishShift} />;
  } else if (route.isPending && !route.data) {
    content = <StatusView title="Đang tải tuyến hôm nay…" />;
  } else if (route.isError && !route.data) {
    content = <StatusView title="Chưa tải được tuyến" message="Chưa có dữ liệu tuyến trên máy. Kiểm tra kết nối rồi thử lại." action={{ label: 'Thử lại', onClick: () => { void route.refetch(); } }} />;
  } else if (route.data) {
    const activeStopIds = new Set(routeProgress.completedOrderIds);
    const skippedStopIds = new Set(routeProgress.skippedOrderIds);
    const activeStops = route.data.route.stops.filter((stop) => {
      if (skippedStopIds.has(stop.order_id) || stop.route_stop_status === 'COLLECTED') return false;
      const localRecord = findRowForStop(outboxRows, stop);
      return !activeStopIds.has(stop.order_id) || localRecord?.status === 'pending' || localRecord?.status === 'syncing' || localRecord?.status === 'failed';
    });
    content = (
      <CollectorRouteScreen
        stops={activeStops}
        route={route.data}
        location={location}
        locationDenied={locationDenied}
        completed={routeProgress.completed}
        totalStops={initialStopCount ?? route.data.route.stops.length}
        outboxRows={outboxRows}
        outboxStats={outboxStats}
        shiftStarted={shiftStarted}
        shiftError={shiftError}
        prefetching={prefetching}
        onStartShift={() => { void startShift(); }}
        onCancelShift={() => { void cancelShift(); }}
        onOpenQr={(stop) => setScreen({ name: 'qr', stop })}
        onOpenSummary={() => setScreen({ name: 'summary' })}
        onOpenOutbox={() => setScreen({ name: 'outbox' })}
        refreshing={refreshing}
        refreshNotice={refreshNotice}
        loadError={route.isError}
        completedOrderIds={routeProgress.completedOrderIds}
        onRefresh={() => { void refreshRoute(); }}
        lastReceipt={lastReceipt}
        onOpenLastReceipt={() => setScreen({ name: 'receipt-view' })}
      />
    );
  } else {
    content = <StatusView title="Chưa tải được tuyến" message="Chưa có dữ liệu tuyến trên máy. Kiểm tra kết nối rồi thử lại." />;
  }

  return (
    <div className="collector-flow-root">
      {!online ? (
        <CollectorNotice tone="warning" icon="wifi_off" title="Đang ngoại tuyến">
          Dữ liệu vẫn được lưu an toàn trên máy và sẽ tự gửi khi có mạng.
        </CollectorNotice>
      ) : null}
      {content}
    </div>
  );
}
