import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

/**
 * Floating tooltip rendered via portal - escapes all overflow clipping
 */
export default function FloatingTooltip({ targetRef, show, children }) {
  const [position, setPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (show && targetRef.current) {
      const rect = targetRef.current.getBoundingClientRect();
      // Position above the element, centered horizontally
      setPosition({
        top: rect.top - 8, // 8px gap above the element
        left: rect.left + rect.width / 2,
      });
    }
  }, [show, targetRef]);

  if (!show) return null;

  return createPortal(
    <div
      className="fixed px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl
                 pointer-events-none whitespace-nowrap"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
        transform: 'translate(-50%, -100%)',
        zIndex: 99999,
      }}
    >
      {children}
      <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1">
        <div className="border-4 border-transparent border-t-gray-200 dark:border-t-gray-700"></div>
      </div>
    </div>,
    document.body
  );
}
