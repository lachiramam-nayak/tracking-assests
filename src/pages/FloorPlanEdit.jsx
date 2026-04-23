import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import {
  Upload,
  Plus,
  Trash2,
  MapPin,
  Pencil,
  Save,
  X,
  RefreshCcw,
  LocateFixed,
  ScanLine,
} from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';
const API = `${BACKEND_URL}/api`;

const EMPTY_FORM = {
  id: '',
  device_id: '',
  name: '',
  x: 0,
  y: 0,
  status: 'offline',
};

const FloorPlanEdit = () => {
  const [floorPlan, setFloorPlan] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [placingMode, setPlacingMode] = useState(false);
  const [savingAnchor, setSavingAnchor] = useState(false);
  const [selectedAnchorId, setSelectedAnchorId] = useState('');
  const [form, setForm] = useState(EMPTY_FORM);
  const [clickPosition, setClickPosition] = useState(null);

  const fileInputRef = useRef(null);
  const svgRef = useRef(null);

  useEffect(() => {
    loadFloorPlan();
  }, []);

  const loadFloorPlan = async () => {
    try {
      const response = await fetch(`${API}/floor-plan`);
      const data = await response.json();
      setFloorPlan(data);
    } catch (error) {
      console.error('Error loading floor plan:', error);
      toast.error('Could not load floor setup');
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(`${API}/floor-plan/image`, {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        toast.success('Floor plan uploaded successfully');
        await loadFloorPlan();
      } else {
        toast.error('Failed to upload floor plan');
      }
    } catch (error) {
      console.error(error);
      toast.error('Error uploading floor plan');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const anchors = floorPlan?.anchors || [];

  const selectedAnchor = useMemo(
    () => anchors.find((anchor) => anchor.id === selectedAnchorId) || null,
    [anchors, selectedAnchorId]
  );

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setClickPosition(null);
    setSelectedAnchorId('');
  };

  const startPlacingMode = () => {
    setPlacingMode(true);
    resetForm();
  };

  const exitPlacingMode = () => {
    setPlacingMode(false);
    resetForm();
  };

  const handleSvgClick = (e) => {
    if (!placingMode || !floorPlan) return;

    const svg = svgRef.current;
    if (!svg) return;

    const rect = svg.getBoundingClientRect();
    const svgX = e.clientX - rect.left;
    const svgY = e.clientY - rect.top;

    const viewBox = svg.viewBox.baseVal;
    const scaleX = viewBox.width / rect.width;
    const scaleY = viewBox.height / rect.height;

    const x = Math.max(0, Math.round(svgX * scaleX));
    const y = Math.max(0, Math.round(svgY * scaleY));

    setClickPosition({ x, y });
    setForm((prev) => ({
      ...prev,
      id: prev.id || `anchor-${Date.now()}`,
      x,
      y,
    }));
  };

  const handleSelectAnchor = (anchor) => {
    setSelectedAnchorId(anchor.id);
    setPlacingMode(false);
    setClickPosition(null);
    setForm({
      id: anchor.id,
      device_id: anchor.device_id || '',
      name: anchor.name || '',
      x: anchor.x || 0,
      y: anchor.y || 0,
      status: anchor.status || 'offline',
    });
  };

  const handleSaveAnchor = async () => {
    if (!form.device_id || !form.name) {
      toast.error('Please enter anchor MAC/device ID and anchor name');
      return;
    }

    if (!form.x && form.x !== 0) {
      toast.error('Please place the anchor on the floor plan');
      return;
    }

    setSavingAnchor(true);
    try {
      const response = await fetch(`${API}/floor-plan/anchors`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      if (response.ok) {
        toast.success(selectedAnchorId ? 'Anchor updated' : 'Anchor added');
        await loadFloorPlan();
        setSelectedAnchorId(form.id);
        setPlacingMode(false);
      } else {
        toast.error('Failed to save anchor');
      }
    } catch (error) {
      console.error(error);
      toast.error('Error saving anchor');
    } finally {
      setSavingAnchor(false);
    }
  };

  const handleDeleteAnchor = async (anchorId) => {
    try {
      const response = await fetch(`${API}/floor-plan/anchors/${anchorId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Anchor deleted');
        await loadFloorPlan();
        if (selectedAnchorId === anchorId) {
          resetForm();
        }
      } else {
        toast.error('Failed to delete anchor');
      }
    } catch (error) {
      console.error(error);
      toast.error('Error deleting anchor');
    }
  };

  const renderFloorPlan = () => {
    if (!floorPlan) return null;

    const width = floorPlan.width || 800;
    const height = floorPlan.height || 600;
    const containerWidth = 1100;
    const aspectRatio = width / height;
    const containerHeight = containerWidth / aspectRatio;

    return (
      <div className="w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <div>
            <h3 className="text-base font-semibold text-slate-900">Floor map workspace</h3>
            <p className="mt-1 text-sm text-slate-500">
              {placingMode
                ? 'Click on the map to place a new anchor.'
                : 'Select an existing anchor or enter placement mode to add a new one.'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {placingMode ? (
              <Button variant="outline" onClick={exitPlacingMode}>
                Exit placement
              </Button>
            ) : (
              <Button onClick={startPlacingMode} className="gap-2">
                <Plus className="h-4 w-4" />
                Add anchor
              </Button>
            )}
          </div>
        </div>

        <div className="p-4">
          <div className="flex justify-center">
            <svg
              ref={svgRef}
              width={containerWidth}
              height={containerHeight}
              viewBox={`0 0 ${width} ${height}`}
              preserveAspectRatio="xMidYMid meet"
              className="max-w-full rounded-xl border border-slate-300 bg-slate-50"
              onClick={handleSvgClick}
              style={{ cursor: placingMode ? 'crosshair' : 'default' }}
            >
              <defs>
                <pattern id="grid-edit" width="50" height="50" patternUnits="userSpaceOnUse">
                  <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#E2E8F0" strokeWidth="1" />
                </pattern>
              </defs>

              <rect width={width} height={height} fill="url(#grid-edit)" />

              {floorPlan.image && (
                <image
                  href={floorPlan.image}
                  width={width}
                  height={height}
                  preserveAspectRatio="xMidYMid meet"
                  opacity="0.86"
                />
              )}

              {anchors.map((anchor) => {
                const isSelected = anchor.id === selectedAnchorId;
                return (
                  <g key={anchor.id} onClick={(e) => { e.stopPropagation(); handleSelectAnchor(anchor); }}>
                    <circle
                      cx={anchor.x}
                      cy={anchor.y}
                      r={isSelected ? 16 : 13}
                      fill={isSelected ? '#2563EB' : '#10B981'}
                      stroke="#fff"
                      strokeWidth="3"
                    />
                    <circle
                      cx={anchor.x}
                      cy={anchor.y}
                      r={isSelected ? 24 : 0}
                      fill="none"
                      stroke={isSelected ? '#93C5FD' : 'none'}
                      strokeWidth="3"
                      opacity="0.9"
                    />
                    <text
                      x={anchor.x + 18}
                      y={anchor.y - 2}
                      fontSize="14"
                      fill="#0F172A"
                      fontWeight="700"
                      fontFamily="Inter, system-ui, sans-serif"
                    >
                      {anchor.name}
                    </text>
                    <text
                      x={anchor.x + 18}
                      y={anchor.y + 15}
                      fontSize="11"
                      fill="#64748B"
                      fontFamily="Inter, system-ui, sans-serif"
                    >
                      {anchor.device_id}
                    </text>
                  </g>
                );
              })}

              {placingMode && clickPosition && (
                <g>
                  <circle
                    cx={clickPosition.x}
                    cy={clickPosition.y}
                    r="15"
                    fill="#EF4444"
                    stroke="#fff"
                    strokeWidth="3"
                    opacity="0.9"
                  >
                    <animate attributeName="r" values="12;18;12" dur="1s" repeatCount="indefinite" />
                  </circle>
                  <text
                    x={clickPosition.x + 18}
                    y={clickPosition.y + 6}
                    fontSize="13"
                    fill="#DC2626"
                    fontWeight="700"
                    fontFamily="Inter, system-ui, sans-serif"
                  >
                    New anchor
                  </text>
                </g>
              )}
            </svg>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Floor Setup</h1>
          <p className="mt-1 text-sm text-slate-600">
            Upload floor plans, place anchors, and define anchor names that will be shown everywhere as location labels.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
          />

          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="gap-2"
          >
            <Upload className="h-4 w-4" />
            {uploading ? 'Uploading...' : 'Upload floor image'}
          </Button>

          <Button variant="outline" onClick={loadFloorPlan} className="gap-2">
            <RefreshCcw className="h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-4">
        <Card className="border border-slate-200 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Anchors placed</p>
                <p className="mt-1 text-2xl font-semibold text-slate-900">{anchors.length}</p>
              </div>
              <MapPin className="h-5 w-5 text-slate-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-slate-200 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Named anchors</p>
                <p className="mt-1 text-2xl font-semibold text-slate-900">
                  {anchors.filter((a) => a.name).length}
                </p>
              </div>
              <Pencil className="h-5 w-5 text-slate-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-slate-200 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Map loaded</p>
                <p className="mt-1 text-2xl font-semibold text-slate-900">{floorPlan?.image ? 'Yes' : 'No'}</p>
              </div>
              <ScanLine className="h-5 w-5 text-slate-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-slate-200 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Placement mode</p>
                <p className="mt-1 text-2xl font-semibold text-slate-900">{placingMode ? 'On' : 'Off'}</p>
              </div>
              <LocateFixed className="h-5 w-5 text-slate-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <div className="xl:col-span-8">{renderFloorPlan()}</div>

        <div className="space-y-6 xl:col-span-4">
          <Card className="border border-slate-200 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">
                {selectedAnchor ? 'Edit anchor' : placingMode ? 'Add anchor' : 'Anchor details'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!selectedAnchor && !placingMode ? (
                <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
                  Select an anchor from the map or click <span className="font-medium">Add anchor</span>.
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-1.5">
                      <Label>Anchor MAC / device ID</Label>
                      <Input
                        placeholder="e.g. 8C:1F:64:AA:12:BC"
                        value={form.device_id}
                        onChange={(e) => setForm((prev) => ({ ...prev, device_id: e.target.value }))}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label>Anchor name</Label>
                      <Input
                        placeholder="e.g. ICU Nurse Station"
                        value={form.name}
                        onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label>X coordinate</Label>
                        <Input
                          type="number"
                          value={form.x}
                          onChange={(e) => setForm((prev) => ({ ...prev, x: Number(e.target.value || 0) }))}
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label>Y coordinate</Label>
                        <Input
                          type="number"
                          value={form.y}
                          onChange={(e) => setForm((prev) => ({ ...prev, y: Number(e.target.value || 0) }))}
                        />
                      </div>
                    </div>
                  </div>

                  {placingMode && clickPosition ? (
                    <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm text-slate-700">
                      Selected placement: <span className="font-mono font-medium">{Math.round(clickPosition.x)}, {Math.round(clickPosition.y)}</span>
                    </div>
                  ) : null}

                  <div className="flex flex-wrap items-center gap-2">
                    <Button onClick={handleSaveAnchor} disabled={savingAnchor} className="gap-2">
                      <Save className="h-4 w-4" />
                      {savingAnchor ? 'Saving...' : selectedAnchor ? 'Update anchor' : 'Save anchor'}
                    </Button>

                    <Button variant="outline" onClick={resetForm} className="gap-2">
                      <X className="h-4 w-4" />
                      Clear
                    </Button>

                    {selectedAnchor ? (
                      <Button
                        variant="destructive"
                        onClick={() => handleDeleteAnchor(selectedAnchor.id)}
                        className="gap-2"
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </Button>
                    ) : null}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="border border-slate-200 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Anchor list</CardTitle>
            </CardHeader>
            <CardContent>
              {anchors.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
                  No anchors added yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {anchors.map((anchor) => {
                    const active = anchor.id === selectedAnchorId;
                    return (
                      <button
                        key={anchor.id}
                        type="button"
                        onClick={() => handleSelectAnchor(anchor)}
                        className={`w-full rounded-xl border p-4 text-left transition ${
                          active
                            ? 'border-blue-300 bg-blue-50'
                            : 'border-slate-200 bg-white hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="truncate font-medium text-slate-900">{anchor.name || 'Unnamed anchor'}</div>
                            <div className="mt-1 truncate text-xs font-mono text-slate-500">{anchor.device_id}</div>
                            <div className="mt-2 text-xs text-slate-500">
                              Position: {Math.round(anchor.x)}, {Math.round(anchor.y)}
                            </div>
                          </div>

                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteAnchor(anchor.id);
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-rose-600" />
                          </Button>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default FloorPlanEdit;