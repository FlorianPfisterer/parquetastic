import React from 'react';
import { formatBytes, formatNumber, EnumHelpers } from '../../parquetParser.js';
import { getShortEncodingName, getPrimaryEncodings } from './encodingUtils.js';

/**
 * Column header component for columns view
 */
export default function ColumnHeader({ column, pageIndex, columnWidth }) {
  const meta = column.meta_data;
  const pages = pageIndex?.offsetIndex?.page_locations || [];

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

  // Get statistics if available
  const stats = meta.statistics;
  const nullCount = stats?.null_count != null ? Number(stats.null_count) : null;

  return (
    <div
      className="flex-shrink-0"
      style={{ width: `${columnWidth}px`, minWidth: `${columnWidth}px`, maxWidth: `${columnWidth}px` }}
    >
      <div className="bg-cyan-50 dark:bg-cyan-950/30 border border-cyan-200 dark:border-cyan-800/40 rounded-lg overflow-hidden">
        <div className="px-2 py-2 bg-cyan-100/50 dark:bg-cyan-900/30">
          <div className="flex items-center justify-between gap-1">
            <span className="text-cyan-700 dark:text-cyan-200 font-medium text-xs truncate" title={fullPath}>
              {columnName}
            </span>
            <div className="flex items-center gap-1 flex-shrink-0">
              <span className="px-1 py-0.5 bg-cyan-200 dark:bg-cyan-800/40 rounded text-cyan-700 dark:text-cyan-300 text-[10px]">
                {compressionCodec}
              </span>
              {primaryEncodings.slice(0, 2).map((enc, i) => (
                <span
                  key={i}
                  className="px-1 py-0.5 bg-indigo-200 dark:bg-indigo-800/40 rounded text-indigo-700 dark:text-indigo-300 text-[10px]"
                >
                  {getShortEncodingName(enc)}
                </span>
              ))}
              {primaryEncodings.length > 2 && (
                <span className="px-1 py-0.5 bg-indigo-200 dark:bg-indigo-800/40 rounded text-indigo-700 dark:text-indigo-300 text-[10px]">
                  +{primaryEncodings.length - 2}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 mt-1">
            <span className="text-cyan-600/60 dark:text-cyan-400/60 text-[10px]">{dataType}</span>
          </div>
          <div className="flex items-center gap-x-2 mt-1 text-[10px] text-cyan-600/70 dark:text-cyan-500/70">
            <span>{formatBytes(compressedSize)}</span>
            {compressionRatio < 0.99 && (
              <span className="text-emerald-600/70 dark:text-emerald-400/70">{(compressionRatio * 100).toFixed(0)}%</span>
            )}
            {compressionRatio > 1.0 && (
              <span className="text-red-600/70 dark:text-red-400/70">{(compressionRatio * 100).toFixed(0)}%</span>
            )}
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
          </div>
          <div className="flex items-center gap-x-2 mt-0.5 text-[10px] text-cyan-600/70 dark:text-cyan-500/70">
            <span>
              {pages.length} page{pages.length === 1 ? '' : 's'}
              {meta.dictionary_page_offset != null && ' + dictionary'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
