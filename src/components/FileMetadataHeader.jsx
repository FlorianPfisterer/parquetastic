import { useState } from 'react';
import { formatNumber } from '../parquetParser.js';

function FileMetadataHeader({ fileName, data }) {
  const { fileSize, footerLength, fileMetaData, pageIndexes } = data;
  const [copied, setCopied] = useState(false);

  // Count total pages across all row groups
  const totalPages = pageIndexes.reduce((sum, rgIndexes) => {
    return sum + rgIndexes.reduce((rgSum, colIndex) => {
      return rgSum + (colIndex.offsetIndex?.page_locations?.length || 0);
    }, 0);
  }, 0);

  // Calculate total page index size
  let pageIndexSize = 0;
  fileMetaData.row_groups.forEach((rg) => {
    rg.columns.forEach((col) => {
      if (col.column_index_offset && col.column_index_length) {
        pageIndexSize += col.column_index_length;
      }
      if (col.offset_index_offset && col.offset_index_length) {
        pageIndexSize += col.offset_index_length;
      }
    });
  });

  const hasPageIndex = totalPages > 0;
  const numRows = Number(fileMetaData.num_rows);
  const numRowGroups = fileMetaData.row_groups.length;
  const createdBy = fileMetaData.created_by || 'Unknown';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(createdBy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-lg dark:shadow-2xl">
      <div className="px-5 py-4 bg-gradient-to-r from-gray-50 dark:from-gray-800 via-white dark:via-gray-750 to-gray-50 dark:to-gray-800">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <svg className="w-5 h-5 text-blue-500 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            {fileName}
          </h2>
        </div>

        {/* File Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-4">
          {/* File Size */}
          <div className="bg-gray-100/50 dark:bg-gray-900/50 rounded-lg px-3 py-2 border border-gray-200/50 dark:border-gray-700/50">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">File Size</div>
            <div className="text-sm font-semibold text-purple-600 dark:text-purple-300">{formatNumber(fileSize)} B</div>
          </div>

          {/* Total Rows */}
          <div className="bg-gray-100/50 dark:bg-gray-900/50 rounded-lg px-3 py-2 border border-gray-200/50 dark:border-gray-700/50">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total Rows</div>
            <div className="text-sm font-semibold text-blue-600 dark:text-blue-300">{formatNumber(numRows)}</div>
          </div>

          {/* Row Groups */}
          <div className="bg-gray-100/50 dark:bg-gray-900/50 rounded-lg px-3 py-2 border border-gray-200/50 dark:border-gray-700/50">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Row Groups</div>
            <div className="text-sm font-semibold text-cyan-600 dark:text-cyan-300">{numRowGroups}</div>
          </div>

          {/* Footer Size */}
          <div className="bg-gray-100/50 dark:bg-gray-900/50 rounded-lg px-3 py-2 border border-gray-200/50 dark:border-gray-700/50">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Footer Size</div>
            <div className="text-sm font-semibold text-orange-600 dark:text-orange-300">{formatNumber(footerLength)} B</div>
          </div>

          {/* Page Index Size (if page index available) */}
          {hasPageIndex && (
            <div className="bg-gray-100/50 dark:bg-gray-900/50 rounded-lg px-3 py-2 border border-gray-200/50 dark:border-gray-700/50">
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Page Index Size</div>
              <div className="text-sm font-semibold text-green-600 dark:text-green-300">{formatNumber(pageIndexSize)} B</div>
            </div>
          )}

          {/* Total Pages (if page index available) */}
          {hasPageIndex && (
            <div className="bg-gray-100/50 dark:bg-gray-900/50 rounded-lg px-3 py-2 border border-gray-200/50 dark:border-gray-700/50">
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total Pages</div>
              <div className="text-sm font-semibold text-green-600 dark:text-green-300">{formatNumber(totalPages)}</div>
            </div>
          )}

          {/* Written By */}
          <div className="bg-gray-100/50 dark:bg-gray-900/50 rounded-lg px-3 py-2 border border-gray-200/50 dark:border-gray-700/50 col-span-2 md:col-span-1 relative group">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Written By</div>
            <div className="flex items-center gap-2">
              <div className="text-sm font-semibold text-emerald-600 dark:text-emerald-300 truncate flex-1" title={createdBy}>
                {createdBy}
              </div>
              <button
                onClick={handleCopy}
                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-gray-200/50 dark:hover:bg-gray-700/50 rounded"
                title="Copy to clipboard"
              >
                {copied ? (
                  <svg className="w-4 h-4 text-green-500 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                )}
              </button>
            </div>
            {copied && (
              <div className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-green-600 text-white text-xs rounded shadow-lg whitespace-nowrap">
                Copied!
              </div>
            )}
          </div>
        </div>

        {/* Additional metadata */}
        <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-purple-500/70"></div>
            <span>Version {fileMetaData.version}</span>
          </div>
          {hasPageIndex && (
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-green-500/70"></div>
              <span>Page Index Available</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default FileMetadataHeader;
