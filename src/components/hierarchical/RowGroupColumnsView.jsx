import React, { useRef, useState, useEffect, useMemo } from 'react';
import { formatNumber } from '../../parquetParser.js';
import { findSchemaElement } from '../../statsFormatter.js';
import { MIN_PAGE_HEIGHT_PX, MIN_COLUMN_WIDTH, SCALE_WIDTH } from './constants.js';
import ColumnHeader from './ColumnHeader.jsx';
import ColumnPages from './ColumnPages.jsx';

/**
 * Row group columns view - horizontal layout of column strips
 */
export default function RowGroupColumnsView({ rowGroup, pageIndexes, numRows, schema }) {
  const containerRef = useRef(null);
  const headersScrollRef = useRef(null);
  const pagesScrollRef = useRef(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const isScrollingRef = useRef(false);

  // Measure container width
  useEffect(() => {
    if (containerRef.current) {
      const observer = new ResizeObserver((entries) => {
        for (const entry of entries) {
          setContainerWidth(entry.contentRect.width);
        }
      });
      observer.observe(containerRef.current);
      return () => observer.disconnect();
    }
  }, []);

  // Sync horizontal scroll between headers and pages
  const handleHeadersScroll = (e) => {
    if (isScrollingRef.current) return;
    isScrollingRef.current = true;
    if (pagesScrollRef.current) {
      pagesScrollRef.current.scrollLeft = e.target.scrollLeft;
    }
    isScrollingRef.current = false;
  };

  const handlePagesScroll = (e) => {
    if (isScrollingRef.current) return;
    isScrollingRef.current = true;
    if (headersScrollRef.current) {
      headersScrollRef.current.scrollLeft = e.target.scrollLeft;
    }
    isScrollingRef.current = false;
  };

  const numColumns = rowGroup.columns.length;

  // Calculate container height: ensure the smallest page (by row count) gets at least MIN_PAGE_HEIGHT_PX
  const containerHeight = useMemo(() => {
    let minRowFraction = 1;

    for (let i = 0; i < numColumns; i++) {
      const pages = pageIndexes?.[i]?.offsetIndex?.page_locations || [];
      for (let j = 0; j < pages.length; j++) {
        const firstRow = Number(pages[j].first_row_index);
        const nextFirstRow = pages[j + 1] ? Number(pages[j + 1].first_row_index) : numRows;
        const rowCount = nextFirstRow - firstRow;
        const rowFraction = rowCount / numRows;
        if (rowFraction < minRowFraction && rowFraction > 0) {
          minRowFraction = rowFraction;
        }
      }
    }

    const neededHeight = MIN_PAGE_HEIGHT_PX / minRowFraction;
    return Math.max(300, Math.ceil(neededHeight));
  }, [pageIndexes, numColumns, numRows]);

  // Calculate column width
  const availableWidth = Math.max(0, containerWidth - SCALE_WIDTH - 32 - 8);
  const gapsWidth = (numColumns - 1) * 4;
  const widthPerColumn = (availableWidth - gapsWidth) / numColumns;

  const needsScroll = widthPerColumn < MIN_COLUMN_WIDTH;
  const columnWidth = needsScroll ? MIN_COLUMN_WIDTH : widthPerColumn;
  const totalColumnsWidth = numColumns * columnWidth + gapsWidth;

  // Don't render until we have a valid width measurement
  if (containerWidth === 0) {
    return (
      <div className="p-4 bg-blue-50/50 dark:bg-blue-950/20" ref={containerRef}>
        <div className="h-[300px] flex items-center justify-center text-blue-500/50 dark:text-blue-400/50 text-sm">
          Loading...
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 bg-blue-50/50 dark:bg-blue-950/20" ref={containerRef}>
      {/* Use CSS Grid: scale column is fixed, columns area can scroll */}
      <div className="grid gap-2" style={{ gridTemplateColumns: `${SCALE_WIDTH}px 1fr` }}>
        {/* Row 1: Empty cell above scale + Column headers */}
        <div>{/* Empty - scale has no header */}</div>
        <div
          ref={headersScrollRef}
          className={needsScroll ? 'overflow-x-scroll scrollbar-hide' : ''}
          style={needsScroll ? { scrollbarWidth: 'none', msOverflowStyle: 'none' } : undefined}
          onScroll={needsScroll ? handleHeadersScroll : undefined}
        >
          <div
            className="flex gap-1"
            style={{ width: needsScroll ? `${totalColumnsWidth}px` : undefined }}
          >
            {rowGroup.columns.map((col, colIdx) => (
              <ColumnHeader
                key={colIdx}
                column={col}
                pageIndex={pageIndexes?.[colIdx]}
                columnWidth={columnWidth}
              />
            ))}
          </div>
        </div>

        {/* Row 2: Scale + Pages - these are in the same grid row so they align perfectly */}
        <div
          className="relative border-r border-blue-300 dark:border-blue-700/30"
          style={{ height: `${containerHeight}px` }}
        >
          {/* Row markers - 0 at top, max at bottom, centered on the edge */}
          {[0, 0.25, 0.5, 0.75, 1].map((fraction) => (
            <div
              key={fraction}
              className="absolute right-0 flex items-center"
              style={{
                top: `${fraction * 100}%`,
                transform: 'translateY(-50%)',
              }}
            >
              <span className="text-[10px] text-blue-500/60 dark:text-blue-400/60 mr-1 font-mono">
                {formatNumber(Math.round(fraction * numRows))}
              </span>
              <div className="w-2 h-px bg-blue-400/50 dark:bg-blue-700/50"></div>
            </div>
          ))}
        </div>
        <div
          ref={pagesScrollRef}
          className={needsScroll ? 'overflow-x-scroll scrollbar-hide' : ''}
          style={needsScroll ? { scrollbarWidth: 'none', msOverflowStyle: 'none' } : undefined}
          onScroll={needsScroll ? handlePagesScroll : undefined}
        >
          <div
            className="flex gap-1"
            style={{ width: needsScroll ? `${totalColumnsWidth}px` : undefined }}
          >
            {rowGroup.columns.map((col, colIdx) => {
              const schemaElem = col.meta_data
                ? findSchemaElement(schema, col.meta_data.path_in_schema)
                : null;
              return (
                <ColumnPages
                  key={colIdx}
                  column={col}
                  pageIndex={pageIndexes?.[colIdx]}
                  rowGroupRows={numRows}
                  containerHeight={containerHeight}
                  columnWidth={columnWidth}
                  schemaElement={schemaElem}
                />
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
