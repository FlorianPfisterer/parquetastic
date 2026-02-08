/**
 * Parquet File Parser for Browser
 * Parses Parquet file metadata, column indexes, and offset indexes
 * Supports streaming reads for large files (only reads necessary parts)
 */

import {
    TCompactProtocolReader,
    FileMetaData,
    ColumnIndex,
    OffsetIndex,
    Type,
    ConvertedType,
    CompressionCodec,
    Encoding,
    FieldRepetitionType,
    PageType,
    BoundaryOrder,
} from './parquetInit.js';

// Magic bytes for Parquet files
const PARQUET_MAGIC = new Uint8Array([0x50, 0x41, 0x52, 0x31]); // "PAR1"

/**
 * Check if two byte arrays are equal
 */
function bytesEqual(a, b) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) return false;
    }
    return true;
}

/**
 * Read a slice of a File object as Uint8Array
 * @param {File} file - The file to read from
 * @param {number} start - Start offset
 * @param {number} end - End offset (exclusive)
 * @returns {Promise<Uint8Array>} The bytes read
 */
async function readFileSlice(file, start, end) {
    try {
        const blob = file.slice(start, end);
        const buffer = await blob.arrayBuffer();
        return new Uint8Array(buffer);
    } catch (err) {
        // Provide more helpful error message for large file issues
        const rangeInfo = `bytes ${start.toLocaleString()}-${end.toLocaleString()}`;
        if (err.name === 'NotReadableError' || err.message.includes('could not be read')) {
            throw new Error(
                `Failed to read ${rangeInfo} from file. ` +
                    `This can happen with very large files. ` +
                    `Try closing other applications or using a different browser.`,
            );
        }
        throw new Error(`Failed to read ${rangeInfo}: ${err.message}`);
    }
}

/**
 * Parse a Parquet file using streaming reads (for large files)
 * Only reads the necessary parts: header, footer, and page indexes
 * @param {File} file - The File object to parse
 * @returns {Object} Parsed metadata including file metadata and page indexes
 */
export async function parseParquetFileStreaming(file) {
    const fileSize = file.size;

    // Validate file size
    if (fileSize < 12) {
        throw new Error('File too small to be a valid Parquet file');
    }

    // Read header magic (first 4 bytes)
    const headerMagic = await readFileSlice(file, 0, 4);
    if (!bytesEqual(headerMagic, PARQUET_MAGIC)) {
        throw new Error('Invalid Parquet file: missing header magic bytes (PAR1)');
    }

    // Read footer (last 8 bytes: 4 bytes length + 4 bytes magic)
    const footerEnd = await readFileSlice(file, fileSize - 8, fileSize);

    // Check magic bytes at the end
    const footerMagic = footerEnd.slice(4, 8);
    if (!bytesEqual(footerMagic, PARQUET_MAGIC)) {
        throw new Error('Invalid Parquet file: missing footer magic bytes (PAR1)');
    }

    // Read footer length (4 bytes before magic, little-endian)
    const footerLength = new DataView(footerEnd.buffer, footerEnd.byteOffset, 4).getUint32(0, true);

    if (footerLength > fileSize - 8) {
        throw new Error(`Invalid footer length: ${footerLength} exceeds file size`);
    }

    // Read footer metadata
    const footerStart = fileSize - 8 - footerLength;
    const footerBytes = await readFileSlice(file, footerStart, footerStart + footerLength);

    // Parse FileMetaData using Thrift Compact Protocol
    const reader = new TCompactProtocolReader(footerBytes);
    const fileMetaData = new FileMetaData();
    fileMetaData[Symbol.for('read')](reader);

    // Parse page indexes for each column chunk (streaming)
    const pageIndexes = await parsePageIndexesStreaming(file, fileMetaData);

    return {
        fileSize,
        footerLength,
        footerStart,
        fileMetaData,
        pageIndexes,
    };
}

/**
 * Parse a Parquet file and extract metadata (legacy - reads entire file)
 * @param {ArrayBuffer} buffer - The complete parquet file as ArrayBuffer
 * @returns {Object} Parsed metadata including file metadata and page indexes
 * @deprecated Use parseParquetFileStreaming for large files
 */
