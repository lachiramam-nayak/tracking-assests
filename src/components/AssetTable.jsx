import React from 'react';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { Battery, Clock, Activity } from 'lucide-react';

const AssetTable = ({ tags, selectedTag, onSelectTag }) => {
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = new Date(timestamp);
    return date.toLocaleTimeString();
  };

  const formatBattery = (battery) => {
    if (!battery) return '-';
    const voltage = battery / 1000; // Convert mV to V
    return `${voltage.toFixed(2)}V`;
  };

  return (
    <ScrollArea className="h-[500px] pr-4" data-testid="asset-table">
      <div className="space-y-2">
        {tags.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Activity className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No assets detected</p>
            <p className="text-xs mt-1">Waiting for tag data...</p>
          </div>
        ) : (
          tags.map((tag) => (
            <div
              key={tag.device_id}
              data-testid={`asset-item-${tag.device_id}`}
              onClick={() => onSelectTag(tag)}
              className={`p-4 rounded-lg border cursor-pointer transition-all duration-200 ${
                selectedTag?.device_id === tag.device_id
                  ? 'bg-blue-50 border-blue-500 shadow-md'
                  : 'bg-white border-gray-200 hover:border-blue-300 hover:shadow-sm'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-semibold text-gray-900 text-sm truncate">
                      {tag.device_id}
                    </span>
                    <Badge 
                      data-testid={`asset-status-${tag.device_id}`}
                      variant={tag.status === 'online' ? 'success' : 'secondary'}
                      className="text-xs"
                    >
                      {tag.status}
                    </Badge>
                  </div>
                  
                  <div className="space-y-1.5 text-xs text-gray-600">
                    {tag.battery && (
                      <div className="flex items-center gap-1.5">
                        <Battery className="w-3.5 h-3.5" />
                        <span>{formatBattery(tag.battery)}</span>
                      </div>
                    )}
                    
                    {tag.last_seen && (
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{formatTimestamp(tag.last_seen)}</span>
                      </div>
                    )}
                    
                    {tag.motion_state && (
                      <div className="flex items-center gap-1.5">
                        <Activity className="w-3.5 h-3.5" />
                        <span className="capitalize">{tag.motion_state}</span>
                      </div>
                    )}

                    {tag.position_ref && (
                      <div className="text-xs text-blue-600 mt-1">
                        Near: {tag.position_ref.slice(-8)}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </ScrollArea>
  );
};

export default AssetTable;