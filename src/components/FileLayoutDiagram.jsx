import { useState, useMemo } from 'react';
import { formatBytes, formatNumber, EnumHelpers } from '../parquetParser.js';
import { formatStatValue, findSchemaElement } from '../statsFormatter.js';

function FileLayoutDiagram({ data }) {
  const { fileSize, footerLength, footerStart, fileMetaData, pageIndexes } = data;
  const [hoveredSection, setHoveredSection] = useState(null);
  const [selectedRowGroup, setSelectedRowGroup] = useState(null);
  const [selectedSection, setSelectedSection] = useState(null);

  const highlightedSection = hoveredSection === null ? selectedSection : hoveredSection;

  // Calculate sections for the file layout
  const sections = useMemo(() => {
    const result = [];

    // Magic header (4 bytes)
    result.push({
      id: 'header',
      type: 'magic',
      label: 'PAR1',
      shortLabel: 'M',
      start: 0,
      end: 4,
      size: 4,
      color: 'bg-purple-600',
    });

    // Row groups
    fileMetaData.row_groups.forEach((rg, rgIdx) => {
      const columns = rg.columns;
      let rgStart = Infinity;
      let rgEnd = 0;

      // Find the extent of this row group
      columns.forEach((col) => {
        if (col.meta_data) {
          const dictOffset = col.meta_data.dictionary_page_offset
            ? Number(col.meta_data.dictionary_page_offset)
            : null;
          const dataOffset = Number(col.meta_data.data_page_offset);
          const size = Number(col.meta_data.total_compressed_size);

          const start = dictOffset ? Math.min(dictOffset, dataOffset) : dataOffset;
          const end = start + size;

          rgStart = Math.min(rgStart, start);
          rgEnd = Math.max(rgEnd, end);
        }
      });

      if (rgStart !== Infinity) {
        result.push({
          id: `rg-${rgIdx}`,
          type: 'rowgroup',
          label: `Row Group ${rgIdx}`,
          shortLabel: `RG ${rgIdx}`,
          start: rgStart,
          end: rgEnd,
          size: rgEnd - rgStart,
          rowGroup: rg,
          rgIndex: rgIdx,
          numRows: Number(rg.num_rows),
          numColumns: columns.length,
          color: rgIdx % 2 === 0 ? 'bg-blue-600' : 'bg-blue-500',
          columns: columns,
          pageIndexes: pageIndexes[rgIdx],
        });
      }
    });

    // Page indexes (column index + offset index)
    let indexStart = Infinity;
    let indexEnd = 0;

    fileMetaData.row_groups.forEach((rg) => {
      rg.columns.forEach((col) => {
        if (col.column_index_offset) {
          const offset = Number(col.column_index_offset);
          const length = col.column_index_length || 0;
          indexStart = Math.min(indexStart, offset);
          indexEnd = Math.max(indexEnd, offset + length);
        }
        if (col.offset_index_offset) {
          const offset = Number(col.offset_index_offset);
          const length = col.offset_index_length || 0;
          indexStart = Math.min(indexStart, offset);
          indexEnd = Math.max(indexEnd, offset + length);
        }
      });
    });

    if (indexStart !== Infinity) {
      result.push({
        id: 'page-index',
        type: 'index',
        label: 'Page Index',
        shortLabel: 'Page Idx',
        start: indexStart,
        end: indexEnd,
        size: indexEnd - indexStart,
        color: 'bg-green-600',
      });
    }

    // Footer metadata
    result.push({
      id: 'footer',
      type: 'footer',
      label: 'Footer',
      shortLabel: 'Footer',
      start: footerStart,
      end: footerStart + footerLength,
      size: footerLength,
      color: 'bg-orange-600',
    });

    // Footer length (4 bytes)
    result.push({
      id: 'footer-length',
      type: 'footer-length',
      label: 'Len',
      shortLabel: 'L',
      start: fileSize - 8,
      end: fileSize - 4,
      size: 4,
      color: 'bg-orange-500',
    });

    // Magic footer (4 bytes)
    result.push({
      id: 'footer-magic',
      type: 'magic',
      label: 'PAR1',
      shortLabel: 'M',
      start: fileSize - 4,
      end: fileSize,
      size: 4,
      color: 'bg-purple-600',
    });

    // Sort by start position
    result.sort((a, b) => a.start - b.start);

    return result;
  }, [fileMetaData, footerStart, footerLength, fileSize, pageIndexes]);

  // Get color class based on section type
  const getColorClass = (section, isHovered) => {
    const base = section.color;
    if (isHovered) {
      return base.replace('600', '400').replace('500', '400');
    }
    return base;
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-lg dark:shadow-2xl">
      <div className="px-5 py-4 bg-gradient-to-r from-gray-50 dark:from-gray-800 via-white dark:via-gray-750 to-gray-50 dark:to-gray-800
                      border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-3">
          <svg className="w-5 h-5 text-orange-500 dark:text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
          </svg>
          File Byte Layout
        </h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 ml-8">
          Physical structure of the file (roughly to scale) - click row groups to view column details
        </p>
      </div>

      <div className="p-4">
        {/* Legend */}
        <div className="flex flex-wrap gap-4 mb-4 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-purple-600 rounded"></div>
            <span className="text-gray-500 dark:text-gray-400">Magic Bytes</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-600 rounded"></div>
            <span className="text-gray-500 dark:text-gray-400">Row Groups</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-600 rounded"></div>
            <span className="text-gray-500 dark:text-gray-400">Page Index</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-orange-600 rounded"></div>
            <span className="text-gray-500 dark:text-gray-400">Footer</span>
          </div>
        </div>

        {/* File layout bar */}
        <div className="relative h-12 bg-gray-200 dark:bg-gray-900 rounded-lg overflow-hidden">
          <div className="h-full flex">
            {(() => {
              // Calculate true proportions
              const trueWidths = sections.map((section) => {
                return (section.size / fileSize) * 100;
              });

              // Apply minimum width to ensure visibility, but preserve proportions
              const MIN_WIDTH_PERCENT = 0.5; // Minimum 0.5% to stay visible
              const adjustedWidths = trueWidths.map((width) => {
                return Math.max(width, MIN_WIDTH_PERCENT);
              });

              // Normalize to exactly 100% while maintaining relative proportions
              const total = adjustedWidths.reduce((sum, w) => sum + w, 0);
              const normalizedWidths = adjustedWidths.map(w => (w / total) * 100);

              return sections.map((section, idx) => {
                const widthPercent = normalizedWidths[idx];
                const isHovered = hoveredSection?.id === section.id;

                return (
                  <div
                    key={section.id}
                    className={`
                      h-full flex items-center justify-center cursor-pointer
                      transition-all duration-150 relative
                      ${getColorClass(section, isHovered)}
                      ${isHovered ? 'z-10' : ''}
                    `}
                    style={{
                      width: `${widthPercent}%`,
                    }}
                    onMouseEnter={() => {
                      setHoveredSection(section);
                      if (selectedRowGroup !== section.rgIndex) {
                        setSelectedRowGroup(null);
                        setSelectedSection(null);
                      }
                    }}
                    onMouseLeave={() => setHoveredSection(null)}
                    onClick={() => {
                      if (section.type === 'rowgroup') {
                        setSelectedSection(selectedRowGroup === section.rgIndex ? null : section);
                        setSelectedRowGroup(selectedRowGroup === section.rgIndex ? null : section.rgIndex);
                      }
                    }}
                  >
                    <span className="text-xs text-white font-medium truncate px-1">
                      {section.shortLabel}
                    </span>
                  </div>
                );
              });
            })()}
          </div>
        </div>

        {/* Hover tooltip */}
        {(highlightedSection) && (
          <div className="mt-3 p-3 bg-gray-100 dark:bg-gray-900 rounded-lg text-md">
            <div className="font-medium text-gray-900 dark:text-white mb-2">{highlightedSection.label}</div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs">
              <div>
                <span className="text-gray-500">Offset:</span>
                <span className="ml-2 text-gray-700 dark:text-gray-300 font-mono">{formatNumber(highlightedSection.start)}</span>
              </div>
              <div>
                <span className="text-gray-500">Size:</span>
                <span className="ml-2 text-gray-700 dark:text-gray-300">{formatNumber(highlightedSection.size)} B</span>
              </div>
              {highlightedSection.numRows !== undefined && (
                <div>
                  <span className="text-gray-500">Rows:</span>
                  <span className="ml-2 text-gray-700 dark:text-gray-300">{formatNumber(highlightedSection.numRows)}</span>
                </div>
              )}
              {highlightedSection.numColumns !== undefined && (
                <div>
                  <span className="text-gray-500">Columns:</span>
                  <span className="ml-2 text-gray-700 dark:text-gray-300">{highlightedSection.numColumns}</span>
                </div>
              )}
            </div>
            {highlightedSection.type === 'rowgroup' && selectedSection === null && (
              <p className="text-xs text-gray-500 mt-2">Click to expand column details</p>
            )}
          </div>
        )}

        {/* Selected row group detail */}
        {selectedRowGroup !== null && (
          <RowGroupDetail
            rowGroup={fileMetaData.row_groups[selectedRowGroup]}
            rgIndex={selectedRowGroup}
            pageIndexes={pageIndexes[selectedRowGroup]}
            fileSize={fileSize}
            schema={fileMetaData.schema}
            onClose={() => setSelectedRowGroup(null)}
          />
        )}
      </div>
    </div>
  );
}

