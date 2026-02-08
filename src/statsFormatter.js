/**
 * Statistics Value Formatter
 * Formats Parquet min/max statistics values based on physical and logical types
 */

import { EnumHelpers } from './parquetParser.js';

/**
 * Find the schema element for a column by its path
 * @param {Array} schema - The file's schema array
 * @param {Array} pathInSchema - The column's path_in_schema
 * @returns {Object|null} The matching SchemaElement or null
 */
export function findSchemaElement(schema, pathInSchema) {
    if (!schema || !pathInSchema || pathInSchema.length === 0) return null;

    // Simple approach: find by last element of path (column name)
    const columnName = pathInSchema[pathInSchema.length - 1];
    for (const elem of schema) {
        if (elem.name === columnName && elem.type !== undefined) {
            return elem;
        }
    }

    // Fallback: search by full path match
    const targetPath = pathInSchema.join('.');
    for (const elem of schema) {
        if (elem.name === targetPath) {
            return elem;
        }
    }

    return null;
}

/**
 * Get the logical type info from a schema element
 * @param {Object} schemaElement - The schema element
 * @returns {Object} Object with logicalType name and details
 */
function getLogicalTypeInfo(schemaElement) {
    if (!schemaElement) return { type: null, details: null };

    // Check new-style LogicalType first
    const logicalType = schemaElement.logicalType;
    if (logicalType) {
        if (logicalType.STRING) return { type: 'STRING', details: null };
        if (logicalType.DATE) return { type: 'DATE', details: null };
        if (logicalType.TIME)
            return {
                type: 'TIME',
                details: {
                    isAdjustedToUTC: logicalType.TIME.isAdjustedToUTC,
                    unit: logicalType.TIME.unit,
                },
            };
        if (logicalType.TIMESTAMP)
            return {
                type: 'TIMESTAMP',
                details: {
                    isAdjustedToUTC: logicalType.TIMESTAMP.isAdjustedToUTC,
                    unit: logicalType.TIMESTAMP.unit,
                },
            };
        if (logicalType.INTEGER)
            return {
                type: 'INTEGER',
                details: {
                    bitWidth: logicalType.INTEGER.bitWidth,
                    isSigned: logicalType.INTEGER.isSigned,
                },
            };
        if (logicalType.DECIMAL)
            return {
                type: 'DECIMAL',
                details: {
                    scale: logicalType.DECIMAL.scale,
                    precision: logicalType.DECIMAL.precision,
                },
            };
        if (logicalType.UUID) return { type: 'UUID', details: null };
        if (logicalType.JSON) return { type: 'JSON', details: null };
        if (logicalType.BSON) return { type: 'BSON', details: null };
        if (logicalType.ENUM) return { type: 'ENUM', details: null };
    }

    // Fallback to converted_type
    const convertedType = schemaElement.converted_type;
    if (convertedType !== null && convertedType !== undefined) {
        const name = EnumHelpers.getConvertedTypeName(convertedType);

        // Map converted types to logical type names
        switch (name) {
            case 'UTF8':
                return { type: 'STRING', details: null };
            case 'DATE':
                return { type: 'DATE', details: null };
            case 'TIME_MILLIS':
                return { type: 'TIME', details: { unit: { MILLIS: {} } } };
            case 'TIME_MICROS':
                return { type: 'TIME', details: { unit: { MICROS: {} } } };
            case 'TIMESTAMP_MILLIS':
                return { type: 'TIMESTAMP', details: { unit: { MILLIS: {} } } };
            case 'TIMESTAMP_MICROS':
                return { type: 'TIMESTAMP', details: { unit: { MICROS: {} } } };
            case 'DECIMAL':
                return {
                    type: 'DECIMAL',
                    details: {
                        scale: schemaElement.scale || 0,
                        precision: schemaElement.precision || 0,
                    },
                };
            case 'INT_8':
                return { type: 'INTEGER', details: { bitWidth: 8, isSigned: true } };
            case 'INT_16':
                return { type: 'INTEGER', details: { bitWidth: 16, isSigned: true } };
            case 'INT_32':
                return { type: 'INTEGER', details: { bitWidth: 32, isSigned: true } };
            case 'INT_64':
                return { type: 'INTEGER', details: { bitWidth: 64, isSigned: true } };
            case 'UINT_8':
                return { type: 'INTEGER', details: { bitWidth: 8, isSigned: false } };
            case 'UINT_16':
                return { type: 'INTEGER', details: { bitWidth: 16, isSigned: false } };
            case 'UINT_32':
                return { type: 'INTEGER', details: { bitWidth: 32, isSigned: false } };
            case 'UINT_64':
                return { type: 'INTEGER', details: { bitWidth: 64, isSigned: false } };
            case 'JSON':
                return { type: 'JSON', details: null };
            case 'BSON':
                return { type: 'BSON', details: null };
            case 'ENUM':
                return { type: 'ENUM', details: null };
            default:
                return { type: name, details: null };
        }
    }

    return { type: null, details: null };
}