export async function parseParquetFile(buffer) {
    const bytes = new Uint8Array(buffer);
    const fileSize = bytes.length;

    // Validate file size
    if (fileSize < 12) {
        throw new Error('File too small to be a valid Parquet file');
    }

    // Check magic bytes at the beginning
    const headerMagic = bytes.slice(0, 4);
    if (!bytesEqual(headerMagic, PARQUET_MAGIC)) {
        throw new Error('Invalid Parquet file: missing header magic bytes (PAR1)');
    }

    // Check magic bytes at the end
    const footerMagic = bytes.slice(fileSize - 4, fileSize);
    if (!bytesEqual(footerMagic, PARQUET_MAGIC)) {
        throw new Error('Invalid Parquet file: missing footer magic bytes (PAR1)');
    }

    // Read footer length (4 bytes before magic, little-endian)
    const footerLengthBytes = bytes.slice(fileSize - 8, fileSize - 4);
    const footerLength = new DataView(footerLengthBytes.buffer, footerLengthBytes.byteOffset, 4).getUint32(0, true);

    if (footerLength > fileSize - 8) {
        throw new Error(`Invalid footer length: ${footerLength} exceeds file size`);
    }

    // Read footer metadata
    const footerStart = fileSize - 8 - footerLength;
    const footerBytes = bytes.slice(footerStart, footerStart + footerLength);

    // Parse FileMetaData using Thrift Compact Protocol
    const reader = new TCompactProtocolReader(footerBytes);
    const fileMetaData = new FileMetaData();
    fileMetaData[Symbol.for('read')](reader);

    // Parse page indexes for each column chunk
    const pageIndexes = await parsePageIndexes(bytes, fileMetaData);

    return {
        fileSize,
        footerLength,
        footerStart,
        fileMetaData,
        pageIndexes,
    };
}

/**
 * Parse ColumnIndex and OffsetIndex for all column chunks (streaming version)
 * Batches reads to minimize I/O operations
 */
async function parsePageIndexesStreaming(file, fileMetaData) {
    const indexes = [];

    // Collect all required byte ranges first
    const readRequests = [];
    for (let rgIdx = 0; rgIdx < fileMetaData.row_groups.length; rgIdx++) {
        const rowGroup = fileMetaData.row_groups[rgIdx];
        for (let colIdx = 0; colIdx < rowGroup.columns.length; colIdx++) {
            const columnChunk = rowGroup.columns[colIdx];

            if (columnChunk.column_index_offset && columnChunk.column_index_length) {
                readRequests.push({
                    rgIdx,
                    colIdx,
                    type: 'columnIndex',
                    offset: Number(columnChunk.column_index_offset),
                    length: Number(columnChunk.column_index_length),
                });
            }

            if (columnChunk.offset_index_offset && columnChunk.offset_index_length) {
                readRequests.push({
                    rgIdx,
                    colIdx,
                    type: 'offsetIndex',
                    offset: Number(columnChunk.offset_index_offset),
                    length: Number(columnChunk.offset_index_length),
                });
            }
        }
    }

    // Sort by offset to potentially enable sequential reads
    readRequests.sort((a, b) => a.offset - b.offset);

    // Batch adjacent reads (within 64KB gap) to reduce I/O
    const batches = [];
    let currentBatch = null;
    const MAX_GAP = 64 * 1024; // 64KB gap threshold

    for (const req of readRequests) {
        if (!currentBatch) {
            currentBatch = {
                start: req.offset,
                end: req.offset + req.length,
                requests: [req],
            };
        } else if (req.offset <= currentBatch.end + MAX_GAP) {
            // Extend current batch
            currentBatch.end = Math.max(currentBatch.end, req.offset + req.length);
            currentBatch.requests.push(req);
        } else {
            // Start new batch
            batches.push(currentBatch);
            currentBatch = {
                start: req.offset,
                end: req.offset + req.length,
                requests: [req],
            };
        }
    }
    if (currentBatch) {
        batches.push(currentBatch);
    }

    // Initialize result structure
    for (let rgIdx = 0; rgIdx < fileMetaData.row_groups.length; rgIdx++) {
        const rowGroup = fileMetaData.row_groups[rgIdx];
        const rgIndexes = [];
        for (let colIdx = 0; colIdx < rowGroup.columns.length; colIdx++) {
            rgIndexes.push({ columnIndex: null, offsetIndex: null });
        }
        indexes.push(rgIndexes);
    }

    // Read and parse batches
    for (const batch of batches) {
        const batchBytes = await readFileSlice(file, batch.start, batch.end);

        for (const req of batch.requests) {
            const localOffset = req.offset - batch.start;
            const indexBytes = batchBytes.slice(localOffset, localOffset + req.length);

            try {
                const reader = new TCompactProtocolReader(indexBytes);
                if (req.type === 'columnIndex') {
                    const columnIndex = new ColumnIndex();
                    columnIndex[Symbol.for('read')](reader);
                    indexes[req.rgIdx][req.colIdx].columnIndex = columnIndex;
                } else {
                    const offsetIndex = new OffsetIndex();
                    offsetIndex[Symbol.for('read')](reader);
                    indexes[req.rgIdx][req.colIdx].offsetIndex = offsetIndex;
                }
            } catch (e) {
                console.warn(`Failed to parse ${req.type} for row group ${req.rgIdx}, column ${req.colIdx}:`, e);
            }
        }
    }

    return indexes;
}

