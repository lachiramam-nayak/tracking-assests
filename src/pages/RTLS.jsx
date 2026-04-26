import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { ScrollArea } from '../components/ui/scroll-area';
import { Slider } from '../components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Input } from '../components/ui/input';
import { Checkbox } from '../components/ui/checkbox';
import { Play, Pause, RotateCcw, Battery, Activity, Circle, Filter, X, Search, User, LocateFixed } from 'lucide-react';
import { toast } from 'sonner';

<<<<<<< HEAD
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'https://assest-backend-z6uq.onrender.com';
=======
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';
>>>>>>> 19e96b05e597b137c0b0c12445804d6a9c9bf51f
const API = `${BACKEND_URL}/api`;
const WS_URL = BACKEND_URL.replace('http', 'ws');

const RTLS = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [tags, setTags] = useState([]);
  const [floorPlan, setFloorPlan] = useState(null);
  const [selectedTag, setSelectedTag] = useState(null);
  const [wsConnected, setWsConnected] = useState(false);
  const [selectedDeviceId, setSelectedDeviceId] = useState('');
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hours, setHours] = useState(8);
  const [playing, setPlaying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const canvasRef = useRef(null);
  const floorPlanImageRef = useRef(null);
  const floorPlanBoundsRef = useRef({ offsetX: 0, offsetY: 0, drawWidth: 0, drawHeight: 0 });
  const [dimensions] = useState({ width: 1200, height: 700 });

  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedTags, setSelectedTags] = useState(new Set());
  const [filterPanelOpen, setFilterPanelOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [zoom] = useState(1);
  const [expandedClusters, setExpandedClusters] = useState(new Set());
  const [patientAssignments, setPatientAssignments] = useState([]);
  const [highlightedTag, setHighlightedTag] = useState(null);
  const pulseAnimationRef = useRef(0);
  const [equipmentAssignments, setEquipmentAssignments] = useState({});

  const requestedDeviceId = searchParams.get('device_id') || '';

  const loadFloorPlan = useCallback(async () => {
    try {
      const response = await fetch(`${API}/floor-plan`);
      const data = await response.json();
      setFloorPlan(data);
    } catch (error) {
      console.error('Failed to load floor plan', error);
    }
  }, []);

  useEffect(() => {
    try {
      const savedPatientAssignments = JSON.parse(localStorage.getItem('patientTagAssignments') || '[]');
      setPatientAssignments(savedPatientAssignments.filter(item => item.status === 'active'));
    } catch (error) {
      console.error('Failed to load patient assignments', error);
    }

    try {
      const savedEquipmentAssignments = JSON.parse(localStorage.getItem('equipmentAssignments') || '{}');
      setEquipmentAssignments(savedEquipmentAssignments);
    } catch (error) {
      console.error('Failed to load equipment assignments', error);
    }
  }, []);

  useEffect(() => {
    let ws;
    const connect = () => {
      ws = new WebSocket(`${WS_URL}/api/ws/rtls`);
      ws.onopen = () => setWsConnected(true);
      ws.onclose = () => {
        setWsConnected(false);
        setTimeout(connect, 3000);
      };
      ws.onmessage = (e) => {
        if (playing) return;
        const data = JSON.parse(e.data);
        if (data.type === 'tag_update') {
          setTags((prev) => {
            if (Array.isArray(data.data) && data.data.length === 0 && prev.length > 0) {
              return prev;
            }
            return Array.isArray(data.data) ? data.data : prev;
          });
        }
      };
    };
    connect();
    loadFloorPlan();
    return () => ws && ws.close();
  }, [loadFloorPlan, playing]);

  useEffect(() => {
    if (!highlightedTag) return;
    let animationFrame;
    const animate = () => {
      pulseAnimationRef.current += 0.1;
      animationFrame = requestAnimationFrame(animate);
    };
    animate();
    return () => { if (animationFrame) cancelAnimationFrame(animationFrame); };
  }, [highlightedTag]);

  useEffect(() => {
    if (!floorPlan?.image) {
      floorPlanImageRef.current = null;
      floorPlanBoundsRef.current = { offsetX: 0, offsetY: 0, drawWidth: dimensions.width, drawHeight: dimensions.height };
      return;
    }

    const img = new Image();
    img.onload = () => {
      const { width, height } = dimensions;
      const imgAspect = img.width / img.height;
      const canvasAspect = width / height;
      let drawWidth, drawHeight, offsetX = 0, offsetY = 0;

      if (imgAspect > canvasAspect) {
        drawWidth = width;
        drawHeight = width / imgAspect;
        offsetY = (height - drawHeight) / 2;
      } else {
        drawHeight = height;
        drawWidth = height * imgAspect;
        offsetX = (width - drawWidth) / 2;
      }

      floorPlanImageRef.current = img;
      floorPlanBoundsRef.current = { offsetX, offsetY, drawWidth, drawHeight };
    };
    img.src = floorPlan.image;
  }, [floorPlan, dimensions]);

  const getFilteredTags = useCallback(() => {
    let filtered = tags;
    if (statusFilter === 'online') filtered = filtered.filter(t => t.status === 'online');
    else if (statusFilter === 'offline') filtered = filtered.filter(t => t.status === 'offline');
    if (searchQuery) filtered = filtered.filter(t => t.device_id.toLowerCase().includes(searchQuery.toLowerCase()));
    if (selectedTags.size > 0) filtered = filtered.filter(t => selectedTags.has(t.device_id));
    return filtered;
  }, [tags, statusFilter, searchQuery, selectedTags]);

  const toCanvasPos = useCallback((coordX, coordY) => {
    const { offsetX, offsetY, drawWidth, drawHeight } = floorPlanBoundsRef.current;
    const mapWidth = floorPlan?.width || 800;
    const mapHeight = floorPlan?.height || 600;
    return {
      x: offsetX + (coordX / mapWidth) * drawWidth,
      y: offsetY + (coordY / mapHeight) * drawHeight,
    };
  }, [floorPlan]);

  const processTagClusters = useCallback((filteredTags) => {
    const clusters = [];
    const processed = new Set();
    const CLUSTER_THRESHOLD = 30 * zoom;

    filteredTags.forEach(tag => {
      if (!tag.x || !tag.y || processed.has(tag.device_id)) return;
      const { x, y } = toCanvasPos(tag.x, tag.y);

      const nearby = filteredTags.filter(t => {
        if (!t.x || !t.y || processed.has(t.device_id)) return false;
        const { x: tx, y: ty } = toCanvasPos(t.x, t.y);
        return Math.sqrt(Math.pow(tx - x, 2) + Math.pow(ty - y, 2)) < CLUSTER_THRESHOLD;
      });

      if (nearby.length > 1) {
        nearby.forEach(t => processed.add(t.device_id));
        const clusterId = `cluster_${x}_${y}`;
        clusters.push({ id: clusterId, tags: nearby, x, y, expanded: expandedClusters.has(clusterId) });
      } else {
        processed.add(tag.device_id);
        clusters.push({ id: tag.device_id, tags: [tag], x, y, expanded: false });
      }
    });
    return clusters;
  }, [toCanvasPos, zoom, expandedClusters]);

  const handleAssetClick = useCallback((tag, fromQuery = false) => {
    if (!tag) return;
    setSelectedTag(tag);
    setSelectedDeviceId(tag.device_id);
    setHighlightedTag(tag.device_id);

    const clusters = processTagClusters(getFilteredTags());
    clusters.forEach(cluster => {
      if (cluster.tags.some(t => t.device_id === tag.device_id) && cluster.tags.length > 1) {
        const newExpanded = new Set(expandedClusters);
        newExpanded.add(cluster.id);
        setExpandedClusters(newExpanded);
      }
    });

    if (fromQuery) {
      toast.success(`Focused ${tag.device_id} on the map`);
    } else if (tag.x && tag.y) {
      toast.success(`Centered on ${tag.device_id}`);
    }
  }, [expandedClusters, getFilteredTags, processTagClusters]);

  useEffect(() => {
    if (!requestedDeviceId || tags.length === 0) return;
    const match = tags.find(tag => tag.device_id === requestedDeviceId);
    if (match) {
      handleAssetClick(match, true);
      setSelectedTags(new Set([requestedDeviceId]));
      setSearchQuery(requestedDeviceId);
    }
  }, [requestedDeviceId, tags, handleAssetClick]);

  const drawSingleTag = (ctx, tag, x, y) => {
    const patient = patientAssignments.find(p => p.macId === tag.device_id);
    const equipment = equipmentAssignments[tag.device_id];
    const isOnline = tag.status === 'online';
    const isHighlighted = highlightedTag === tag.device_id;

    let color = isOnline ? '#006CDD' : '#94A3B8';
    if (patient) color = '#8B5CF6';
    else if (equipment) color = '#F97316';

    if (isHighlighted) {
      const pulseSize = 25 + Math.sin(pulseAnimationRef.current) * 8;
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.globalAlpha = 0.6 - Math.sin(pulseAnimationRef.current) * 0.3;
      ctx.beginPath();
      ctx.arc(x, y, pulseSize, 0, 2 * Math.PI);
      ctx.stroke();
      ctx.globalAlpha = 1.0;
    }

    if (isOnline) {
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.2;
      ctx.beginPath();
      ctx.arc(x, y, 18, 0, 2 * Math.PI);
      ctx.fill();
      ctx.globalAlpha = 1.0;
    }

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, 10, 0, 2 * Math.PI);
    ctx.fill();
    ctx.strokeStyle = isHighlighted ? '#FFD700' : '#ffffff';
    ctx.lineWidth = isHighlighted ? 3 : 2;
    ctx.stroke();

    if (patient) {
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 10px Inter';
      ctx.textAlign = 'center';
      ctx.fillText('P', x, y + 4);
    } else if (equipment) {
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px Inter';
      ctx.textAlign = 'center';
      ctx.fillText('E', x, y + 4);
    }

    let label;
    if (patient) label = patient.patientName.split(' ')[0];
    else if (equipment) label = equipment;
    else label = tag.device_id.slice(-6);

    ctx.font = isHighlighted ? 'bold 11px Inter' : '11px Inter';
    ctx.textAlign = 'center';
    const textWidth = ctx.measureText(label).width;

    ctx.fillStyle = isHighlighted ? 'rgba(255, 215, 0, 0.2)' : 'rgba(255, 255, 255, 0.9)';
    ctx.fillRect(x - textWidth / 2 - 3, y + 14, textWidth + 6, 16);
    ctx.strokeStyle = isHighlighted ? '#FFD700' : color;
    ctx.lineWidth = isHighlighted ? 2 : 1;
    ctx.strokeRect(x - textWidth / 2 - 3, y + 14, textWidth + 6, 16);

    ctx.fillStyle = '#1E293B';
    ctx.fillText(label, x, y + 26);
  };

  const drawSpreadTags = (ctx, cluster) => {
    const { tags: clusterTags, x, y } = cluster;
    const radius = 40;
    const angleStep = (2 * Math.PI) / clusterTags.length;
    clusterTags.forEach((tag, idx) => {
      const angle = idx * angleStep;
      drawSingleTag(ctx, tag, x + radius * Math.cos(angle), y + radius * Math.sin(angle));
    });
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const { width, height } = dimensions;
    const { offsetX, offsetY, drawWidth, drawHeight } = floorPlanBoundsRef.current;

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#F8FAFC';
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = '#E2E8F0';
    ctx.lineWidth = 1;
    for (let x = 0; x <= width; x += 50) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke();
    }
    for (let y = 0; y <= height; y += 50) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();
    }

    if (floorPlanImageRef.current) {
      ctx.globalAlpha = 0.7;
      ctx.drawImage(floorPlanImageRef.current, offsetX, offsetY, drawWidth, drawHeight);
      ctx.globalAlpha = 1.0;
    }

    if (floorPlan?.anchors) {
      floorPlan.anchors.forEach(anchor => {
        const { x, y } = toCanvasPos(anchor.x, anchor.y);
        ctx.fillStyle = anchor.status === 'online' ? '#10B981' : '#6B7280';
        ctx.beginPath(); ctx.arc(x, y, 8, 0, 2 * Math.PI); ctx.fill();
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; ctx.stroke();
        ctx.fillStyle = '#1E293B'; ctx.font = 'bold 11px Inter'; ctx.textAlign = 'left';
        ctx.fillText(anchor.name || anchor.device_id.slice(-6), x + 12, y + 4);
      });
    }

    const filteredTags = getFilteredTags();
    const clusters = processTagClusters(filteredTags);

    clusters.forEach(cluster => {
      if (cluster.tags.length > 1 && !cluster.expanded) {
        const hasLowBattery = cluster.tags.some(t => t.battery && t.battery < 2500);
        const color = hasLowBattery ? '#EF4444' : '#006CDD';
        ctx.fillStyle = color; ctx.globalAlpha = 0.3;
        ctx.beginPath(); ctx.arc(cluster.x, cluster.y, 25, 0, 2 * Math.PI); ctx.fill();
        ctx.globalAlpha = 1.0;
        ctx.fillStyle = color;
        ctx.beginPath(); ctx.arc(cluster.x, cluster.y, 15, 0, 2 * Math.PI); ctx.fill();
        ctx.fillStyle = '#ffffff'; ctx.font = 'bold 12px Inter'; ctx.textAlign = 'center';
        ctx.fillText(cluster.tags.length, cluster.x, cluster.y + 4);
      } else if (cluster.expanded) {
        drawSpreadTags(ctx, cluster);
      } else {
        drawSingleTag(ctx, cluster.tags[0], cluster.x, cluster.y);
      }
    });
  }, [tags, floorPlan, dimensions, getFilteredTags, processTagClusters, toCanvasPos, patientAssignments, expandedClusters, highlightedTag, equipmentAssignments]);

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
      toast.error('Failed to load history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (playing && currentIndex < history.length - 1) {
      const timer = setTimeout(() => setCurrentIndex(prev => prev + 1), 500);
      return () => clearTimeout(timer);
    } else if (currentIndex >= history.length - 1) {
      setPlaying(false);
    }
  }, [playing, currentIndex, history]);

  const toggleTagSelection = (deviceId) => {
    const newSelection = new Set(selectedTags);
    if (newSelection.has(deviceId)) newSelection.delete(deviceId);
    else newSelection.add(deviceId);
    setSelectedTags(newSelection);
  };

  const handleCanvasClick = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = dimensions.width / rect.width;
    const scaleY = dimensions.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    const clusters = processTagClusters(getFilteredTags());
    clusters.forEach(cluster => {
      const dist = Math.sqrt(Math.pow(cluster.x - x, 2) + Math.pow(cluster.y - y, 2));
      if (dist < 25 && cluster.tags.length > 1) {
        const newExpanded = new Set(expandedClusters);
        if (newExpanded.has(cluster.id)) newExpanded.delete(cluster.id);
        else newExpanded.add(cluster.id);
        setExpandedClusters(newExpanded);
      } else if (dist < 20 && cluster.tags.length === 1) {
        handleAssetClick(cluster.tags[0]);
      }
    });
  };

  const selectedTagTitle = useMemo(() => {
    if (!selectedTag) return '';
    const patient = patientAssignments.find(p => p.macId === selectedTag.device_id);
    const equipment = equipmentAssignments[selectedTag.device_id];
    return patient ? patient.patientName : (equipment || selectedTag.device_id);
  }, [selectedTag, patientAssignments, equipmentAssignments]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-gray-900">RTLS Live Tracking</h1>
          <p className="text-gray-600 mt-2">Real-time location and movement tracking</p>
        </div>
        <div className="flex items-center gap-4">
          {requestedDeviceId && selectedTag && (
            <Badge variant="outline" className="px-4 py-2">
              <LocateFixed className="w-3.5 h-3.5 mr-2" />
              Focused: {selectedTagTitle}
            </Badge>
          )}
          {playing && <Badge variant="destructive" className="px-4 py-2">History Mode - Live Updates Paused</Badge>}
          <Badge variant={wsConnected ? 'success' : 'secondary'} className="px-4 py-2">
            <Circle className={`w-2 h-2 mr-2 ${wsConnected ? 'fill-green-500' : 'fill-gray-500'}`} />
            {wsConnected ? 'Connected' : 'Disconnected'}
          </Badge>
        </div>
      </div>

      <div className="flex gap-6">
        {filterPanelOpen && (
          <Card className="w-80 bg-white h-fit">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Filters</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setFilterPanelOpen(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-2 block">Status</label>
                <div className="flex rounded-lg border border-gray-300 bg-gray-50">
                  <button onClick={() => setStatusFilter('all')} className={`flex-1 py-2 text-sm font-medium rounded-l-lg transition ${statusFilter === 'all' ? 'bg-[#006CDD] text-white' : 'text-gray-700 hover:bg-gray-100'}`}>All</button>
                  <button onClick={() => setStatusFilter('online')} className={`flex-1 py-2 text-sm font-medium transition ${statusFilter === 'online' ? 'bg-green-600 text-white' : 'text-gray-700 hover:bg-gray-100'}`}>Online</button>
                  <button onClick={() => setStatusFilter('offline')} className={`flex-1 py-2 text-sm font-medium rounded-r-lg transition ${statusFilter === 'offline' ? 'bg-gray-600 text-white' : 'text-gray-700 hover:bg-gray-100'}`}>Offline</button>
                </div>
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700 mb-2 block">Search Tags</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input placeholder="Search by device ID..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-semibold text-gray-700">Select Tags</label>
                  <Button variant="ghost" size="sm" onClick={() => {
                    setSelectedTags(new Set());
                    setSearchQuery('');
                    if (requestedDeviceId) {
                      setSearchParams({});
                    }
                  }} className="text-xs">Clear All</Button>
                </div>
                <ScrollArea className="h-[300px] border rounded-lg p-2">
                  {tags.map(tag => (
                    <div key={tag.device_id} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded">
                      <Checkbox checked={selectedTags.has(tag.device_id)} onCheckedChange={() => toggleTagSelection(tag.device_id)} />
                      <span className="text-sm flex-1">{tag.device_id}</span>
                      <Badge variant={tag.status === 'online' ? 'success' : 'secondary'} className="text-xs">{tag.status}</Badge>
                    </div>
                  ))}
                </ScrollArea>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex-1 space-y-6">
          {!filterPanelOpen && (
            <Button onClick={() => setFilterPanelOpen(true)} variant="outline">
              <Filter className="w-4 h-4 mr-2" />
              Show Filters
            </Button>
          )}

          <Card className="bg-white">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Live Floor Plan</CardTitle>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <User className="w-4 h-4 text-purple-600" /><span>Patient</span>
                  <Circle className="w-3 h-3 fill-orange-500 ml-3" /><span>Equipment</span>
                  <Circle className="w-3 h-3 fill-[#006CDD] ml-3" /><span>Unassigned</span>
                  <Circle className="w-3 h-3 fill-gray-400 ml-3" /><span>Offline</span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <canvas ref={canvasRef} width={dimensions.width} height={dimensions.height} className="border border-gray-300 rounded-lg w-full cursor-pointer" onClick={handleCanvasClick} />
                <div className="absolute top-2 right-2 bg-white border border-gray-300 rounded px-3 py-1 text-xs text-gray-600">
                  Click cluster numbers to expand
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Movement History</CardTitle>
                {playing && <Badge variant="destructive">Live Updates Paused</Badge>}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <Select value={selectedDeviceId} onValueChange={setSelectedDeviceId}>
                  <SelectTrigger><SelectValue placeholder="Select asset..." /></SelectTrigger>
                  <SelectContent>
                    {tags.map(tag => <SelectItem key={tag.device_id} value={tag.device_id}>{tag.device_id}</SelectItem>)}
                  </SelectContent>
                </Select>
                <div className="flex items-center gap-2">
                  <Slider value={[hours]} onValueChange={(v) => setHours(v[0])} min={1} max={24} step={1} />
                  <span className="text-sm font-semibold w-12">{hours}h</span>
                </div>
                <Button onClick={() => loadHistory(selectedDeviceId, hours)} disabled={!selectedDeviceId || loading} className="bg-[#006CDD]">
                  {loading ? 'Loading...' : 'Load History'}
                </Button>
              </div>
              {history.length > 0 && (
                <div className="flex items-center gap-4">
                  <Button onClick={() => setPlaying(!playing)} variant="outline" size="sm">
                    {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  </Button>
                  <Button onClick={() => { setCurrentIndex(0); setPlaying(false); }} variant="outline" size="sm">
                    <RotateCcw className="w-4 h-4" />
                  </Button>
                  <Slider value={[currentIndex]} onValueChange={(v) => setCurrentIndex(v[0])} min={0} max={Math.max(0, history.length - 1)} step={1} className="flex-1" />
                  <span className="text-sm">{currentIndex + 1} / {history.length}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="w-80">
          <Card className="bg-white">
            <CardHeader><CardTitle>Assets ({getFilteredTags().length})</CardTitle></CardHeader>
            <CardContent>
              <ScrollArea className="h-[800px] pr-2">
                <div className="space-y-2">
                  {getFilteredTags().map(tag => {
                    const patient = patientAssignments.find(p => p.macId === tag.device_id);
                    const equipment = equipmentAssignments[tag.device_id];
                    return (
                      <div
                        key={tag.device_id}
                        onClick={() => handleAssetClick(tag)}
                        className={`p-3 rounded-lg border cursor-pointer transition ${selectedTag?.device_id === tag.device_id ? 'bg-blue-50 border-[#006CDD]' : 'border-gray-200 hover:border-blue-300'}`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {patient && <User className="w-4 h-4 text-purple-600" />}
                            <span className="font-semibold text-sm truncate">{patient ? patient.patientName : (equipment || tag.device_id)}</span>
                          </div>
                          <Badge variant={tag.status === 'online' ? 'success' : 'secondary'} className="text-xs">{tag.status}</Badge>
                        </div>
                        {patient && <div className="text-xs text-gray-600 mb-1">ID: {patient.patientId} • {patient.ward}</div>}
                        {equipment && !patient && (
                          <div className="text-xs text-orange-600 mb-1 flex items-center gap-1">
                            <Circle className="w-2 h-2 fill-orange-600" />Equipment: {equipment}
                          </div>
                        )}
                        <div className="text-xs text-gray-500 font-mono mb-1">MAC: {tag.device_id}</div>
                        <div className="space-y-1 text-xs text-gray-600">
                          {tag.battery && <div className="flex items-center gap-1"><Battery className="w-3 h-3" />{(tag.battery / 1000).toFixed(2)}V</div>}
                          {tag.motion_state && <div className="flex items-center gap-1"><Activity className="w-3 h-3" />{tag.motion_state}</div>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

<<<<<<< HEAD
export default RTLS;
=======
export default RTLS;
>>>>>>> 19e96b05e597b137c0b0c12445804d6a9c9bf51f