/**
 * Get the time unit multiplier to convert to milliseconds
 */
function getTimeUnitMultiplier(unit) {
    if (!unit) return 1;
    if (unit.MILLIS) return 1;
    if (unit.MICROS) return 0.001;
    if (unit.NANOS) return 0.000001;
    return 1;
}

/**
 * Get time unit name for display
 */
function getTimeUnitName(unit) {
    if (!unit) return 'ms';
    if (unit.MILLIS) return 'ms';
    if (unit.MICROS) return 'us';
    if (unit.NANOS) return 'ns';
    return 'ms';
}

/**
 * Format a timestamp value to ISO string
 */
function formatTimestamp(value, unit) {
    try {
        const multiplier = getTimeUnitMultiplier(unit);
        const ms = Number(value) * multiplier;
        const date = new Date(ms);

        if (isNaN(date.getTime())) {
            return value.toString();
        }

        // Format as ISO string but more readable
        return date.toISOString().replace('T', ' ').replace('Z', ' UTC');
    } catch (e) {
        return value.toString();
    }
}

/**
 * Format a date value (days since epoch) to human-readable date
 */
function formatDate(days) {
    try {
        const ms = Number(days) * 24 * 60 * 60 * 1000;
        const date = new Date(ms);

        if (isNaN(date.getTime())) {
            return days.toString();
        }

        return date.toISOString().split('T')[0]; // YYYY-MM-DD
    } catch (e) {
        return days.toString();
    }
}

/**
 * Format a time value (time since midnight) to HH:MM:SS
 */
function formatTime(value, unit) {
    try {
        const multiplier = getTimeUnitMultiplier(unit);
        let totalMs = Number(value) * multiplier;

        const hours = Math.floor(totalMs / 3600000);
        totalMs -= hours * 3600000;
        const minutes = Math.floor(totalMs / 60000);
        totalMs -= minutes * 60000;
        const seconds = Math.floor(totalMs / 1000);
        const ms = Math.round(totalMs - seconds * 1000);

        const hh = hours.toString().padStart(2, '0');
        const mm = minutes.toString().padStart(2, '0');
        const ss = seconds.toString().padStart(2, '0');

        if (ms > 0) {
            return `${hh}:${mm}:${ss}.${ms.toString().padStart(3, '0')}`;
        }
        return `${hh}:${mm}:${ss}`;
    } catch (e) {
        return value.toString();
    }
}

/**
 * Format a decimal value with scale
 */
function formatDecimal(intValue, scale) {
    try {
        const str = intValue.toString();
        if (scale === 0) return str;

        // Handle negative numbers
        const isNegative = str.startsWith('-');
        const absStr = isNegative ? str.slice(1) : str;

        // Pad with leading zeros if needed
        const padded = absStr.padStart(scale + 1, '0');
        const intPart = padded.slice(0, -scale) || '0';
        const decPart = padded.slice(-scale);

        return (isNegative ? '-' : '') + intPart + '.' + decPart;
    } catch (e) {
        return intValue.toString();
    }
}

/**
 * Format a UUID from bytes
 */
function formatUUID(bytes) {
    try {
        if (bytes.length !== 16) {
            return Array.from(bytes)
                .map((b) => b.toString(16).padStart(2, '0'))
                .join('');
        }

        const hex = Array.from(bytes)
            .map((b) => b.toString(16).padStart(2, '0'))
            .join('');
        return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
    } catch (e) {
        return Array.from(bytes)
            .map((b) => b.toString(16).padStart(2, '0'))
            .join('');
    }
}

