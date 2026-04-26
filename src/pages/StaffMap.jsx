import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import TrackingMapLayout from '../components/TrackingMapLayout';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'https://assest-backend-z6uq.onrender.com';
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

const deriveStaffStatus = (tag, assignment) => {
  if (tag?.status === 'offline') return 'offline';
  if (assignment?.shift_status) return assignment.shift_status;
  return 'on_duty';
};

const normalizeStaffAssignment = (item) => {
  return {
    device_id: item.macId || item.device_id || '',
    name: item.staffName || item.name || '',
    staff_id: item.staffId || item.staff_id || item.employeeId || item.employee_id || '',
    role: item.role || item.staffRole || '',
    department: item.department || '',
    shift: item.shift || '',
    shift_status: item.shiftStatus || item.shift_status || 'on_duty',
    status: item.status || 'active',
    entity_type: item.entityType || item.entity_type || 'staff',
  };
};

const isStaffAssigned = (assignment) => {
  if (!assignment?.device_id) return false;
  if (assignment.entity_type && assignment.entity_type !== 'staff') return false;
  return Boolean(assignment.name || assignment.staff_id || assignment.role || assignment.department);
};

const StaffMap = () => {
  const navigate = useNavigate();
  const [floorPlan, setFloorPlan] = useState(null);
  const [tags, setTags] = useState([]);
  const [staffAssignments, setStaffAssignments] = useState([]);
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

  const loadStaffAssignments = useCallback(() => {
    try {
      const saved = localStorage.getItem('peopleTagAssignments');
      if (!saved) return [];
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed)
        ? parsed
            .filter((item) => item.status === 'active' || !item.status)
            .map(normalizeStaffAssignment)
            .filter(isStaffAssigned)
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
      setStaffAssignments(loadStaffAssignments());
    } catch (error) {
      console.error(error);
      toast.error('Could not load Staff Map');
    } finally {
      setLoading(false);
    }
  }, [loadFloorPlan, loadTags, loadStaffAssignments]);

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
        setStaffAssignments(loadStaffAssignments());
      }
    };

    window.addEventListener('storage', handleStorage);

    return () => {
      if (retryTimeout) clearTimeout(retryTimeout);
      if (ws) ws.close();
      window.removeEventListener('storage', handleStorage);
    };
  }, [loadStaffAssignments]);

  const staffEntities = useMemo(() => {
    return staffAssignments
      .map((assignment) => {
        const tag = tags.find((item) => item.device_id === assignment.device_id);
        if (!tag) return null;

        const alertInfo = getAlertInfo(tag.event);
        const location = tag.location_name || assignment.department || tag.position_ref || 'Unknown';

        return {
          id: assignment.device_id,
          device_id: assignment.device_id,
          title: assignment.name || assignment.staff_id || assignment.device_id,
          subtitle: assignment.role
            ? `${assignment.role}${assignment.staff_id ? ` • ${assignment.staff_id}` : ''}`
            : assignment.staff_id || 'Staff tag',
          type: assignment.department || 'General',
          location,
          status: deriveStaffStatus(tag, assignment),
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
            { label: 'Staff name', value: assignment.name || '—' },
            { label: 'Staff ID', value: assignment.staff_id || '—' },
            { label: 'Role', value: assignment.role || '—' },
            { label: 'Department', value: assignment.department || '—' },
            { label: 'Shift', value: assignment.shift || '—' },
            { label: 'Shift status', value: assignment.shift_status || '—' },
            { label: 'Tag ID', value: assignment.device_id || '—' },
          ],
        };
      })
      .filter(Boolean);
  }, [staffAssignments, tags]);

  const departmentOptions = useMemo(() => {
    return Array.from(new Set(staffEntities.map((item) => item.type).filter(Boolean))).sort();
  }, [staffEntities]);

  const statusOptions = [
    { value: 'on_duty', label: 'On duty' },
    { value: 'busy', label: 'Busy' },
    { value: 'break', label: 'Break' },
    { value: 'offline', label: 'Offline' },
  ];

  const openStaffRecord = (entity) => {
    navigate(`/people?device_id=${encodeURIComponent(entity.device_id)}&type=staff`);
  };

  const focusMapAction = (entity) => {
    toast.info(`Focused staff: ${entity.title}`);
  };

  return (
    <TrackingMapLayout
      title="Staff Map"
      subtitle="View only staff-assigned tags on the live hospital map."
      floorPlan={floorPlan}
      anchors={floorPlan?.anchors || []}
      entities={staffEntities}
      isLive={wsConnected}
      loading={loading}
      pageType="staff"
      typeOptions={departmentOptions}
      statusOptions={statusOptions}
      onRefresh={refreshAll}
      onPrimaryAction={openStaffRecord}
      primaryActionLabel="Open staff record"
      onLocate={focusMapAction}
      searchPlaceholder="Search staff name, ID, role, department..."
      emptyStateTitle="No staff tags found"
      emptyStateDescription="Assign tags to staff in the People page to make them appear here."
    />
  );
};

export default StaffMap;
