import React, { useRef, useEffect, useState } from 'react';
import { Badge } from './ui/badge';

const FloorPlanCanvas = ({ floorPlan, tags, onTagClick }) => {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [hoveredTag, setHoveredTag] = useState(null);

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const width = containerRef.current.clientWidth;
        const height = Math.min(600, width * 0.75);
        setDimensions({ width, height });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const { width, height } = dimensions;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Draw background
    ctx.fillStyle = '#F8FAFC';
    ctx.fillRect(0, 0, width, height);

    // Draw grid
    ctx.strokeStyle = '#E2E8F0';
    ctx.lineWidth = 1;
    const gridSize = 50;
    for (let x = 0; x <= width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y <= height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Draw floor plan image if available
    if (floorPlan?.image) {
      const img = new Image();
      img.onload = () => {
        ctx.globalAlpha = 0.7;
        ctx.drawImage(img, 0, 0, width, height);
        ctx.globalAlpha = 1.0;
        drawAnchorsAndTags();
      };
      img.src = floorPlan.image;
    } else {
      drawAnchorsAndTags();
    }

    function drawAnchorsAndTags() {
      // Draw anchors
      if (floorPlan?.anchors) {
        floorPlan.anchors.forEach(anchor => {
          const x = (anchor.x / floorPlan.width) * width;
          const y = (anchor.y / floorPlan.height) * height;

          // Draw anchor
          ctx.fillStyle = anchor.status === 'online' ? '#10B981' : '#6B7280';
          ctx.beginPath();
          ctx.arc(x, y, 8, 0, 2 * Math.PI);
          ctx.fill();
          
          // Draw anchor border
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2;
          ctx.stroke();

          // Draw anchor label
          ctx.fillStyle = '#1E293B';
          ctx.font = 'bold 11px Inter';
          ctx.fillText(anchor.name || anchor.device_id.slice(-6), x + 12, y + 4);
        });
      }

      // Draw tags
      tags.forEach(tag => {
        if (tag.x !== null && tag.y !== null) {
          const x = (tag.x / (floorPlan?.width || 800)) * width;
          const y = (tag.y / (floorPlan?.height || 600)) * height;

          // Determine color based on status
          const isOnline = tag.status === 'online';
          const color = isOnline ? '#006CDD' : '#94A3B8';

          // Draw tag pulse effect for online tags
          if (isOnline) {
            ctx.fillStyle = color;
            ctx.globalAlpha = 0.2;
            ctx.beginPath();
            ctx.arc(x, y, 20, 0, 2 * Math.PI);
            ctx.fill();
            ctx.globalAlpha = 1.0;
          }

          // Draw tag
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.arc(x, y, 10, 0, 2 * Math.PI);
          ctx.fill();

          // Draw tag border
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2;
          ctx.stroke();

          // Draw tag ID
          ctx.fillStyle = '#1E293B';
          ctx.font = '10px Inter';
          ctx.fillText(tag.device_id.slice(-6), x + 14, y - 8);
        }
      });
    }
  }, [floorPlan, tags, dimensions]);

  const handleCanvasClick = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const { width, height } = dimensions;

    // Check if clicked on a tag
    tags.forEach(tag => {
      if (tag.x !== null && tag.y !== null) {
        const tagX = (tag.x / (floorPlan?.width || 800)) * width;
        const tagY = (tag.y / (floorPlan?.height || 600)) * height;
        const distance = Math.sqrt(Math.pow(x - tagX, 2) + Math.pow(y - tagY, 2));
        
        if (distance < 15) {
          onTagClick(tag);
        }
      }
    });
  };

  const handleCanvasMouseMove = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const { width, height } = dimensions;

    // Check if hovering over a tag
    let found = null;
    tags.forEach(tag => {
      if (tag.x !== null && tag.y !== null) {
        const tagX = (tag.x / (floorPlan?.width || 800)) * width;
        const tagY = (tag.y / (floorPlan?.height || 600)) * height;
        const distance = Math.sqrt(Math.pow(x - tagX, 2) + Math.pow(y - tagY, 2));
        
        if (distance < 15) {
          found = tag;
        }
      }
    });

    setHoveredTag(found);
    canvas.style.cursor = found ? 'pointer' : 'default';
  };

  return (
    <div ref={containerRef} className="relative w-full" data-testid="floor-plan-canvas">
      <canvas
        ref={canvasRef}
        width={dimensions.width}
        height={dimensions.height}
        onClick={handleCanvasClick}
        onMouseMove={handleCanvasMouseMove}
        className="border border-gray-300 rounded-lg shadow-sm bg-white w-full"
      />
      
      {/* Legend */}
      <div className="mt-4 flex items-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-[#006CDD] border-2 border-white"></div>
          <span className="text-gray-700">Active Tag</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-gray-400 border-2 border-white"></div>
          <span className="text-gray-700">Offline Tag</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-green-500 border-2 border-white"></div>
          <span className="text-gray-700">Anchor (Online)</span>
        </div>
      </div>

      {/* Hover tooltip */}
      {hoveredTag && (
        <div className="absolute bottom-4 left-4 bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-sm">
          <div className="font-semibold text-gray-900">{hoveredTag.device_id}</div>
          <div className="text-gray-600 mt-1">
            <Badge variant={hoveredTag.status === 'online' ? 'success' : 'secondary'}>
              {hoveredTag.status}
            </Badge>
          </div>
        </div>
      )}
    </div>
  );
};

export default FloorPlanCanvas;