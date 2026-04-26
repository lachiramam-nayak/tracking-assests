import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Search, UserPlus, Unlink, Link2, Activity, User, Wifi, UserX, RefreshCcw } from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'https://assest-backend-z6uq.onrender.com';
const WS_URL = BACKEND_URL.replace('http', 'ws');

const PatientTagAssignment = () => {
  const [tags, setTags] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [selectedTag, setSelectedTag] = useState(null);
  const [activeTab, setActiveTab] = useState('assigned');
  const [newPatient, setNewPatient] = useState({
    patientId: '',
    patientName: '',
    age: '',
    gender: '',
    ward: '',
    admissionDate: new Date().toISOString().split('T')[0],
    condition: '',
    emergencyContact: ''
  });

  useEffect(() => {
    let ws;
    const connect = () => {
      ws = new WebSocket(`${WS_URL}/api/ws/rtls`);
      ws.onopen = () => console.log('Connected to tag data');
      ws.onmessage = (event) => {
        const message = JSON.parse(event.data);
        if (message.type === 'tag_update') {
          setTags(message.data);
        }
      };
      ws.onerror = () => console.log('WS error');
      ws.onclose = () => setTimeout(connect, 3000);
    };
    connect();

    const saved = localStorage.getItem('patientTagAssignments');
    if (saved) {
      setAssignments(JSON.parse(saved));
    }

    return () => ws && ws.close();
  }, []);

  const saveAssignments = (updated) => {
    setAssignments(updated);
    localStorage.setItem('patientTagAssignments', JSON.stringify(updated));
  };

  const handleAssign = () => {
    if (!selectedTag || !newPatient.patientId || !newPatient.patientName) {
      toast.error('Please fill all required fields');
      return;
    }

    const assignment = {
      id: Date.now().toString(),
      macId: selectedTag.device_id,
      patientId: newPatient.patientId,
      patientName: newPatient.patientName,
      age: newPatient.age,
      gender: newPatient.gender,
      ward: newPatient.ward,
      admissionDate: newPatient.admissionDate,
      condition: newPatient.condition,
      emergencyContact: newPatient.emergencyContact,
      assignedAt: new Date().toISOString(),
      status: 'active',
      tagStatus: selectedTag.status,
      battery: selectedTag.battery,
      location: selectedTag.position_ref
    };

    const updated = [...assignments, assignment];
    saveAssignments(updated);
    
    toast.success(`Tag ${selectedTag.device_id} assigned to ${newPatient.patientName}`);
    setIsAssignOpen(false);
    setSelectedTag(null);
    setNewPatient({
      patientId: '',
      patientName: '',
      age: '',
      gender: '',
      ward: '',
      admissionDate: new Date().toISOString().split('T')[0],
      condition: '',
      emergencyContact: ''
    });
  };

  const handleDischarge = (assignmentId) => {
    const updated = assignments.map(a => 
      a.id === assignmentId 
        ? { ...a, status: 'discharged', dischargedAt: new Date().toISOString() } 
        : a
    );
    saveAssignments(updated);
    toast.success('Patient discharged successfully');
    setActiveTab('discharged');
  };

  const handleUnassign = (assignmentId) => {
    const assignment = assignments.find(a => a.id === assignmentId);
    if (assignment.status !== 'discharged') {
      toast.error('Please discharge the patient first before unassigning the tag');
      return;
    }
    
    const updated = assignments.filter(a => a.id !== assignmentId);
    saveAssignments(updated);
    toast.success('Tag unassigned and available for reuse');
  };

  const isTagAssigned = (deviceId) => {
    return assignments.some(a => a.macId === deviceId && a.status !== 'discharged');
  };

  const activeAssignments = assignments.filter(a => a.status === 'active' && 
    (a.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
     a.patientId.toLowerCase().includes(searchQuery.toLowerCase()) ||
     a.macId.toLowerCase().includes(searchQuery.toLowerCase())));

  const dischargedAssignments = assignments.filter(a => a.status === 'discharged' &&
    (a.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
     a.patientId.toLowerCase().includes(searchQuery.toLowerCase()) ||
     a.macId.toLowerCase().includes(searchQuery.toLowerCase())));

  const stats = {
    total: tags.length,
    assigned: assignments.filter(a => a.status === 'active').length,
    available: tags.length - assignments.filter(a => a.status === 'active').length,
    discharged: assignments.filter(a => a.status === 'discharged').length
  };

  const PatientCard = ({ assignment, showDischarge, showUnassign }) => {
    const currentTag = tags.find(t => t.device_id === assignment.macId);

    return (
      <Card className={`bg-white hover:shadow-xl transition-all border-l-4 ${
        assignment.status === 'active' ? 'border-l-green-600' : 'border-l-gray-400'
      }`}>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
            <div className="md:col-span-2">
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                  assignment.status === 'active' ? 'bg-purple-100' : 'bg-gray-100'
                }`}>
                  <User className={`w-6 h-6 ${assignment.status === 'active' ? 'text-purple-600' : 'text-gray-600'}`} />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900">{assignment.patientName}</h3>
                  <p className="text-sm text-gray-600 font-mono mt-1">ID: {assignment.patientId}</p>
                  <div className="flex gap-2 mt-2 flex-wrap">
                    <Badge className="bg-purple-100 text-purple-700">{assignment.age} yrs</Badge>
                    <Badge className="bg-blue-100 text-blue-700">{assignment.gender}</Badge>
                    <Badge className={assignment.status === 'active' ? 'bg-green-600 text-white' : 'bg-gray-600 text-white'}>
                      {assignment.status}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-semibold text-gray-500 mb-2">BLE TAG (MAC ID)</h4>
              <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                <div className="flex items-center gap-2 mb-2">
                  <Wifi className="w-4 h-4 text-blue-600" />
                  <p className="font-mono text-sm font-bold text-blue-700">{assignment.macId}</p>
                </div>
                {currentTag && (
                  <div className="space-y-1">
                    <Badge variant={currentTag.status === 'online' ? 'success' : 'secondary'} className="text-xs">
                      {currentTag.status}
                    </Badge>
                    {currentTag.battery && (
                      <p className="text-xs text-gray-600">Battery: {(currentTag.battery/1000).toFixed(2)}V</p>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div>
              <h4 className="text-xs font-semibold text-gray-500 mb-3">Patient Details</h4>
              <div className="space-y-2 text-sm">
                <div><span className="text-gray-500">Ward:</span> <span className="font-semibold">{assignment.ward}</span></div>
                <div><span className="text-gray-500">Condition:</span> <span className="font-semibold">{assignment.condition}</span></div>
                <div><span className="text-gray-500">Admitted:</span> <span className="font-semibold">{new Date(assignment.admissionDate).toLocaleDateString()}</span></div>
                <div><span className="text-gray-500">Contact:</span> <span className="font-mono text-xs">{assignment.emergencyContact}</span></div>
              </div>
            </div>

            <div className="flex flex-col justify-center gap-2">
              {showDischarge && (
                <Button 
                  variant="default"
                  className="bg-orange-600 hover:bg-orange-700 text-white w-full"
                  onClick={() => handleDischarge(assignment.id)}
                >
                  <UserX className="w-4 h-4 mr-2" />
                  Discharge Patient
                </Button>
              )}
              {showUnassign && (
                <Button 
                  variant="destructive" 
                  onClick={() => handleUnassign(assignment.id)}
                  className="w-full"
                >
                  <Unlink className="w-4 h-4 mr-2" />
                  Unassign Tag
                </Button>
              )}
              <p className="text-xs text-gray-500 text-center">
                Assigned {new Date(assignment.assignedAt).toLocaleDateString()}
              </p>
              {assignment.dischargedAt && (
                <p className="text-xs text-orange-600 text-center">
                  Discharged {new Date(assignment.dischargedAt).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-bold text-gray-900">Patient-Tag Assignment</h1>
        <p className="text-gray-600 mt-2">Manage BLE tag assignments to patients for real-time tracking</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-white border-2 border-blue-300">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-gray-600">Total Tags</CardTitle>
              <Wifi className="w-5 h-5 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-blue-600">{stats.total}</div>
          </CardContent>
        </Card>

        <Card className="bg-white border-2 border-green-300">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-gray-600">Active Patients</CardTitle>
              <Link2 className="w-5 h-5 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-green-600">{stats.assigned}</div>
          </CardContent>
        </Card>

        <Card className="bg-white border-2 border-orange-300">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-gray-600">Available Tags</CardTitle>
              <Activity className="w-5 h-5 text-orange-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-orange-600">{stats.available}</div>
          </CardContent>
        </Card>

        <Card className="bg-white border-2 border-gray-300">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-gray-600">Discharged</CardTitle>
              <UserX className="w-5 h-5 text-gray-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-gray-600">{stats.discharged}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card className="bg-white">
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input placeholder="Search by patient name, ID, or MAC address..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
          </div>
        </CardContent>
      </Card>

      {/* Available Tags */}
      <Card className="bg-white">
        <CardHeader>
          <CardTitle className="text-xl font-semibold">Available BLE Tags ({tags.filter(tag => !isTagAssigned(tag.device_id)).length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {tags.filter(tag => !isTagAssigned(tag.device_id)).slice(0, 8).map(tag => (
              <Card key={tag.device_id} className="bg-gradient-to-br from-blue-50 to-white border-2 border-blue-200 hover:shadow-lg transition-all">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <Wifi className="w-8 h-8 mx-auto mb-2 text-blue-600" />
                    <p className="font-mono text-sm text-gray-900 font-semibold">{tag.device_id}</p>
                    <Badge variant={tag.status === 'online' ? 'success' : 'secondary'} className="mt-2">
                      {tag.status}
                    </Badge>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button size="sm" className="w-full mt-3 bg-[#006CDD]" onClick={() => setSelectedTag(tag)}>
                          <UserPlus className="w-4 h-4 mr-2" />
                          Assign
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>Assign Tag to Patient</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 mt-4">
                          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                            <p className="text-sm text-gray-600">Selected Tag (MAC ID)</p>
                            <p className="font-mono text-lg font-bold text-blue-600">{selectedTag?.device_id}</p>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label>Patient ID *</Label>
                              <Input value={newPatient.patientId} onChange={(e) => setNewPatient({...newPatient, patientId: e.target.value})} placeholder="P-2024-001" className="mt-2" />
                            </div>
                            <div>
                              <Label>Patient Name *</Label>
                              <Input value={newPatient.patientName} onChange={(e) => setNewPatient({...newPatient, patientName: e.target.value})} placeholder="John Doe" className="mt-2" />
                            </div>
                          </div>

                          <div className="grid grid-cols-3 gap-4">
                            <div>
                              <Label>Age</Label>
                              <Input type="number" value={newPatient.age} onChange={(e) => setNewPatient({...newPatient, age: e.target.value})} placeholder="45" className="mt-2" />
                            </div>
                            <div>
                              <Label>Gender</Label>
                              <Select value={newPatient.gender} onValueChange={(val) => setNewPatient({...newPatient, gender: val})}>
                                <SelectTrigger className="mt-2">
                                  <SelectValue placeholder="Select" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Male">Male</SelectItem>
                                  <SelectItem value="Female">Female</SelectItem>
                                  <SelectItem value="Other">Other</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label>Ward</Label>
                              <Input value={newPatient.ward} onChange={(e) => setNewPatient({...newPatient, ward: e.target.value})} placeholder="ICU-A" className="mt-2" />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label>Admission Date</Label>
                              <Input type="date" value={newPatient.admissionDate} onChange={(e) => setNewPatient({...newPatient, admissionDate: e.target.value})} className="mt-2" />
                            </div>
                            <div>
                              <Label>Condition</Label>
                              <Input value={newPatient.condition} onChange={(e) => setNewPatient({...newPatient, condition: e.target.value})} placeholder="Post-operative" className="mt-2" />
                            </div>
                          </div>

                          <div>
                            <Label>Emergency Contact</Label>
                            <Input value={newPatient.emergencyContact} onChange={(e) => setNewPatient({...newPatient, emergencyContact: e.target.value})} placeholder="+1 234-567-8900" className="mt-2" />
                          </div>

                          <div className="flex justify-end gap-2 pt-4">
                            <Button variant="outline" onClick={() => setIsAssignOpen(false)}>Cancel</Button>
                            <Button onClick={handleAssign} className="bg-green-600 hover:bg-green-700 text-white">
                              <Link2 className="w-4 h-4 mr-2" />
                              Assign Tag
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Tabs for Active and Discharged */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-white border border-gray-200 p-1">
          <TabsTrigger value="assigned" className="data-[state=active]:bg-green-600 data-[state=active]:text-white">
            Active Patients ({activeAssignments.length})
          </TabsTrigger>
          <TabsTrigger value="discharged" className="data-[state=active]:bg-gray-600 data-[state=active]:text-white">
            Discharged Patients ({dischargedAssignments.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="assigned" className="space-y-4 mt-6">
          <h2 className="text-2xl font-bold text-gray-900">Active Patients</h2>
          {activeAssignments.length === 0 ? (
            <Card className="bg-gray-50">
              <CardContent className="py-12 text-center">
                <User className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                <p className="text-gray-600">No active patient assignments</p>
              </CardContent>
            </Card>
          ) : (
            activeAssignments.map(assignment => (
              <PatientCard key={assignment.id} assignment={assignment} showDischarge={true} showUnassign={false} />
            ))
          )}
        </TabsContent>

        <TabsContent value="discharged" className="space-y-4 mt-6">
          <h2 className="text-2xl font-bold text-gray-900">Discharged Patients</h2>
          <div className="bg-orange-50 border-l-4 border-orange-500 p-4 rounded">
            <p className="text-sm text-orange-800">
              <strong>Note:</strong> Discharged patients can be unassigned to make their BLE tags available for new patients.
            </p>
          </div>
          {dischargedAssignments.length === 0 ? (
            <Card className="bg-gray-50">
              <CardContent className="py-12 text-center">
                <UserX className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                <p className="text-gray-600">No discharged patients</p>
              </CardContent>
            </Card>
          ) : (
            dischargedAssignments.map(assignment => (
              <PatientCard key={assignment.id} assignment={assignment} showDischarge={false} showUnassign={true} />
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PatientTagAssignment;