function RowGroupDetail({ rowGroup, pageIndexes, schema, onClose }) {
  const columns = rowGroup.columns;

  // Calculate column layout data
  const columnData = columns.map((col, idx) => {
    const meta = col.meta_data;
    if (!meta) return null;

    const dictOffset = meta.dictionary_page_offset ? Number(meta.dictionary_page_offset) : null;
    const dataOffset = Number(meta.data_page_offset);
    const size = Number(meta.total_compressed_size);
    const start = dictOffset ? Math.min(dictOffset, dataOffset) : dataOffset;

    // Get schema element for proper type formatting
    const schemaElement = findSchemaElement(schema, meta.path_in_schema);

    // Format min/max statistics
    const stats = meta.statistics;
    const minValue = stats?.min_value ? formatStatValue(stats.min_value, meta, schemaElement) : null;
    const maxValue = stats?.max_value ? formatStatValue(stats.max_value, meta, schemaElement) : null;
    // Fallback to deprecated min/max fields
    const minValueLegacy = !minValue && stats?.min ? formatStatValue(stats.min, meta, schemaElement) : null;
    const maxValueLegacy = !maxValue && stats?.max ? formatStatValue(stats.max, meta, schemaElement) : null;

    return {
      index: idx,
      name: meta.path_in_schema.join('.'),
      start,
      size,
      compression: EnumHelpers.getCompressionName(meta.codec),
      type: EnumHelpers.getTypeName(meta.type),
      numValues: Number(meta.num_values),
      numPages: pageIndexes?.[idx]?.offsetIndex?.page_locations?.length || 0,
      hasDictPage: dictOffset != null,
      minValue: minValue || minValueLegacy,
      maxValue: maxValue || maxValueLegacy,
    };
  }).filter(Boolean);

  // Sort by position
  columnData.sort((a, b) => a.start - b.start);

  // Find min/max for scale
  const minOffset = Math.min(...columnData.map(c => c.start));
  const maxOffset = Math.max(...columnData.map(c => c.start + c.size));
  const totalSize = maxOffset - minOffset;

  return (
    <div className="mt-4 p-4 bg-gray-100 dark:bg-gray-900 rounded-lg">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-medium text-gray-900 dark:text-white">Column Chunks</h3>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Column bars */}
      <div className="space-y-1">
        {columnData.map((col) => {
          const widthPercent = (col.size / totalSize) * 100;
          const leftPercent = ((col.start - minOffset) / totalSize) * 100;

          return (
            <div key={col.index} className="relative h-6 bg-gray-200 dark:bg-gray-800 rounded">
              <div
                className="absolute h-full bg-cyan-600 hover:bg-cyan-500 rounded transition-colors flex items-center"
                style={{
                  left: `${leftPercent}%`,
                  width: `${Math.max(widthPercent, 2)}%`,
                  minWidth: '60px',
                }}
                title={`${col.name}: ${formatBytes(col.size)}`}
              >
                <span className="text-xs text-white px-2 truncate">{col.name}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Column table */}
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="text-gray-500 border-b border-gray-300 dark:border-gray-700">
            <tr>
              <th className="text-left py-2 pr-3">Column</th>
              <th className="text-left py-2 pr-2">Type</th>
              <th className="text-left py-2 pr-2">Compression</th>
              <th className="text-left py-2 pr-3">Min</th>
              <th className="text-left py-2 pr-3">Max</th>
              <th className="text-right py-2 pr-3">Values</th>
              <th className="text-right py-2 pr-3">Pages</th>
              <th className="text-right py-2">Size</th>
            </tr>
          </thead>
          <tbody className="text-gray-700 dark:text-gray-300">
            {columnData.map((col) => (
              <tr key={col.index} className="border-b border-gray-200 dark:border-gray-800 hover:bg-gray-200/50 dark:hover:bg-gray-800/50">
                <td className="py-2 pr-3 font-medium text-cyan-600 dark:text-cyan-400">{col.name}</td>
                <td className="py-2 pr-2">{col.type}</td>
                <td className="py-2 pr-2">{col.compression}</td>
                <td className="py-2 pr-3 font-mono text-gray-500 dark:text-gray-400 max-w-32 truncate" title={col.minValue || ''}>
                  {col.minValue || '-'}
                </td>
                <td className="py-2 pr-3 font-mono text-gray-500 dark:text-gray-400 max-w-32 truncate" title={col.maxValue || ''}>
                  {col.maxValue || '-'}
                </td>
                <td className="py-2 pr-3 text-right font-mono">{formatNumber(col.numValues)}</td>
                <td className="py-2 pr-3 text-right font-mono">
                  {col.numPages > 0
                    ? `${col.numPages}${col.hasDictPage ? ' + dict page' : ''}`
                    : '-'}
                </td>
                <td className="py-2 text-right font-mono">{formatBytes(col.size)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default FileLayoutDiagram;
