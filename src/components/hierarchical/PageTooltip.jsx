import React from 'react';
import { formatBytes, formatNumber } from '../../parquetParser.js';
import { formatStatValue } from '../../statsFormatter.js';

/**
 * Shared page tooltip component - used by both PageBox and PageBlockColumn
 */
export default function PageTooltip({
  page,
  index,
  firstRow,
  rowCount,
  columnIndex,
  columnMeta,
  schemaElement,
}) {
  const hasStats =
    columnIndex &&
    columnIndex.min_values &&
    columnIndex.max_values &&
    index < columnIndex.min_values.length;

  const minValue = hasStats
    ? formatStatValue(columnIndex.min_values[index], columnMeta, schemaElement)
    : null;
  const maxValue = hasStats
    ? formatStatValue(columnIndex.max_values[index], columnMeta, schemaElement)
    : null;
  const nullCount = columnIndex?.null_counts?.[index]
    ? Number(columnIndex.null_counts[index])
    : null;
  const isNullPage = columnIndex?.null_pages?.[index] || false;

  return (
    <div className="text-xs space-y-1">
      <div className="text-gray-500 dark:text-gray-400">
        Offset: <span className="text-gray-900 dark:text-white font-mono">{formatNumber(Number(page.offset))}</span>
      </div>
      <div className="text-gray-500 dark:text-gray-400">
        Size: <span className="text-gray-900 dark:text-white">{formatBytes(page.compressed_page_size)}</span>
      </div>
      <div className="text-gray-500 dark:text-gray-400">
        First Row: <span className="text-gray-900 dark:text-white font-mono">{formatNumber(firstRow)}</span>
      </div>
      {rowCount !== null && (
        <div className="text-gray-500 dark:text-gray-400">
          Row{rowCount === 1 ? '' : 's'}:{' '}
          <span className="text-gray-900 dark:text-white">{formatNumber(rowCount)}</span>
        </div>
      )}
      {hasStats && (
        <>
          <div className="border-t border-gray-200 dark:border-gray-700 my-1"></div>
          {isNullPage ? (
            <div className="text-orange-600 dark:text-orange-400 text-[10px]">All-null page</div>
          ) : (
            <>
              <div className="text-gray-500 dark:text-gray-400">
                Min: <span className="text-gray-900 dark:text-white font-mono">{minValue}</span>
              </div>
              <div className="text-gray-500 dark:text-gray-400">
                Max: <span className="text-gray-900 dark:text-white font-mono">{maxValue}</span>
              </div>
              {nullCount !== null && (
                <div className="text-gray-500 dark:text-gray-400">
                  Null{nullCount === 1 ? '' : 's'}:{' '}
                  <span className="text-gray-900 dark:text-white">{formatNumber(nullCount)}</span>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
