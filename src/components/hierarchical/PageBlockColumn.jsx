import React, { useState, useRef } from 'react';
import FloatingTooltip from './FloatingTooltip.jsx';
import PageTooltip from './PageTooltip.jsx';

/**
 * Page block for columns view - absolutely positioned based on row index
 */
export default function PageBlockColumn({
  page,
  index,
  rowCount,
  totalRows,
  columnIndex,
  columnMeta,
  schemaElement,
}) {
  const firstRow = Number(page.first_row_index);
  const isNullPage = columnIndex?.null_pages?.[index] || false;
  const [isHovered, setIsHovered] = useState(false);
  const blockRef = useRef(null);

  // Calculate position and height based on row index proportion
  const topPercent = (firstRow / totalRows) * 100;
  const heightPercent = (rowCount / totalRows) * 100;

  const baseClasses = isNullPage
    ? 'bg-orange-100 dark:bg-orange-900/40 border-orange-300 dark:border-orange-700/50 hover:bg-orange-200 dark:hover:bg-orange-800/50 hover:border-orange-400 dark:hover:border-orange-600'
    : 'bg-emerald-100 dark:bg-emerald-900/40 border-emerald-300 dark:border-emerald-700/50 hover:bg-emerald-200 dark:hover:bg-emerald-800/50 hover:border-emerald-400 dark:hover:border-emerald-600';

  const textColor = isNullPage ? 'text-orange-700/80 dark:text-orange-300/80' : 'text-emerald-700/80 dark:text-emerald-300/80';

  return (
    <div
      ref={blockRef}
      className="absolute left-0 right-0"
      style={{
        top: `${topPercent}%`,
        height: `${heightPercent}%`,
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className={`h-full rounded border transition-all cursor-default flex items-center justify-center ${baseClasses}`}
      >
        <span className={`text-[10px] font-medium ${textColor}`}>P{index}</span>
      </div>

      {/* Tooltip rendered via portal to escape overflow clipping */}
      <FloatingTooltip targetRef={blockRef} show={isHovered}>
        <PageTooltip
          page={page}
          index={index}
          firstRow={firstRow}
          rowCount={rowCount}
          columnIndex={columnIndex}
          columnMeta={columnMeta}
          schemaElement={schemaElement}
        />
      </FloatingTooltip>
    </div>
  );
}
