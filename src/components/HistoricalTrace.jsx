import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Slider } from './ui/slider';
import { Clock, Play, Pause, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';
const API = `${BACKEND_URL}/api`;

const HistoricalTrace = ({ selectedTag }) => {
  const [tags, setTags] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState(selectedTag?.device_id || '');
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hours, setHours] = useState(8);
  const [playing, setPlaying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [floorPlan, setFloorPlan] = useState(null);

  // Load tags and floor plan
  useEffect(() => {
    const loadData = async () => {
      try {
        const [tagsRes, floorRes] = await Promise.all([
          fetch(`${API}/tags/status`),
          fetch(`${API}/floor-plan`)
        ]);
        const tagsData = await tagsRes.json();
        const floorData = await floorRes.json();
        setTags(tagsData);
        setFloorPlan(floorData);
      } catch (error) {
        console.error('Error loading data:', error);
      }
    };
    loadData();
  }, []);

  // Update selected device when prop changes
  useEffect(() => {
    if (selectedTag?.device_id) {
      setSelectedDeviceId(selectedTag.device_id);
      loadHistory(selectedTag.device_id, hours);
    }
  }, [selectedTag]);

  const loadHistory = async (deviceId, hrs) => {
    if (!deviceId) return;
    
    setLoading(true);
    try {
      const response = await fetch(`${API}/tags/${deviceId}/history?hours=${hrs}`);
      const data = await response.json();
      setHistory(data);
      setCurrentIndex(0);
      toast.success(`Loaded ${data.length} location points`);
    } catch (error) {
      console.error('Error loading history:', error);
      toast.error('Failed to load history');
    } finally {
      setLoading(false);
    }
  };

  const handleLoadHistory = () => {
    if (selectedDeviceId) {
      loadHistory(selectedDeviceId, hours);
    }
  };

  // Playback controls
  useEffect(() => {
    if (playing && currentIndex < history.length - 1) {
      const timer = setTimeout(() => {
        setCurrentIndex(prev => prev + 1);
      }, 500);
      return () => clearTimeout(timer);
    } else if (currentIndex >= history.length - 1) {
      setPlaying(false);
    }
  }, [playing, currentIndex, history]);

  const handlePlayPause = () => {
    if (history.length > 0) {
      setPlaying(!playing);
    }
  };

  const handleReset = () => {
    setCurrentIndex(0);
    setPlaying(false);
  };

  const drawTrace = () => {
    if (!floorPlan || history.length === 0) return null;

    const width = 800;
    const height = 600;
    const historyPoints = history.slice(0, currentIndex + 1);

    return (
      <svg width="100%" height="600" viewBox={`0 0 ${width} ${height}`} className="border border-gray-300 rounded-lg bg-slate-50">
        {/* Grid */}
        <defs>
          <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
            <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#E2E8F0" strokeWidth="1"/>
          </pattern>
        </defs>
        <rect width={width} height={height} fill="url(#grid)" />

        {/* Floor plan image */}
        {floorPlan.image && (
          <image href={floorPlan.image} width={width} height={height} opacity="0.6" />
        )}

        {/* Anchors */}
        {floorPlan.anchors?.map((anchor, idx) => {
          const x = (anchor.x / floorPlan.width) * width;
          const y = (anchor.y / floorPlan.height) * height;
          return (
            <g key={idx}>
              <circle cx={x} cy={y} r="8" fill="#10B981" stroke="#fff" strokeWidth="2" />
              <text x={x + 12} y={y + 4} fontSize="11" fill="#1E293B" fontWeight="bold">
                {anchor.name || anchor.device_id.slice(-6)}
              </text>
            </g>
          );
        })}

        {/* Trace path */}
        {historyPoints.length > 1 && (
          <path
            d={historyPoints
              .filter(p => p.x !== null && p.y !== null)
              .map((point, idx) => {
                const x = (point.x / floorPlan.width) * width;
                const y = (point.y / floorPlan.height) * height;
                return `${idx === 0 ? 'M' : 'L'} ${x} ${y}`;
              })
              .join(' ')}
            stroke="#006CDD"
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.6"
          />
        )}

        {/* Historical points */}
        {historyPoints.map((point, idx) => {
          if (point.x === null || point.y === null) return null;
          const x = (point.x / floorPlan.width) * width;
          const y = (point.y / floorPlan.height) * height;
          const isLast = idx === historyPoints.length - 1;
          
          return (
            <circle
              key={idx}
              cx={x}
              cy={y}
              r={isLast ? 12 : 4}
              fill={isLast ? '#006CDD' : '#94A3B8'}
              stroke="#fff"
              strokeWidth="2"
              opacity={isLast ? 1 : 0.5}
            />
          );
        })}

        {/* Current position label */}
        {historyPoints.length > 0 && historyPoints[currentIndex]?.x !== null && (
          <g>
            {(() => {
              const point = historyPoints[currentIndex];
              const x = (point.x / floorPlan.width) * width;
              const y = (point.y / floorPlan.height) * height;
              return (
                <>
                  <circle cx={x} cy={y} r="20" fill="#006CDD" opacity="0.2" />
                  <text x={x} y={y - 25} fontSize="12" fill="#006CDD" fontWeight="bold" textAnchor="middle">
                    {new Date(point.timestamp).toLocaleTimeString()}
                  </text>
                </>
              );
            })()}
          </g>
        )}
      </svg>
    );
  };

  return (
    <div className="space-y-6">
      <Card className="bg-white border-gray-200" data-testid="historical-trace-card">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-gray-900">Historical Movement Trace</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Controls */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Select Asset</label>
              <Select value={selectedDeviceId} onValueChange={setSelectedDeviceId}>
                <SelectTrigger data-testid="history-device-select">
                  <SelectValue placeholder="Select a tag..." />
                </SelectTrigger>
                <SelectContent>
                  {tags.map(tag => (
                    <SelectItem key={tag.device_id} value={tag.device_id}>
                      {tag.device_id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Time Period (hours)</label>
              <div className="flex items-center gap-3">
                <Slider
                  data-testid="history-hours-slider"
                  value={[hours]}
                  onValueChange={(value) => setHours(value[0])}
                  min={1}
                  max={24}
                  step={1}
                  className="flex-1"
                />
                <span className="text-sm font-semibold text-gray-900 w-12">{hours}h</span>
              </div>
            </div>

            <div className="flex items-end">
              <Button 
                data-testid="load-history-button"
                onClick={handleLoadHistory} 
                disabled={!selectedDeviceId || loading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              >
                {loading ? 'Loading...' : 'Load History'}
              </Button>
            </div>
          </div>

          {/* Playback controls */}
          {history.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Button
                  data-testid="play-pause-button"
                  onClick={handlePlayPause}
                  variant="outline"
                  size="sm"
                  className="border-gray-300"
                >
                  {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </Button>
                <Button
                  data-testid="reset-button"
                  onClick={handleReset}
                  variant="outline"
                  size="sm"
                  className="border-gray-300"
                >
                  <RotateCcw className="w-4 h-4" />
                </Button>
                <div className="flex-1">
                  <Slider
                    data-testid="playback-slider"
                    value={[currentIndex]}
                    onValueChange={(value) => setCurrentIndex(value[0])}
                    min={0}
                    max={Math.max(0, history.length - 1)}
                    step={1}
                  />
                </div>
                <span className="text-sm text-gray-600">
                  {currentIndex + 1} / {history.length}
                </span>
              </div>
            </div>
          )}

          {/* Trace visualization */}
          <div className="mt-6">
            {history.length === 0 ? (
              <div className="text-center py-20 text-gray-500 border border-gray-200 rounded-lg bg-slate-50">
                <Clock className="w-16 h-16 mx-auto mb-4 opacity-30" />
                <p className="text-lg font-medium">No history loaded</p>
                <p className="text-sm mt-1">Select an asset and click "Load History" to view movement trace</p>
              </div>
            ) : (
              drawTrace()
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default HistoricalTrace;