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

const derivePatientStatus = (tag, assignment) => {
  if (tag?.status === 'offline') return 'offline';
  if (assignment?.transport_status) return assignment.transport_status;
  return 'admitted';
};

const normalizePatientAssignment = (item) => {
  return {
    device_id: item.macId || item.device_id || '',
    name: item.patientName || item.name || '',
    patient_id: item.patientId || item.patient_id || item.mrn || '',
    ward: item.ward || '',
    bed: item.bed || item.bedNo || item.bed_number || '',
    doctor: item.doctor || item.treatingDoctor || item.primary_doctor || '',
    transport_status: item.transportStatus || item.transport_status || 'admitted',
    status: item.status || 'active',
  };
};

const isPatientAssigned = (assignment) => {
  if (!assignment?.device_id) return false;
  return Boolean(assignment.name || assignment.patient_id || assignment.ward || assignment.bed);
};

const PatientMap = () => {
  const navigate = useNavigate();
  const [floorPlan, setFloorPlan] = useState(null);
  const [tags, setTags] = useState([]);
  const [patientAssignments, setPatientAssignments] = useState([]);
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

  const loadPatientAssignments = useCallback(() => {
    try {
      const saved = localStorage.getItem('patientTagAssignments');
      if (!saved) return [];
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed)
        ? parsed
            .filter((item) => item.status === 'active' || !item.status)
            .map(normalizePatientAssignment)
            .filter(isPatientAssigned)
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
      setPatientAssignments(loadPatientAssignments());
    } catch (error) {
      console.error(error);
      toast.error('Could not load Patient Map');
    } finally {
      setLoading(false);
    }
  }, [loadFloorPlan, loadTags, loadPatientAssignments]);

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
      if (event.key === 'patientTagAssignments') {
        setPatientAssignments(loadPatientAssignments());
      }
    };

    window.addEventListener('storage', handleStorage);

    return () => {
      if (retryTimeout) clearTimeout(retryTimeout);
      if (ws) ws.close();
      window.removeEventListener('storage', handleStorage);
    };
  }, [loadPatientAssignments]);

  const patientEntities = useMemo(() => {
    return patientAssignments
      .map((assignment) => {
        const tag = tags.find((item) => item.device_id === assignment.device_id);
        if (!tag) return null;

        const alertInfo = getAlertInfo(tag.event);
        const location = tag.location_name || assignment.ward || tag.position_ref || 'Unknown';

        return {
          id: assignment.device_id,
          device_id: assignment.device_id,
          title: assignment.name || assignment.patient_id || assignment.device_id,
          subtitle: assignment.patient_id ? `Patient ID: ${assignment.patient_id}` : 'Patient tag',
          type: assignment.ward || 'General',
          location,
          status: derivePatientStatus(tag, assignment),
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
            { label: 'Patient name', value: assignment.name || '—' },
            { label: 'Patient ID', value: assignment.patient_id || '—' },
            { label: 'Ward', value: assignment.ward || '—' },
            { label: 'Bed', value: assignment.bed || '—' },
            { label: 'Doctor', value: assignment.doctor || '—' },
            { label: 'Transport status', value: assignment.transport_status || '—' },
            { label: 'Tag ID', value: assignment.device_id || '—' },
          ],
        };
      })
      .filter(Boolean);
  }, [patientAssignments, tags]);

  const wardOptions = useMemo(() => {
    return Array.from(new Set(patientEntities.map((item) => item.type).filter(Boolean))).sort();
  }, [patientEntities]);

  const statusOptions = [
    { value: 'admitted', label: 'Admitted' },
    { value: 'transported', label: 'Transported' },
    { value: 'in_progress', label: 'In progress' },
    { value: 'recovery', label: 'Recovery' },
    { value: 'offline', label: 'Offline' },
  ];

  const openPatientRecord = (entity) => {
    navigate(`/patient-tags?device_id=${encodeURIComponent(entity.device_id)}`);
  };

  const focusMapAction = (entity) => {
    toast.info(`Focused patient: ${entity.title}`);
  };

  return (
    <TrackingMapLayout
      title="Patient Map"
      subtitle="View only patient-assigned tags on the live hospital map."
      floorPlan={floorPlan}
      anchors={floorPlan?.anchors || []}
      entities={patientEntities}
      isLive={wsConnected}
      loading={loading}
      pageType="patient"
      typeOptions={wardOptions}
      statusOptions={statusOptions}
      onRefresh={refreshAll}
      onPrimaryAction={openPatientRecord}
      primaryActionLabel="Open patient record"
      onLocate={focusMapAction}
      searchPlaceholder="Search patient name, ID, ward, location..."
      emptyStateTitle="No patient tags found"
      emptyStateDescription="Assign tags to patients in the People page to make them appear here."
    />
  );
};

export default PatientMap;
