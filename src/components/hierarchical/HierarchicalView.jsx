import React, { useState, useMemo } from 'react';
import { formatNumber } from '../../parquetParser.js';
import { RowsIcon, ColumnsIcon } from './Icons.jsx';
import RowGroupBox from './RowGroupBox.jsx';

/**
 * HierarchicalView - main component for visualizing Parquet file structure
 */
export default function HierarchicalView({ data }) {
  const { fileMetaData, pageIndexes } = data;
  const numRows = Number(fileMetaData.num_rows);
  const numRowGroups = fileMetaData.row_groups.length;
  const numColumns = fileMetaData.schema.length - 1;

  // Check if page index is available (needed for columns view)
  const hasPageIndex = useMemo(() => {
    if (!pageIndexes || pageIndexes.length === 0) return false;
    return pageIndexes.some(
      (rg) => rg && rg.some((col) => col?.offsetIndex?.page_locations?.length > 0)
    );
  }, [pageIndexes]);

  // View mode: 'rows' (horizontal layout) or 'columns' (vertical column strips)
  // Default to 'columns' if page index available, otherwise 'rows'
  const [viewMode, setViewMode] = useState(hasPageIndex ? 'columns' : 'rows');

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-lg dark:shadow-2xl overflow-visible">
      {/* File Header */}
      <div
        className="px-5 py-4 bg-gradient-to-r from-gray-50 dark:from-gray-800 via-white dark:via-gray-750 to-gray-50 dark:to-gray-800
                      border-b border-gray-200 dark:border-gray-700"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <svg
              className="w-5 h-5 text-purple-500 dark:text-purple-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            File Structure
          </h2>

          {/* View Mode Toggle - only show if page index is available */}
          {hasPageIndex && (
            <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-900/50 rounded-lg p-1">
              <button
                onClick={() => setViewMode('rows')}
                className={`p-1.5 rounded transition-all ${
                  viewMode === 'rows'
                    ? 'bg-purple-600 text-white'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700/50'
                }`}
                title="Rows view - column chunks as horizontal rows"
              >
                <RowsIcon className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('columns')}
                className={`p-1.5 rounded transition-all ${
                  viewMode === 'columns'
                    ? 'bg-purple-600 text-white'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700/50'
                }`}
                title="Columns view - visualize page alignment across columns"
              >
                <ColumnsIcon className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* File Stats */}
        <div className="flex items-center gap-6 mt-3 text-sm">
          <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
            <div className="w-2 h-2 rounded-full bg-purple-500"></div>
            <span>
              {formatNumber(numRows)} row{numRows === 1 ? '' : 's'} in total
            </span>
          </div>
          <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
            <div className="w-2 h-2 rounded-full bg-blue-500"></div>
            <span>
              {numRowGroups} row group{numRowGroups === 1 ? '' : 's'}
            </span>
          </div>
          <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
            <div className="w-2 h-2 rounded-full bg-cyan-500"></div>
            <span>
              {numColumns} column{numColumns === 1 ? '' : 's'}
            </span>
          </div>
        </div>
      </div>

      {/* Row Groups Container */}
      <div className="p-5 space-y-4 bg-gradient-to-b from-gray-50/50 dark:from-gray-800/50 to-gray-100/50 dark:to-gray-900/50 overflow-visible">
        {fileMetaData.row_groups.map((rg, rgIdx) => (
          <RowGroupBox
            key={rgIdx}
            rowGroup={rg}
            index={rgIdx}
            pageIndexes={pageIndexes[rgIdx]}
            viewMode={viewMode}
            schema={fileMetaData.schema}
          />
        ))}
      </div>

      {/* Legend */}
      <div className="px-5 py-3 bg-gray-100/50 dark:bg-gray-900/50 border-t border-gray-200/50 dark:border-gray-700/50">
        <div className="flex items-center gap-6 text-xs text-gray-500">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-blue-100 dark:bg-blue-900/50 border border-blue-300 dark:border-blue-700/50"></div>
            <span>Row Group</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-cyan-100 dark:bg-cyan-950/50 border border-cyan-300 dark:border-cyan-800/50"></div>
            <span>Column Chunk</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-emerald-100 dark:bg-emerald-900/50 border border-emerald-300 dark:border-emerald-700/50"></div>
            <span>Data Page</span>
          </div>
        </div>
      </div>
    </div>
  );
}