/**
 * Parse ColumnIndex and OffsetIndex for all column chunks (legacy - from buffer)
 */
async function parsePageIndexes(bytes, fileMetaData) {
    const indexes = [];

    for (let rgIdx = 0; rgIdx < fileMetaData.row_groups.length; rgIdx++) {
        const rowGroup = fileMetaData.row_groups[rgIdx];
        const rgIndexes = [];

        for (let colIdx = 0; colIdx < rowGroup.columns.length; colIdx++) {
            const columnChunk = rowGroup.columns[colIdx];
            const colIndex = { columnIndex: null, offsetIndex: null };

            // Parse ColumnIndex if available
            if (columnChunk.column_index_offset && columnChunk.column_index_length) {
                try {
                    const offset = Number(columnChunk.column_index_offset);
                    const length = Number(columnChunk.column_index_length);
                    const indexBytes = bytes.slice(offset, offset + length);
                    const reader = new TCompactProtocolReader(indexBytes);
                    colIndex.columnIndex = new ColumnIndex();
                    colIndex.columnIndex[Symbol.for('read')](reader);
                } catch (e) {
                    console.warn(`Failed to parse ColumnIndex for row group ${rgIdx}, column ${colIdx}:`, e);
                }
            }

            // Parse OffsetIndex if available
            if (columnChunk.offset_index_offset && columnChunk.offset_index_length) {
                try {
                    const offset = Number(columnChunk.offset_index_offset);
                    const length = Number(columnChunk.offset_index_length);
                    const indexBytes = bytes.slice(offset, offset + length);
                    const reader = new TCompactProtocolReader(indexBytes);
                    colIndex.offsetIndex = new OffsetIndex();
                    colIndex.offsetIndex[Symbol.for('read')](reader);
                } catch (e) {
                    console.warn(`Failed to parse OffsetIndex for row group ${rgIdx}, column ${colIdx}:`, e);
                }
            }

            rgIndexes.push(colIndex);
        }

        indexes.push(rgIndexes);
    }

    return indexes;
}

/**
 * Helper to convert enum values to human-readable names
 */
export const EnumHelpers = {
    getTypeName(type) {
        return Type[type] || `Unknown(${type})`;
    },

    getConvertedTypeName(type) {
        if (type === null || type === undefined) return null;
        return ConvertedType[type] || `Unknown(${type})`;
    },

    getCompressionName(codec) {
        return CompressionCodec[codec] || `Unknown(${codec})`;
    },

    getEncodingName(encoding) {
        return Encoding[encoding] || `Unknown(${encoding})`;
    },

    getRepetitionTypeName(type) {
        if (type === null || type === undefined) return null;
        return FieldRepetitionType[type] || `Unknown(${type})`;
    },

    getPageTypeName(type) {
        return PageType[type] || `Unknown(${type})`;
    },

    getBoundaryOrderName(order) {
        return BoundaryOrder[order] || `Unknown(${order})`;
    },
};

/**
 * Format bytes to human readable string
 */
export function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Format large numbers with commas
 */
export function formatNumber(num) {
    if (num === null || num === undefined) return '-';
    return num.toLocaleString();
}
