import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import TrackingMapLayout from '../components/TrackingMapLayout';

<<<<<<< HEAD
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'https://assest-backend-z6uq.onrender.com';
=======
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';
>>>>>>> 19e96b05e597b137c0b0c12445804d6a9c9bf51f
const API = `${BACKEND_URL}/api`;
const WS_URL = BACKEND_URL.replace(/^http/, 'ws');

const getBatteryPercent = (battery) => {
  if (battery === null || battery === undefined || Number.isNaN(Number(battery))) return null;
  const voltage = Number(battery);
  if (voltage <= 100) return Math.max(0, Math.min(100, Math.round(voltage)));
  const minMv = 2400;
  const maxMv = 3000;
  const percent = ((voltage - minMv) / (maxMv - minMv)) * 100;
  return Math.max(0, Math.min(100, Math.round(percent)));
};

const getAlertInfo = (event) => {
  if (!event) return { label: null, severity: null };
  const map = {
    free_fall: { label: 'Free fall', severity: 'critical' },
    long_press: { label: 'Emergency button', severity: 'critical' },
    btn_1click: { label: 'Button pressed once', severity: 'warning' },
    btn_2click: { label: 'Button pressed twice', severity: 'warning' },
  };
  return map[event] || { label: event, severity: 'warning' };
};

const deriveStatus = (tag, metadata) => {
  if (tag?.status === 'offline') return 'offline';
  if (metadata?.maintenance_status === 'overdue') return 'maintenance_alert';
  if (tag?.motion_state === 'moving') return 'moving';
  return 'available';
};

const isAssetAssigned = (metadata) => {
  if (!metadata) return false;
  return Boolean(
    metadata.asset_name ||
      metadata.asset_type ||
      metadata.asset_id ||
      metadata.department ||
      metadata.ward
  );
};

const AssetMap = () => {
  const navigate = useNavigate();
  const [floorPlan, setFloorPlan] = useState(null);
  const [tags, setTags] = useState([]);
  const [metadataMap, setMetadataMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [wsConnected, setWsConnected] = useState(false);

  const loadFloorPlan = useCallback(async () => {
    const response = await fetch(`${API}/floor-plan`);
    if (!response.ok) throw new Error('Failed to load floor plan');
    return response.json();
  }, []);

  const loadTags = useCallback(async () => {
    const response = await fetch(`${API}/tags/status`);
    if (!response.ok) throw new Error('Failed to load tags');
    return response.json();
  }, []);

  const loadAssetMetadata = useCallback(async () => {
    const response = await fetch(`${API}/assets/metadata`);
    if (!response.ok) throw new Error('Failed to load asset metadata');
    return response.json();
  }, []);

  const refreshAll = useCallback(async () => {
    try {
      const [plan, liveTags, metadata] = await Promise.all([
        loadFloorPlan(),
        loadTags(),
        loadAssetMetadata(),
      ]);

      setFloorPlan(plan);
      setTags(Array.isArray(liveTags) ? liveTags : []);
      setMetadataMap(metadata || {});
    } catch (error) {
      console.error(error);
      toast.error('Could not load Asset Map');
    } finally {
      setLoading(false);
    }
  }, [loadFloorPlan, loadTags, loadAssetMetadata]);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  useEffect(() => {
    let ws;
    let retryTimeout;

    const connect = () => {
      ws = new WebSocket(`${WS_URL}/api/ws/rtls`);

      ws.onopen = () => setWsConnected(true);

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          if (message.type === 'tag_update' && Array.isArray(message.data)) {
            setTags((prev) => {
              if (message.data.length === 0 && prev.length > 0) return prev;
              return message.data;
            });
          }
        } catch (error) {
          console.error('Invalid WS payload', error);
        }
      };

      ws.onerror = () => setWsConnected(false);

      ws.onclose = () => {
        setWsConnected(false);
        retryTimeout = setTimeout(connect, 3000);
      };
    };

    connect();

    return () => {
      if (retryTimeout) clearTimeout(retryTimeout);
      if (ws) ws.close();
    };
  }, []);

  const assetEntities = useMemo(() => {
    return tags
      .map((tag) => {
        const metadata = metadataMap[tag.device_id];
        if (!isAssetAssigned(metadata)) return null;

        const alertInfo = getAlertInfo(tag.event);
        const batteryPct = getBatteryPercent(tag.battery);
        const location = tag.location_name || metadata?.ward || tag.position_ref || 'Unknown';

        return {
          id: tag.device_id,
          device_id: tag.device_id,
          title: metadata?.asset_name || metadata?.asset_id || tag.device_id,
          subtitle: metadata?.asset_type || 'Asset tag',
          type: metadata?.asset_type || 'Unassigned',
          location,
          status: deriveStatus(tag, metadata),
          motion_state: tag.motion_state || 'unknown',
          battery: tag.battery ?? null,
          batteryPct,
          last_seen: tag.last_seen,
          x: tag.x ?? null,
          y: tag.y ?? null,
          event: tag.event || null,
          alertLabel: alertInfo.label,
          alertSeverity: alertInfo.severity,
          details: [
            { label: 'Asset name', value: metadata?.asset_name || '—' },
            { label: 'Asset type', value: metadata?.asset_type || '—' },
            { label: 'Asset ID', value: metadata?.asset_id || '—' },
            { label: 'Department', value: metadata?.department || '—' },
            { label: 'Ward', value: metadata?.ward || '—' },
            { label: 'Tag ID', value: tag.device_id || '—' },
          ],
        };
      })
      .filter(Boolean);
  }, [tags, metadataMap]);

  const assetTypeOptions = useMemo(() => {
    return Array.from(new Set(assetEntities.map((item) => item.type).filter(Boolean))).sort();
  }, [assetEntities]);

  const statusOptions = [
    { value: 'available', label: 'Available' },
    { value: 'moving', label: 'Moving' },
    { value: 'offline', label: 'Offline' },
    { value: 'maintenance_alert', label: 'Maintenance alert' },
  ];

  const openAssetRecord = (entity) => {
    navigate(`/assets?device_id=${encodeURIComponent(entity.device_id)}`);
  };

  const focusMapAction = (entity) => {
    toast.info(`Focused asset: ${entity.title}`);
  };

  return (
    <TrackingMapLayout
      title="Asset Map"
      subtitle="View only asset-assigned tags on the live hospital map."
      floorPlan={floorPlan}
      anchors={floorPlan?.anchors || []}
      entities={assetEntities}
      isLive={wsConnected}
      loading={loading}
      pageType="asset"
      typeOptions={assetTypeOptions}
      statusOptions={statusOptions}
      onRefresh={refreshAll}
      onPrimaryAction={openAssetRecord}
      primaryActionLabel="Open asset record"
      onLocate={focusMapAction}
      searchPlaceholder="Search asset name, ID, type, location..."
      emptyStateTitle="No asset tags found"
      emptyStateDescription="Assign tags in the Assets page to make them appear here."
    />
  );
};

export default AssetMap;
