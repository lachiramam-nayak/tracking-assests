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

const deriveVisitorStatus = (tag, assignment) => {
  if (tag?.status === 'offline') return 'offline';
  if (assignment?.visit_status) return assignment.visit_status;
  return 'in_visit';
};

const normalizeVisitorAssignment = (item) => {
  return {
    device_id: item.macId || item.device_id || '',
    name: item.visitorName || item.name || '',
    visitor_id: item.visitorId || item.visitor_id || item.passId || item.pass_id || '',
    visiting_patient: item.visitingPatient || item.visiting_patient || '',
    allowed_zone: item.allowedZone || item.allowed_zone || item.ward || '',
    entry_time: item.entryTime || item.entry_time || '',
    visit_status: item.visitStatus || item.visit_status || 'in_visit',
    status: item.status || 'active',
    entity_type: item.entityType || item.entity_type || 'visitor',
  };
};

const isVisitorAssigned = (assignment) => {
  if (!assignment?.device_id) return false;
  if (assignment.entity_type && assignment.entity_type !== 'visitor') return false;
  return Boolean(
    assignment.name || assignment.visitor_id || assignment.visiting_patient || assignment.allowed_zone
  );
};

const VisitorMap = () => {
  const navigate = useNavigate();
  const [floorPlan, setFloorPlan] = useState(null);
  const [tags, setTags] = useState([]);
  const [visitorAssignments, setVisitorAssignments] = useState([]);
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

  const loadVisitorAssignments = useCallback(() => {
    try {
      const saved = localStorage.getItem('peopleTagAssignments');
      if (!saved) return [];
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed)
        ? parsed
            .filter((item) => item.status === 'active' || !item.status)
            .map(normalizeVisitorAssignment)
            .filter(isVisitorAssigned)
        : [];
    } catch (error) {
      console.error(error);
      return [];
    }
  }, []);

  const refreshAll = useCallback(async () => {
    try {
      const [plan, liveTags] = await Promise.all([loadFloorPlan(), loadTags()]);
      setFloorPlan(plan);
      setTags(Array.isArray(liveTags) ? liveTags : []);
      setVisitorAssignments(loadVisitorAssignments());
    } catch (error) {
      console.error(error);
      toast.error('Could not load Visitor Map');
    } finally {
      setLoading(false);
    }
  }, [loadFloorPlan, loadTags, loadVisitorAssignments]);

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

    const handleStorage = (event) => {
      if (event.key === 'peopleTagAssignments') {
        setVisitorAssignments(loadVisitorAssignments());
      }
    };

    window.addEventListener('storage', handleStorage);

    return () => {
      if (retryTimeout) clearTimeout(retryTimeout);
      if (ws) ws.close();
      window.removeEventListener('storage', handleStorage);
    };
  }, [loadVisitorAssignments]);

  const visitorEntities = useMemo(() => {
    return visitorAssignments
      .map((assignment) => {
        const tag = tags.find((item) => item.device_id === assignment.device_id);
        if (!tag) return null;

        const alertInfo = getAlertInfo(tag.event);
        const location = tag.location_name || assignment.allowed_zone || tag.position_ref || 'Unknown';

        return {
          id: assignment.device_id,
          device_id: assignment.device_id,
          title: assignment.name || assignment.visitor_id || assignment.device_id,
          subtitle: assignment.visitor_id
            ? `Pass ID: ${assignment.visitor_id}`
            : 'Visitor tag',
          type: assignment.allowed_zone || 'General',
          location,
          status: deriveVisitorStatus(tag, assignment),
          motion_state: tag.motion_state || 'unknown',
          battery: tag.battery ?? null,
          batteryPct: null,
          last_seen: tag.last_seen,
          x: tag.x ?? null,
          y: tag.y ?? null,
          event: tag.event || null,
          alertLabel: alertInfo.label,
          alertSeverity: alertInfo.severity,
          details: [
            { label: 'Visitor name', value: assignment.name || '—' },
            { label: 'Visitor / Pass ID', value: assignment.visitor_id || '—' },
            { label: 'Visiting patient', value: assignment.visiting_patient || '—' },
            { label: 'Allowed zone', value: assignment.allowed_zone || '—' },
            { label: 'Entry time', value: assignment.entry_time || '—' },
            { label: 'Visit status', value: assignment.visit_status || '—' },
            { label: 'Tag ID', value: assignment.device_id || '—' },
          ],
        };
      })
      .filter(Boolean);
  }, [visitorAssignments, tags]);

  const zoneOptions = useMemo(() => {
    return Array.from(new Set(visitorEntities.map((item) => item.type).filter(Boolean))).sort();
  }, [visitorEntities]);

  const statusOptions = [
    { value: 'in_visit', label: 'In visit' },
    { value: 'waiting', label: 'Waiting' },
    { value: 'exited', label: 'Exited' },
    { value: 'offline', label: 'Offline' },
  ];

  const openVisitorRecord = (entity) => {
    navigate(`/people?device_id=${encodeURIComponent(entity.device_id)}&type=visitor`);
  };

  const focusMapAction = (entity) => {
    toast.info(`Focused visitor: ${entity.title}`);
  };

  return (
    <TrackingMapLayout
      title="Visitor Map"
      subtitle="View only visitor-assigned tags on the live hospital map."
      floorPlan={floorPlan}
      anchors={floorPlan?.anchors || []}
      entities={visitorEntities}
      isLive={wsConnected}
      loading={loading}
      pageType="visitor"
      typeOptions={zoneOptions}
      statusOptions={statusOptions}
      onRefresh={refreshAll}
      onPrimaryAction={openVisitorRecord}
      primaryActionLabel="Open visitor record"
      onLocate={focusMapAction}
      searchPlaceholder="Search visitor name, pass ID, zone, location..."
      emptyStateTitle="No visitor tags found"
      emptyStateDescription="Assign tags to visitors in the People page to make them appear here."
    />
  );
};

export default VisitorMap;
