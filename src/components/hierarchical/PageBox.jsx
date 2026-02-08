import React from 'react';
import { formatBytes, formatNumber } from '../../parquetParser.js';
import PageTooltip from './PageTooltip.jsx';

/**
 * Page box for rows view - shows a single page with hover tooltip
 */
export default function PageBox({
  page,
  index,
  isLast,
  rowGroupRows,
  columnIndex,
  columnMeta,
  schemaElement,
}) {
  // Calculate rows in this page
  const firstRow = Number(page.first_row_index);
  const nextFirstRow = isLast ? rowGroupRows : page.nextFirstRow;
  const rowCount = nextFirstRow !== null ? nextFirstRow - firstRow : null;
  const isNullPage = columnIndex?.null_pages?.[index] || false;

  const baseClasses = isNullPage
    ? 'bg-orange-100 dark:bg-orange-900/40 border border-orange-300 dark:border-orange-700/50 hover:bg-orange-200 dark:hover:bg-orange-800/50 hover:border-orange-400 dark:hover:border-orange-600'
    : 'bg-emerald-100 dark:bg-emerald-900/40 border border-emerald-300 dark:border-emerald-700/50 hover:bg-emerald-200 dark:hover:bg-emerald-800/50 hover:border-emerald-400 dark:hover:border-emerald-600';

  const textColor = isNullPage ? 'text-orange-700 dark:text-orange-300' : 'text-emerald-700 dark:text-emerald-300';
  const textColorMuted = isNullPage ? 'text-orange-600/70 dark:text-orange-400/70' : 'text-emerald-600/70 dark:text-emerald-400/70';
  const textColorDim = isNullPage ? 'text-orange-600/60 dark:text-orange-500/60' : 'text-emerald-600/60 dark:text-emerald-500/60';

  return (
    <div className="group/page relative">
      <div className={`rounded px-2 py-1.5 transition-all cursor-default ${baseClasses}`}>
        <div className="flex items-center justify-between gap-3">
          <span className={`text-xs font-medium ${textColor}`}>P{index}</span>
          <span className={`text-xs ${textColorMuted}`}>
            {formatBytes(page.compressed_page_size)}
          </span>
        </div>
        {rowCount !== null && (
          <div className={`text-[10px] mt-0.5 ${textColorDim}`}>
            {formatNumber(rowCount)} row{rowCount === 1 ? '' : 's'}
          </div>
        )}
      </div>

      {/* Hover Tooltip */}
      <div
        className="absolute left-1/2 bottom-full -translate-x-1/2 mb-2 px-3 py-2 bg-white dark:bg-gray-900
                      border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl opacity-0 group-hover/page:opacity-100
                      transition-opacity pointer-events-none z-[200] whitespace-nowrap"
      >
        <PageTooltip
          page={page}
          index={index}
          firstRow={firstRow}
          rowCount={rowCount}
          columnIndex={columnIndex}
          columnMeta={columnMeta}
          schemaElement={schemaElement}
        />
        <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1">
          <div className="border-4 border-transparent border-t-gray-200 dark:border-t-gray-700"></div>
        </div>
      </div>
    </div>
  );
}
