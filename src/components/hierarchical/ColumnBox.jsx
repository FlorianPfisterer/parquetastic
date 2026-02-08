import React, { useState } from 'react';
import { formatBytes, formatNumber, EnumHelpers } from '../../parquetParser.js';
import { ChevronIcon } from './Icons.jsx';
import {
  getShortEncodingName,
  getPrimaryEncodings,
  formatEncodingStats,
} from './encodingUtils.js';
import PageBox from './PageBox.jsx';

/**
 * Column box for rows view - shows column metadata and expandable pages
 */
export default function ColumnBox({ column, pageIndex, rowGroupRows, schemaElement }) {
  const meta = column.meta_data;
  const offsetIndex = pageIndex?.offsetIndex;
  const colIndex = pageIndex?.columnIndex;
  const pages = offsetIndex?.page_locations || [];

  // Auto-expand if column has offset index (pages available)
  const hasPages = pages.length > 0;
  const [expanded, setExpanded] = useState(hasPages);

  if (!meta) return null;

  const columnName = meta.path_in_schema[meta.path_in_schema.length - 1];
  const fullPath = meta.path_in_schema.join('.');
  const compressedSize = Number(meta.total_compressed_size);
  const uncompressedSize = Number(meta.total_uncompressed_size);
  const compressionCodec = EnumHelpers.getCompressionName(meta.codec);
  const dataType = EnumHelpers.getTypeName(meta.type);
  const compressionRatio = uncompressedSize > 0 ? compressedSize / uncompressedSize : 1;
  const hasBloomFilter = meta.bloom_filter_offset != null;

  // Get encodings
  const primaryEncodings = getPrimaryEncodings(meta.encodings, meta.encoding_stats);
  const encodingStatsFormatted = formatEncodingStats(meta.encoding_stats);

  // Get statistics if available
  const stats = meta.statistics;
  const nullCount = stats?.null_count != null ? Number(stats.null_count) : null;

  // Prepare page data with next row info for calculating row counts
  const pagesWithNext = pages.map((page, i) => ({
    ...page,
    nextFirstRow: pages[i + 1] ? Number(pages[i + 1].first_row_index) : null,
  }));

  return (
    <div
      className="bg-cyan-50 dark:bg-cyan-950/30 border border-cyan-200 dark:border-cyan-800/40 rounded-lg overflow-visible
                    hover:border-cyan-300 dark:hover:border-cyan-700/60 transition-all"
    >
      {/* Column Header */}
      <div
        className={`px-3 py-2 bg-cyan-100/50 dark:bg-cyan-900/30 border-b border-cyan-200 dark:border-cyan-800/30
                   hover:bg-cyan-100 dark:hover:bg-cyan-900/50 transition-colors
                   ${hasPages ? 'cursor-pointer' : 'cursor-default'}`}
        onClick={() => hasPages && setExpanded(!expanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {hasPages ? (
              <ChevronIcon className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-500" expanded={expanded} />
            ) : (
              <div className="w-3.5 h-3.5"></div>
            )}
            <span className="text-cyan-700 dark:text-cyan-200 font-medium text-sm" title={fullPath}>
              {columnName}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-cyan-600/60 dark:text-cyan-400/60 text-xs">{dataType}</span>
            <span className="px-1.5 py-0.5 bg-cyan-200 dark:bg-cyan-800/40 rounded text-cyan-700 dark:text-cyan-300 text-xs">
              {compressionCodec}
            </span>
            {primaryEncodings.map((enc, i) => (
              <span
                key={i}
                className="px-1.5 py-0.5 bg-indigo-200 dark:bg-indigo-800/40 rounded text-indigo-700 dark:text-indigo-300 text-xs"
              >
                {getShortEncodingName(enc)}
              </span>
            ))}
          </div>
        </div>
        <div className="flex items-center flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-cyan-600/70 dark:text-cyan-500/70">
          <span>{formatBytes(compressedSize)}</span>
          {compressionRatio < 0.99 && (
            <span className="text-emerald-600/70 dark:text-emerald-400/70">
              {(compressionRatio * 100).toFixed(1)}% compressed
            </span>
          )}
          {compressionRatio > 1.0 && (
            <span className="text-red-600/70 dark:text-red-400/70">
              {(compressionRatio * 100).toFixed(1)}% (expanded)
            </span>
          )}
          <span>
            {formatNumber(Number(meta.num_values))} value
            {Number(meta.num_values) === 1 ? '' : 's'}
          </span>
          {nullCount !== null && nullCount > 0 && (
            <span className="text-orange-600/70 dark:text-orange-400/70">
              {formatNumber(nullCount)} null{nullCount === 1 ? '' : 's'}
            </span>
          )}
          {hasBloomFilter && (
            <span className="text-purple-600/70 dark:text-purple-400/70" title="Bloom filter present">
              BF
            </span>
          )}
          {pages.length > 0 && (
            <span>
              {pages.length} page{pages.length === 1 ? '' : 's'}
              {meta.dictionary_page_offset != null && ' + dictionary'}
            </span>
          )}
        </div>
      </div>

      {/* Pages Grid */}
      {expanded && pages.length > 0 && (
        <div className="p-3 bg-cyan-50/50 dark:bg-cyan-950/20 overflow-visible">
          {/* Encoding breakdown */}
          {encodingStatsFormatted && encodingStatsFormatted.length > 0 && (
            <div className="mb-2 pb-2 border-b border-cyan-200 dark:border-cyan-800/30 text-[10px] text-cyan-600/80 dark:text-cyan-500/80">
              <span className="text-cyan-500 dark:text-cyan-400/60 mr-2">Encodings:</span>
              {encodingStatsFormatted.map((stat, i) => (
                <span key={i} className="mr-2">
                  <span className="text-indigo-600/80 dark:text-indigo-400/80">{stat.count}</span>{' '}
                  <span className="text-cyan-600/60 dark:text-cyan-500/60">
                    {stat.pageType.replace('_', ' ').toLowerCase()}
                  </span>{' '}
                  <span className="text-indigo-700/80 dark:text-indigo-300/80">({stat.encoding})</span>
                </span>
              ))}
            </div>
          )}
          <div className="flex flex-wrap gap-1.5 overflow-visible">
            {pagesWithNext.map((page, i) => (
              <PageBox
                key={i}
                page={page}
                index={i}
                isLast={i === pages.length - 1}
                rowGroupRows={rowGroupRows}
                columnIndex={colIndex}
                columnMeta={meta}
                schemaElement={schemaElement}
              />
            ))}
          </div>
        </div>
      )}

      {/* No pages message */}
      {expanded && pages.length === 0 && (
        <div className="p-3 text-xs text-cyan-500 dark:text-cyan-600/50 italic">No page index available</div>
      )}
    </div>
  );
}
