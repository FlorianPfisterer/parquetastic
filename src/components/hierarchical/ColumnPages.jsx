import React from 'react';
import PageBlockColumn from './PageBlockColumn.jsx';

/**
 * Column pages component for columns view - just the pages, no header
 */
export default function ColumnPages({
  column,
  pageIndex,
  rowGroupRows,
  containerHeight,
  columnWidth,
  schemaElement,
}) {
  const meta = column.meta_data;
  const offsetIndex = pageIndex?.offsetIndex;
  const colIndex = pageIndex?.columnIndex;
  const pages = offsetIndex?.page_locations || [];

  if (!meta) return null;

  // Prepare page data with row counts
  const pagesWithRowCount = pages.map((page, i) => {
    const firstRow = Number(page.first_row_index);
    const nextFirstRow = pages[i + 1] ? Number(pages[i + 1].first_row_index) : rowGroupRows;
    return {
      ...page,
      rowCount: nextFirstRow - firstRow,
    };
  });

  return (
    <div
      className="flex-shrink-0"
      style={{
        width: `${columnWidth}px`,
        minWidth: `${columnWidth}px`,
        maxWidth: `${columnWidth}px`,
        height: `${containerHeight}px`,
      }}
    >
      <div
        className="relative bg-cyan-50 dark:bg-cyan-950/30 border border-cyan-200 dark:border-cyan-800/40 rounded-lg"
        style={{ height: `${containerHeight}px` }}
      >
        {pagesWithRowCount.map((page, i) => (
          <PageBlockColumn
            key={i}
            page={page}
            index={i}
            rowCount={page.rowCount}
            totalRows={rowGroupRows}
            columnIndex={colIndex}
            columnMeta={meta}
            schemaElement={schemaElement}
          />
        ))}
      </div>
    </div>
  );
}
