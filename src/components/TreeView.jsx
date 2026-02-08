import { useState } from 'react';
import { formatBytes, formatNumber, EnumHelpers } from '../parquetParser.js';
import { formatStatValue, findSchemaElement, getLogicalTypeDescription } from '../statsFormatter.js';

function ChevronIcon({ expanded }) {
  return (
    <svg
      className={`w-4 h-4 transition-transform ${expanded ? 'rotate-90' : ''}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  );
}

function TreeNode({ label, children, defaultExpanded = false, info, badge, level = 0 }) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const hasChildren = children && (Array.isArray(children) ? children.length > 0 : true);

  return (
    <div className="select-none">
      <div
        className={`
          flex items-center gap-2 py-1.5 px-2 rounded cursor-pointer
          hover:bg-gray-700/50 transition-colors
          ${level === 0 ? 'text-white font-medium' : 'text-gray-300'}
        `}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
        onClick={() => hasChildren && setExpanded(!expanded)}
      >
        {hasChildren ? (
          <ChevronIcon expanded={expanded} />
        ) : (
          <span className="w-4" />
        )}
        <span className="flex-1 truncate">{label}</span>
        {badge && (
          <span className="px-2 py-0.5 text-xs rounded bg-gray-700 text-gray-300">
            {badge}
          </span>
        )}
        {info && (
          <span className="text-xs text-gray-500 ml-2">{info}</span>
        )}
      </div>
      {expanded && hasChildren && (
        <div>
          {children}
        </div>
      )}
    </div>
  );
}

function MetadataRow({ label, value, mono = false }) {
  if (value === null || value === undefined) return null;
  return (
    <div className="flex gap-2 py-0.5 text-xs">
      <span className="text-gray-500 w-32 flex-shrink-0">{label}:</span>
      <span className={`text-gray-300 ${mono ? 'font-mono' : ''}`}>{value}</span>
    </div>
  );
}

function ColumnChunkDetails({ chunk, pageIndex, schema }) {
  const [showDetails, setShowDetails] = useState(false);
  const meta = chunk.meta_data;
  const offsetIndex = pageIndex?.offsetIndex;

  if (!meta) return null;

  const columnPath = meta.path_in_schema.join('.');
  const compressedSize = Number(meta.total_compressed_size);
  const uncompressedSize = Number(meta.total_uncompressed_size);
  const compressionRatio = uncompressedSize > 0
    ? ((1 - compressedSize / uncompressedSize) * 100).toFixed(1)
    : 0;

  // Calculate pages info from offset index
  const numPages = offsetIndex?.page_locations?.length || 0;

  // Find schema element for logical type info
  const schemaElement = findSchemaElement(schema, meta.path_in_schema);
  const logicalTypeDesc = getLogicalTypeDescription(schemaElement);

  // Format statistics min/max values
  const stats = meta.statistics;
  const minValue = stats?.min_value ? formatStatValue(stats.min_value, meta, schemaElement) : null;
  const maxValue = stats?.max_value ? formatStatValue(stats.max_value, meta, schemaElement) : null;
  // Fallback to deprecated min/max fields if min_value/max_value not present
  const minValueLegacy = !minValue && stats?.min ? formatStatValue(stats.min, meta, schemaElement) : null;
  const maxValueLegacy = !maxValue && stats?.max ? formatStatValue(stats.max, meta, schemaElement) : null;
  const displayMin = minValue || minValueLegacy;
  const displayMax = maxValue || maxValueLegacy;

  return (
    <TreeNode
      label={columnPath}
      level={2}
      badge={EnumHelpers.getCompressionName(meta.codec)}
      info={formatBytes(compressedSize)}
    >
      <div className="ml-12 py-2 space-y-3">
        {/* Essential info */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs">
          <MetadataRow label="Type" value={EnumHelpers.getTypeName(meta.type)} />
          {logicalTypeDesc && <MetadataRow label="Logical Type" value={logicalTypeDesc} />}
          <MetadataRow label="Values" value={formatNumber(Number(meta.num_values))} />
          <MetadataRow label="Compressed" value={formatBytes(compressedSize)} />
          <MetadataRow label="Uncompressed" value={formatBytes(uncompressedSize)} />
          <MetadataRow label="Compression" value={`${compressionRatio}% reduction`} />
          <MetadataRow label="Encodings" value={meta.encodings.map(e => EnumHelpers.getEncodingName(e)).join(', ')} />
          <MetadataRow label="Data Pages" value={numPages || '-'} />
          <MetadataRow label="Data Offset" value={formatNumber(Number(meta.data_page_offset))} mono />
        </div>

        {/* Statistics min/max - shown prominently if available */}
        {(displayMin || displayMax) && (
          <div className="mt-2 pt-2 border-t border-gray-700/50">
            <h5 className="text-xs font-medium text-gray-400 mb-1">Value Range</h5>
            <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs">
              <MetadataRow label="Min" value={displayMin} mono />
              <MetadataRow label="Max" value={displayMax} mono />
            </div>
          </div>
        )}

        {/* Toggle for full details */}
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="text-xs text-blue-400 hover:text-blue-300"
        >
          {showDetails ? 'Hide details' : 'Show all metadata'}
        </button>

        {showDetails && (
          <div className="space-y-3 pt-2 border-t border-gray-700">
            {/* Statistics */}
            {meta.statistics && (
              <div>
                <h5 className="text-xs font-medium text-gray-400 mb-1">Statistics</h5>
                <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs">
                  <MetadataRow label="Null Count" value={meta.statistics.null_count !== null ? formatNumber(Number(meta.statistics.null_count)) : null} />
                  <MetadataRow label="Distinct Count" value={meta.statistics.distinct_count !== null ? formatNumber(Number(meta.statistics.distinct_count)) : null} />
                </div>
              </div>
            )}

            {/* Dictionary info */}
            {meta.dictionary_page_offset && (
              <div>
                <h5 className="text-xs font-medium text-gray-400 mb-1">Dictionary</h5>
                <MetadataRow label="Offset" value={formatNumber(Number(meta.dictionary_page_offset))} mono />
              </div>
            )}

            {/* Bloom filter info */}
            {meta.bloom_filter_offset && (
              <div>
                <h5 className="text-xs font-medium text-gray-400 mb-1">Bloom Filter</h5>
                <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs">
                  <MetadataRow label="Offset" value={formatNumber(Number(meta.bloom_filter_offset))} mono />
                  <MetadataRow label="Length" value={meta.bloom_filter_length ? formatBytes(meta.bloom_filter_length) : null} />
                </div>
              </div>
            )}

            {/* Pages */}
            {offsetIndex && offsetIndex.page_locations && offsetIndex.page_locations.length > 0 && (
              <div>
                <h5 className="text-xs font-medium text-gray-400 mb-2">Pages ({offsetIndex.page_locations.length})</h5>
                <div className="max-h-48 overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="text-gray-500">
                      <tr>
                        <th className="text-left py-1 pr-3">#</th>
                        <th className="text-left py-1 pr-3">Offset</th>
                        <th className="text-left py-1 pr-3">Size</th>
                        <th className="text-left py-1 pr-3">First Row</th>
                        <th className="text-left py-1">Rows</th>
                      </tr>
                    </thead>
                    <tbody className="text-gray-300 font-mono">
                      {offsetIndex.page_locations.map((loc, i) => {
                        const nextLoc = offsetIndex.page_locations[i + 1];
                        const rowCount = nextLoc
                          ? Number(nextLoc.first_row_index) - Number(loc.first_row_index)
                          : '-';
                        return (
                          <tr key={i} className="hover:bg-gray-700/30">
                            <td className="py-1 pr-3 text-gray-500">{i}</td>
                            <td className="py-1 pr-3">{formatNumber(Number(loc.offset))}</td>
                            <td className="py-1 pr-3">{formatBytes(loc.compressed_page_size)}</td>
                            <td className="py-1 pr-3">{formatNumber(Number(loc.first_row_index))}</td>
                            <td className="py-1">{rowCount !== '-' ? formatNumber(rowCount) : rowCount}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </TreeNode>
  );
}

function RowGroupNode({ rowGroup, rgIndex, pageIndexes, schema }) {
  const numRows = Number(rowGroup.num_rows);
  const totalBytes = Number(rowGroup.total_byte_size);
  const compressedBytes = rowGroup.total_compressed_size ? Number(rowGroup.total_compressed_size) : null;

  return (
    <TreeNode
      label={`Row Group ${rgIndex}`}
      level={1}
      info={`${formatNumber(numRows)} row${numRows === 1 ? '' : 's'}`}
      badge={formatBytes(compressedBytes || totalBytes)}
    >
      {rowGroup.columns.map((col, colIdx) => (
        <ColumnChunkDetails
          key={colIdx}
          chunk={col}
          pageIndex={pageIndexes?.[colIdx]}
          colIdx={colIdx}
          schema={schema}
        />
      ))}
    </TreeNode>
  );
}

function SchemaNode({ schema }) {
  // Build schema tree from flat list
  const buildSchemaTree = (elements) => {
    const root = elements[0];
    let idx = 1;

    const buildNode = (parent, depth) => {
      const nodes = [];
      const numChildren = parent.num_children || 0;

      for (let i = 0; i < numChildren && idx < elements.length; i++) {
        const elem = elements[idx++];
        const node = {
          element: elem,
          children: [],
        };

        if (elem.num_children) {
          const childNodes = buildNode(elem, depth + 1);
          node.children = childNodes;
        }

        nodes.push(node);
      }

      return nodes;
    };

    return {
      element: root,
      children: buildNode(root, 0),
    };
  };

  const renderSchemaNode = (node, level) => {
    const elem = node.element;
    const isLeaf = !elem.num_children;

    const typeInfo = isLeaf
      ? EnumHelpers.getTypeName(elem.type)
      : 'group';

    const repetition = EnumHelpers.getRepetitionTypeName(elem.repetition_type);

    return (
      <TreeNode
        key={`${elem.name}-${level}`}
        label={elem.name}
        level={level + 1}
        badge={typeInfo}
        info={repetition?.toLowerCase()}
      >
        {node.children.map((child) => renderSchemaNode(child, level + 1))}
      </TreeNode>
    );
  };

  const tree = buildSchemaTree(schema);

  return (
    <TreeNode label="Schema" level={0} defaultExpanded>
      {tree.children.map((node) => renderSchemaNode(node, 0))}
    </TreeNode>
  );
}

function KeyValueMetadata({ metadata }) {
  if (!metadata || metadata.length === 0) return null;

  return (
    <TreeNode label="Key-Value Metadata" level={0} info={`${metadata.length} entr${metadata.length === 1 ? 'y' : 'ies'}`}>
      <div className="ml-8 py-2">
        <div className="max-h-64 overflow-y-auto">
          {metadata.map((kv, i) => (
            <div key={i} className="py-1 text-xs border-b border-gray-700/50 last:border-0">
              <span className="text-blue-400 font-medium">{kv.key}</span>
              {kv.value && (
                <pre className="mt-1 text-gray-400 whitespace-pre-wrap break-all max-h-32 overflow-y-auto">
                  {kv.value.length > 500 ? kv.value.substring(0, 500) + '...' : kv.value}
                </pre>
              )}
            </div>
          ))}
        </div>
      </div>
    </TreeNode>
  );
}

function TreeView({ data }) {
  const { fileMetaData, pageIndexes } = data;

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-700">
        <h2 className="text-lg font-medium text-white">File Structure</h2>
      </div>
      <div className="p-2 max-h-[600px] overflow-y-auto">
        <SchemaNode schema={fileMetaData.schema} />

        <TreeNode
          label="Row Groups"
          level={0}
          defaultExpanded
          info={`${fileMetaData.row_groups.length} group${fileMetaData.row_groups.length === 1 ? '' : 's'}`}
        >
          {fileMetaData.row_groups.map((rg, i) => (
            <RowGroupNode
              key={i}
              rowGroup={rg}
              rgIndex={i}
              pageIndexes={pageIndexes[i]}
              schema={fileMetaData.schema}
            />
          ))}
        </TreeNode>

        <KeyValueMetadata metadata={fileMetaData.key_value_metadata} />
      </div>
    </div>
  );
}

export default TreeView;
