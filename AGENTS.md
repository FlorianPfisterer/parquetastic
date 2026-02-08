# Parquetastic - AI Agent Guide

This document provides context for AI agents working with the Parquetastic codebase.
It has been written by Claude Opus 4.5.

## Project Overview

Parquetastic is a browser-based visual Parquet metadata inspector. It allows users to:

- Upload a Parquet file via drag-and-drop or file picker
- View the hierarchical structure: row groups, column chunks, and pages
- See a byte-level file layout diagram
- Inspect detailed metadata including types, encodings, compression, and min/max statistics

**Key constraint:** All processing happens client-side in the browser. No server, no data upload.

## Tech Stack

- **React 19** - UI framework (functional components with hooks)
- **Vite 7** - Build tool and dev server
- **Tailwind CSS 3** - Styling (utility classes, dark mode support)
- **No TypeScript** - Pure JavaScript with JSDoc-style documentation
- **No testing framework** - Currently no automated tests

## Project Structure

```
src/
├── App.jsx                 # Main app component, state management
├── main.jsx                # React entry point
├── index.css               # Tailwind imports, custom styles
├── parquetParser.js        # Parquet file parsing logic (streaming + legacy)
├── parquetInit.js          # Thrift + parquet_types.js initialization
├── thrift.js               # Thrift Compact Protocol reader implementation
├── statsFormatter.js       # Min/max statistics value formatting
├── parquet_types.js        # Auto-generated Thrift types (DO NOT EDIT)
├── parquet_types.d.ts      # TypeScript declarations for parquet_types.js
├── parquet.thrift          # Reference: Parquet format Thrift definition
├── hooks/
│   └── useTheme.js         # Dark/light theme hook
└── components/
    ├── FileUpload.jsx          # Drag-and-drop file input
    ├── FileLayoutDiagram.jsx   # Byte-level file layout visualization
    ├── FileMetadataHeader.jsx  # File summary stats display
    ├── ErrorDisplay.jsx        # Error message component
    └── hierarchical/           # Hierarchical metadata view
        ├── index.jsx           # Re-export
        ├── HierarchicalView.jsx    # Main view with row/column toggle
        ├── RowGroupBox.jsx         # Row group container
        ├── RowGroupColumnsView.jsx # Column-aligned page view
        ├── ColumnBox.jsx           # Column chunk display
        ├── ColumnHeader.jsx        # Column name/type header
        ├── ColumnPages.jsx         # Pages within a column
        ├── PageBlockColumn.jsx     # Vertical page alignment
        ├── PageBox.jsx             # Individual page display
        ├── PageTooltip.jsx         # Page details tooltip
        ├── FloatingTooltip.jsx     # Tooltip positioning logic
        ├── Icons.jsx               # SVG icon components
        ├── constants.js            # Layout constants
        └── encodingUtils.js        # Encoding name utilities
```

## How Parquet Parsing Works

### 1. File Reading (`parquetParser.js`)

Two parsing modes:

- `parseParquetFileStreaming(file)` - For large files, reads only necessary bytes using `file.slice()`
- `parseParquetFile(buffer)` - Legacy, loads entire file into memory

Both return:

```javascript
{
  fileSize: number,
  footerLength: number,
  footerStart: number,
  fileMetaData: FileMetaData,  // Parsed Thrift struct
  pageIndexes: array           // Per row-group, per-column indexes
}
```

### 2. Thrift Deserialization

The parsing flow:

1. `thrift.js` - Implements `TCompactProtocolReader` for reading Thrift Compact Protocol
2. `parquetInit.js` - Initializes the Thrift environment, makes `parquet_types.js` work in browser
3. `parquet_types.js` - Auto-generated code that deserializes Parquet metadata structs

**Important:** `parquet_types.js` is auto-generated from `parquet.thrift`. Do not edit manually.

### 3. Key Data Structures (from `parquet_types.d.ts`)

