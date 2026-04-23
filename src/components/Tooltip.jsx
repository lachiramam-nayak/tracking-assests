import React from 'react';

export const Tooltip = ({ children, content, visible, position }) => {
  if (!visible || !content) return children;

  return (
    <div className="relative inline-block">
      {children}
      <div 
        className="absolute z-50 px-3 py-2 text-sm text-white bg-gray-900 rounded-lg shadow-lg whitespace-nowrap"
        style={{
          left: position?.x || '50%',
          top: position?.y ? position.y + 10 : 'calc(100% + 8px)',
          transform: 'translateX(-50%)',
          pointerEvents: 'none'
        }}
      >
        {content}
        <div className="absolute w-2 h-2 bg-gray-900 transform rotate-45 -top-1 left-1/2 -translate-x-1/2"></div>
      </div>
    </div>
  );
};