/**
 * Parse INT96 timestamp (12 bytes: 8 bytes nanoseconds + 4 bytes Julian day)
 */
function parseINT96Timestamp(bytes) {
    try {
        if (bytes.length !== 12) return null;

        const view = new DataView(bytes.buffer, bytes.byteOffset, 12);

        // First 8 bytes: nanoseconds within the day (little-endian)
        const nanoLow = view.getUint32(0, true);
        const nanoHigh = view.getUint32(4, true);
        const nanoseconds = BigInt(nanoLow) + (BigInt(nanoHigh) << 32n);

        // Last 4 bytes: Julian day number (little-endian)
        const julianDay = view.getInt32(8, true);

        // Convert Julian day to Unix timestamp
        // Julian day 2440588 = 1970-01-01
        const unixDays = julianDay - 2440588;
        const unixMs = BigInt(unixDays) * 86400000n + nanoseconds / 1000000n;

        return new Date(Number(unixMs));
    } catch (e) {
        return null;
    }
}

/**
 * Format a statistic value based on type information
 * @param {Uint8Array} value - The raw bytes of the statistic
 * @param {Object} columnMeta - The column metadata (ColumnMetaData)
 * @param {Object} schemaElement - The schema element (optional, for logical type info)
 * @returns {string} Formatted value
 */