```typescript
FileMetaData {
  version: number
  schema: SchemaElement[]      // Column definitions
  num_rows: Int64
  row_groups: RowGroup[]       // Data partitions
  key_value_metadata?: KeyValue[]
  created_by?: string
}

RowGroup {
  columns: ColumnChunk[]
  total_byte_size: Int64
  num_rows: Int64
}

ColumnChunk {
  meta_data?: ColumnMetaData   // Type, encoding, compression, offsets
  offset_index_offset?: Int64  // Page index location
  column_index_offset?: Int64
}

ColumnIndex {
  null_pages: boolean[]
  min_values: Buffer[]         // Per-page min stats
  max_values: Buffer[]         // Per-page max stats
  boundary_order: BoundaryOrder
}

OffsetIndex {
  page_locations: PageLocation[]  // Offset, size, first_row for each page
}
```

## Component Patterns

### State Management

- App-level state in `App.jsx` using `useState`
- Parsed data flows down as props
- No global state library

### Styling Conventions

- Tailwind utility classes
- Dark mode: `dark:` prefix (e.g., `bg-white dark:bg-gray-800`)
- Color coding:
    - Purple: file/magic bytes
    - Blue: row groups
    - Cyan: column chunks
    - Emerald/green: data pages
    - Orange: footer

### Component Structure

Components typically follow:

```jsx
function ComponentName({ prop1, prop2 }) {
    const [state, setState] = useState(initial);

    const computedValue = useMemo(() => {
        // expensive computation
    }, [dependencies]);

    return <div className="...">{/* JSX */}</div>;
}

export default ComponentName;
```

## Common Tasks

### Adding a new metadata field to display

1. Check if the field exists in `parquet_types.d.ts`
2. Access it through the parsed `fileMetaData` object
3. Use `EnumHelpers` from `parquetParser.js` to convert enum values to names
4. Use `formatBytes()`, `formatNumber()` from `parquetParser.js` for formatting

### Formatting statistics values

Use `formatStatValue()` from `statsFormatter.js`:

```javascript
formatStatValue(rawBytes, columnMetaData, schemaElement);
```

This handles type-aware formatting (timestamps, decimals, strings, etc.)

### Adding new visualization

1. Create component in `src/components/`
2. Import in `App.jsx`
3. Pass `parquetData` as prop
4. Access `fileMetaData` and `pageIndexes` from the data object

## Development Commands

```bash
npm install      # Install dependencies
npm run dev      # Start dev server (hot reload)
npm run build    # Production build to dist/
npm run preview  # Preview production build
npm run lint     # Run ESLint
```

## Key Constraints

1. **Browser-only** - No Node.js APIs. Use `File.slice()` for streaming reads
2. **No external Thrift library** - Custom `thrift.js` implementation
3. **Large file support** - Must handle 10GB+ files by reading only metadata
4. **Int64 handling** - Parquet uses Int64 for offsets/counts. Converted to `BigInt` or `number` in browser
5. **Privacy** - No network requests. All processing local

## Areas for Enhancement

- Add TypeScript (currently JS with .d.ts for parquet_types)
- Add unit tests for parsing logic
- Add more Parquet features: bloom filters, encryption info
- Improve page-level statistics display
- Add data preview (would require reading actual data, not just metadata)
- Add file comparison mode

## Debugging Tips

- Check browser console for parsing warnings (failed index parsing, etc.)
- Use React DevTools to inspect component props
- The `parquetData` object contains all parsed information
- For Thrift issues, check `TCompactProtocolReader` in `thrift.js`

## File Format Reference

Parquet file structure:

```
┌─────────────────────┐
│ Magic (PAR1)        │  4 bytes
├─────────────────────┤
│ Row Group 0         │  Column chunks with pages
├─────────────────────┤
│ Row Group 1         │  ...
├─────────────────────┤
│ ...                 │
├─────────────────────┤
│ Page Index          │  ColumnIndex + OffsetIndex (optional)
├─────────────────────┤
│ Footer (FileMetaData)│  Thrift-encoded metadata
├─────────────────────┤
│ Footer Length       │  4 bytes (little-endian)
├─────────────────────┤
│ Magic (PAR1)        │  4 bytes
└─────────────────────┘
```

See https://parquet.apache.org/docs/file-format/ for full specification.
