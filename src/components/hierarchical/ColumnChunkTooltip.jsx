import React from 'react';
import { formatNumber } from '../../parquetParser.js';

/**
 * Tooltip for column chunk metadata - shows index and dictionary page info
 */
export default function ColumnChunkTooltip({ column }) {
  const meta = column.meta_data;
  if (!meta) return null;

  const hasOffsetIndex = column.offset_index_offset != null;
  const hasColumnIndex = column.column_index_offset != null;
  const hasDictionaryPage = meta.dictionary_page_offset != null;

  // Calculate dictionary page size (dict page is stored before data pages)
  const dictionaryPageSize = hasDictionaryPage
    ? Number(meta.data_page_offset) - Number(meta.dictionary_page_offset)
    : null;

  // Don't show tooltip if there's nothing to display
  if (!hasOffsetIndex && !hasColumnIndex && !hasDictionaryPage) {
    return null;
  }

  return (
    <div className="text-xs space-y-2">
      {hasOffsetIndex && (
        <div>
          <div className="text-green-600 dark:text-green-400 font-medium mb-1 flex items-center gap-1.5">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>
            Offset Index
          </div>
          <div className="ml-[18px] space-y-0.5">
            <div className="text-gray-500 dark:text-gray-400">
              Offset: <span className="text-gray-900 dark:text-white font-mono">{formatNumber(Number(column.offset_index_offset))}</span>
            </div>
            <div className="text-gray-500 dark:text-gray-400">
              Size: <span className="text-gray-900 dark:text-white font-mono">{formatNumber(column.offset_index_length)} B</span>
            </div>
          </div>
        </div>
      )}

      {hasColumnIndex && (
        <div>
          {hasOffsetIndex && (
            <div className="border-t border-gray-200 dark:border-gray-700 mb-2"></div>
          )}
          <div className="text-blue-600 dark:text-blue-400 font-medium mb-1 flex items-center gap-1.5">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Column Index
          </div>
          <div className="ml-[18px] space-y-0.5">
            <div className="text-gray-500 dark:text-gray-400">
              Offset: <span className="text-gray-900 dark:text-white font-mono">{formatNumber(Number(column.column_index_offset))}</span>
            </div>
            <div className="text-gray-500 dark:text-gray-400">
              Size: <span className="text-gray-900 dark:text-white font-mono">{formatNumber(column.column_index_length)} B</span>
            </div>
          </div>
        </div>
      )}

      {hasDictionaryPage && (
        <div>
          {(hasOffsetIndex || hasColumnIndex) && (
            <div className="border-t border-gray-200 dark:border-gray-700 mb-2"></div>
          )}
          <div className="text-amber-600 dark:text-amber-400 font-medium mb-1 flex items-center gap-1.5">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            Dictionary Page
          </div>
          <div className="ml-[18px] space-y-0.5">
            <div className="text-gray-500 dark:text-gray-400">
              Offset: <span className="text-gray-900 dark:text-white font-mono">{formatNumber(Number(meta.dictionary_page_offset))}</span>
            </div>
            {dictionaryPageSize !== null && dictionaryPageSize > 0 && (
              <div className="text-gray-500 dark:text-gray-400">
                Size: <span className="text-gray-900 dark:text-white font-mono">{formatNumber(dictionaryPageSize)} B</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
