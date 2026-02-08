import React, { useState } from 'react';
import { formatNumber } from '../../parquetParser.js';
import { findSchemaElement } from '../../statsFormatter.js';
import { ChevronIcon } from './Icons.jsx';
import ColumnBox from './ColumnBox.jsx';
import RowGroupColumnsView from './RowGroupColumnsView.jsx';

/**
 * Row group box - collapsible container for a single row group
 */
export default function RowGroupBox({ rowGroup, index, pageIndexes, viewMode, schema }) {
  // Only expand first row group by default
  const [expanded, setExpanded] = useState(index === 0);
  const numRows = Number(rowGroup.num_rows);
  const totalBytes = Number(rowGroup.total_byte_size);
  const compressedBytes = rowGroup.total_compressed_size
    ? Number(rowGroup.total_compressed_size)
    : totalBytes;
  const numColumns = rowGroup.columns.length;

  return (
    <div
      className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-700/40 rounded-xl
                    shadow-md dark:shadow-lg shadow-blue-200/50 dark:shadow-blue-900/20 overflow-visible"
    >
      {/* Row Group Header */}
      <div
        className="px-4 py-3 bg-gradient-to-r from-blue-100 dark:from-blue-900/50 to-blue-50 dark:to-blue-800/30
                   border-b border-blue-200 dark:border-blue-700/40 cursor-pointer
                   hover:from-blue-200 dark:hover:from-blue-900/60 hover:to-blue-100 dark:hover:to-blue-800/40 transition-all"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ChevronIcon className="w-4 h-4 text-blue-500 dark:text-blue-400" expanded={expanded} />
            <h3 className="text-blue-800 dark:text-blue-100 font-semibold">Row Group {index}</h3>
          </div>
          <div className="flex items-center gap-3">
            <span className="px-2 py-1 bg-blue-200 dark:bg-blue-800/50 rounded-md text-blue-700 dark:text-blue-200 text-sm">
              {formatNumber(compressedBytes)} B
            </span>
          </div>
        </div>
        <div className="flex items-center gap-6 mt-2 ml-7 text-sm text-blue-600/80 dark:text-blue-400/80">
          <div className="flex items-center gap-1.5">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M4 6h16M4 10h16M4 14h16M4 18h16"
              />
            </svg>
            <span>
              {formatNumber(numRows)} row{numRows === 1 ? '' : 's'}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7"
              />
            </svg>
            <span>
              {numColumns} column{numColumns === 1 ? '' : 's'}
            </span>
          </div>
        </div>
      </div>

      {/* Rows Mode - current column chunk layout */}
      {expanded && viewMode === 'rows' && (
        <div className="p-4 space-y-2 overflow-visible">
          {rowGroup.columns.map((col, colIdx) => {
            const schemaElem = col.meta_data
              ? findSchemaElement(schema, col.meta_data.path_in_schema)
              : null;
            return (
              <ColumnBox
                key={colIdx}
                column={col}
                pageIndex={pageIndexes?.[colIdx]}
                rowGroupRows={numRows}
                schemaElement={schemaElem}
              />
            );
          })}
        </div>
      )}

      {/* Columns Mode - vertical column strips */}
      {expanded && viewMode === 'columns' && (
        <RowGroupColumnsView
          rowGroup={rowGroup}
          pageIndexes={pageIndexes}
          numRows={numRows}
          schema={schema}
        />
      )}
    </div>
  );
}