export function formatStatValue(value, columnMeta, schemaElement = null) {
    if (!value || !columnMeta) return 'N/A';

    const physicalType = EnumHelpers.getTypeName(columnMeta.type);
    const logicalInfo = getLogicalTypeInfo(schemaElement);

    try {
        const view = new DataView(value.buffer, value.byteOffset, value.length);

        // Handle BOOLEAN
        if (physicalType === 'BOOLEAN') {
            return value[0] ? 'true' : 'false';
        }

        // Handle INT32
        if (physicalType === 'INT32') {
            if (value.length < 4) return 'N/A';
            const intValue = view.getInt32(0, true);

            // Check logical type
            if (logicalInfo.type === 'DATE') {
                return formatDate(intValue);
            }
            if (logicalInfo.type === 'TIME') {
                return formatTime(intValue, logicalInfo.details?.unit);
            }
            if (logicalInfo.type === 'DECIMAL') {
                return formatDecimal(intValue, logicalInfo.details?.scale || 0);
            }

            // Regular integer
            return intValue.toLocaleString();
        }

        // Handle INT64
        if (physicalType === 'INT64') {
            if (value.length < 8) return 'N/A';
            const bigIntValue = view.getBigInt64(0, true);

            // Check logical type
            if (logicalInfo.type === 'TIMESTAMP') {
                return formatTimestamp(bigIntValue, logicalInfo.details?.unit);
            }
            if (logicalInfo.type === 'TIME') {
                return formatTime(bigIntValue, logicalInfo.details?.unit);
            }
            if (logicalInfo.type === 'DECIMAL') {
                return formatDecimal(bigIntValue, logicalInfo.details?.scale || 0);
            }

            // Regular big integer - format with locale
            return bigIntValue.toLocaleString();
        }

        // Handle INT96 (legacy timestamp)
        if (physicalType === 'INT96') {
            const date = parseINT96Timestamp(value);
            if (date && !isNaN(date.getTime())) {
                return date.toISOString().replace('T', ' ').replace('Z', ' UTC');
            }
            // Fallback to hex
            return Array.from(value.slice(0, 12))
                .map((b) => b.toString(16).padStart(2, '0'))
                .join(' ');
        }

        // Handle FLOAT
        if (physicalType === 'FLOAT') {
            if (value.length < 4) return 'N/A';
            const floatValue = view.getFloat32(0, true);

            // Handle special values
            if (!isFinite(floatValue)) {
                if (isNaN(floatValue)) return 'NaN';
                return floatValue > 0 ? '+Infinity' : '-Infinity';
            }

            // Format with appropriate precision
            if (Math.abs(floatValue) < 0.0001 || Math.abs(floatValue) >= 1000000) {
                return floatValue.toExponential(4);
            }
            return floatValue.toPrecision(6).replace(/\.?0+$/, '');
        }

        // Handle DOUBLE
        if (physicalType === 'DOUBLE') {
            if (value.length < 8) return 'N/A';
            const doubleValue = view.getFloat64(0, true);

            // Handle special values
            if (!isFinite(doubleValue)) {
                if (isNaN(doubleValue)) return 'NaN';
                return doubleValue > 0 ? '+Infinity' : '-Infinity';
            }

            // Format with appropriate precision
            if (Math.abs(doubleValue) < 0.0001 || Math.abs(doubleValue) >= 1000000) {
                return doubleValue.toExponential(6);
            }
            return doubleValue.toPrecision(10).replace(/\.?0+$/, '');
        }

        // Handle BYTE_ARRAY and FIXED_LEN_BYTE_ARRAY
        if (physicalType === 'BYTE_ARRAY' || physicalType === 'FIXED_LEN_BYTE_ARRAY') {
            // Check logical type for UUID
            if (logicalInfo.type === 'UUID') {
                return formatUUID(value);
            }

            // Check for decimal stored as byte array
            if (logicalInfo.type === 'DECIMAL') {
                // Decimal in byte array is stored as big-endian two's complement
                let bigInt = 0n;
                const isNegative = value[0] & 0x80;

                for (let i = 0; i < value.length; i++) {
                    bigInt = (bigInt << 8n) | BigInt(isNegative ? value[i] ^ 0xff : value[i]);
                }

                if (isNegative) {
                    bigInt = -(bigInt + 1n);
                }

                return formatDecimal(bigInt, logicalInfo.details?.scale || 0);
            }

            // Try to decode as UTF-8 string (for STRING, JSON, ENUM types)
            if (
                logicalInfo.type === 'STRING' ||
                logicalInfo.type === 'JSON' ||
                logicalInfo.type === 'ENUM' ||
                logicalInfo.type === null
            ) {
                try {
                    const decoder = new TextDecoder('utf-8', { fatal: true });
                    const text = decoder.decode(value);

                    // Check if it looks like valid text (no control characters except newline/tab)
                    const isPrintable = /^[\x20-\x7E\t\n\r\u00A0-\uFFFF]*$/.test(text);

                    if (isPrintable) {
                        // Truncate long strings
                        if (text.length > 50) {
                            return `"${text.substring(0, 47)}..."`;
                        }
                        return `"${text}"`;
                    }
                } catch (e) {
                    // Not valid UTF-8, fall through to hex
                }
            }

            // Fallback to hex for binary data
            const hexStr = Array.from(value.slice(0, 16))
                .map((b) => b.toString(16).padStart(2, '0'))
                .join(' ');
            return value.length > 16 ? hexStr + '...' : hexStr;
        }

        return 'N/A';
    } catch (e) {
        // Fallback to hex representation
        return (
            Array.from(value.slice(0, 16))
                .map((b) => b.toString(16).padStart(2, '0'))
                .join(' ') + (value.length > 16 ? '...' : '')
        );
    }
}

/**
 * Get a description of the logical type for display
 */
export function getLogicalTypeDescription(schemaElement) {
    const info = getLogicalTypeInfo(schemaElement);
    if (!info.type) return null;

    switch (info.type) {
        case 'TIMESTAMP': {
            const tsUnit = getTimeUnitName(info.details?.unit);
            const tz = info.details?.isAdjustedToUTC ? 'UTC' : 'local';
            return `Timestamp (${tsUnit}, ${tz})`;
        }
        case 'TIME': {
            const timeUnit = getTimeUnitName(info.details?.unit);
            return `Time (${timeUnit})`;
        }
        case 'DATE':
            return 'Date';
        case 'DECIMAL':
            return `Decimal(${info.details?.precision}, ${info.details?.scale})`;
        case 'STRING':
            return 'String';
        case 'UUID':
            return 'UUID';
        case 'JSON':
            return 'JSON';
        case 'INTEGER': {
            const sign = info.details?.isSigned ? 'signed' : 'unsigned';
            return `Int${info.details?.bitWidth} (${sign})`;
        }
        default:
            return info.type;
    }
}
