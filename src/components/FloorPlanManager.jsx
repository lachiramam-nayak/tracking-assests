import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Upload, Plus, Trash2, Save } from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';
const API = `${BACKEND_URL}/api`;

const FloorPlanManager = ({ floorPlan, onFloorPlanUpdate }) => {
  const [uploading, setUploading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [newAnchor, setNewAnchor] = useState({ device_id: '', name: '', x: 0, y: 0 });
  const [clickPosition, setClickPosition] = useState(null);
  const fileInputRef = useRef(null);
  const canvasRef = useRef(null);

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
        onFloorPlanUpdate();
      } else {
        toast.error('Failed to upload floor plan');
      }
    } catch (error) {
      console.error('Error uploading floor plan:', error);
      toast.error('Error uploading floor plan');
    } finally {
      setUploading(false);
    }
  };

  const handleCanvasClick = (e) => {
    if (!editMode) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * (floorPlan?.width || 800);
    const y = ((e.clientY - rect.top) / rect.height) * (floorPlan?.height || 600);

    setClickPosition({ x, y });
    setNewAnchor(prev => ({ ...prev, x, y }));
  };

  const handleAddAnchor = async () => {
    if (!newAnchor.device_id || !newAnchor.name) {
      toast.error('Please enter device ID and name');
      return;
    }

    try {
      const response = await fetch(`${API}/floor-plan/anchors`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: `anchor-${Date.now()}`,
          device_id: newAnchor.device_id,
          name: newAnchor.name,
          x: newAnchor.x,
          y: newAnchor.y,
          status: 'offline'
        }),
      });

      if (response.ok) {
        toast.success('Anchor added successfully');
        setNewAnchor({ device_id: '', name: '', x: 0, y: 0 });
        setClickPosition(null);
        onFloorPlanUpdate();
      } else {
        toast.error('Failed to add anchor');
      }
    } catch (error) {
      console.error('Error adding anchor:', error);
      toast.error('Error adding anchor');
    }
  };

  const handleDeleteAnchor = async (anchorId) => {
    try {
      const response = await fetch(`${API}/floor-plan/anchors/${anchorId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Anchor deleted');
        onFloorPlanUpdate();
      } else {
        toast.error('Failed to delete anchor');
      }
    } catch (error) {
      console.error('Error deleting anchor:', error);
      toast.error('Error deleting anchor');
    }
  };

  const drawFloorPlan = () => {
    if (!floorPlan) return null;

    const width = 800;
    const height = 600;

    return (
      <svg 
        ref={canvasRef}
        width="100%" 
        height="600" 
        viewBox={`0 0 ${width} ${height}`} 
        className="border border-gray-300 rounded-lg bg-slate-50 cursor-crosshair"
        onClick={handleCanvasClick}
      >
        {/* Grid */}
        <defs>
          <pattern id="grid-edit" width="50" height="50" patternUnits="userSpaceOnUse">
            <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#E2E8F0" strokeWidth="1"/>
          </pattern>
        </defs>
        <rect width={width} height={height} fill="url(#grid-edit)" />

        {/* Floor plan image */}
        {floorPlan.image && (
          <image href={floorPlan.image} width={width} height={height} opacity="0.7" />
        )}

        {/* Existing anchors */}
        {floorPlan.anchors?.map((anchor, idx) => {
          const x = (anchor.x / floorPlan.width) * width;
          const y = (anchor.y / floorPlan.height) * height;
          return (
            <g key={idx}>
              <circle cx={x} cy={y} r="10" fill="#10B981" stroke="#fff" strokeWidth="2" />
              <text x={x + 15} y={y + 5} fontSize="12" fill="#1E293B" fontWeight="bold">
                {anchor.name}
              </text>
            </g>
          );
        })}

        {/* New anchor preview */}
        {clickPosition && editMode && (
          <g>
            <circle 
              cx={(clickPosition.x / floorPlan.width) * width} 
              cy={(clickPosition.y / floorPlan.height) * height} 
              r="10" 
              fill="#EF4444" 
              stroke="#fff" 
              strokeWidth="2"
              opacity="0.7"
            />
            <text 
              x={(clickPosition.x / floorPlan.width) * width + 15} 
              y={(clickPosition.y / floorPlan.height) * height + 5} 
              fontSize="12" 
              fill="#EF4444" 
              fontWeight="bold"
            >
              New
            </text>
          </g>
        )}
      </svg>
    );
  };

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <Card className="bg-white border-gray-200" data-testid="floor-plan-upload-card">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-gray-900">Upload Floor Plan</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
              data-testid="floor-plan-file-input"
            />
            <Button
              data-testid="upload-floor-plan-button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Upload className="w-4 h-4 mr-2" />
              {uploading ? 'Uploading...' : 'Upload Image'}
            </Button>
            <p className="text-sm text-gray-600">
              Upload a floor plan image (PNG, JPG, etc.)
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Anchor Management */}
      <Card className="bg-white border-gray-200" data-testid="anchor-management-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl font-semibold text-gray-900">Manage Anchors</CardTitle>
            <Button
              data-testid="toggle-edit-mode-button"
              onClick={() => {
                setEditMode(!editMode);
                setClickPosition(null);
              }}
              variant={editMode ? 'default' : 'outline'}
              className={editMode ? 'bg-blue-600 text-white' : ''}
            >
              {editMode ? 'Exit Edit Mode' : 'Enter Edit Mode'}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Floor plan visualization */}
          <div>
            {drawFloorPlan()}
          </div>

          {/* Add anchor form */}
          {editMode && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-4">
              <h3 className="font-semibold text-gray-900">Add New Anchor</h3>
              <p className="text-sm text-gray-600">Click on the floor plan to set anchor position</p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="device-id">Device ID</Label>
                  <Input
                    id="device-id"
                    data-testid="anchor-device-id-input"
                    placeholder="e.g., ANCH-001"
                    value={newAnchor.device_id}
                    onChange={(e) => setNewAnchor(prev => ({ ...prev, device_id: e.target.value }))}
                    className="mt-1"
                  />
                </div>
                
                <div>
                  <Label htmlFor="anchor-name">Anchor Name</Label>
                  <Input
                    id="anchor-name"
                    data-testid="anchor-name-input"
                    placeholder="e.g., North Entrance"
                    value={newAnchor.name}
                    onChange={(e) => setNewAnchor(prev => ({ ...prev, name: e.target.value }))}
                    className="mt-1"
                  />
                </div>
                
                <div className="flex items-end">
                  <Button
                    data-testid="add-anchor-button"
                    onClick={handleAddAnchor}
                    disabled={!clickPosition || !newAnchor.device_id || !newAnchor.name}
                    className="w-full bg-green-600 hover:bg-green-700 text-white"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Anchor
                  </Button>
                </div>
              </div>

              {clickPosition && (
                <p className="text-sm text-gray-600">
                  Selected position: X: {Math.round(newAnchor.x)}, Y: {Math.round(newAnchor.y)}
                </p>
              )}
            </div>
          )}

          {/* Anchor list */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-3">Existing Anchors</h3>
            {floorPlan?.anchors && floorPlan.anchors.length > 0 ? (
              <div className="space-y-2">
                {floorPlan.anchors.map((anchor) => (
                  <div
                    key={anchor.id}
                    data-testid={`anchor-item-${anchor.id}`}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
                  >
                    <div>
                      <p className="font-medium text-gray-900">{anchor.name}</p>
                      <p className="text-sm text-gray-600">Device: {anchor.device_id}</p>
                      <p className="text-xs text-gray-500">Position: ({Math.round(anchor.x)}, {Math.round(anchor.y)})</p>
                    </div>
                    <Button
                      data-testid={`delete-anchor-${anchor.id}`}
                      onClick={() => handleDeleteAnchor(anchor.id)}
                      variant="destructive"
                      size="sm"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No anchors added yet</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default FloorPlanManager;