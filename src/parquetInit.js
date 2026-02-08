/**
 * Parquet Types Initialization
 * Sets up the global Thrift object and loads parquet_types.js
 *
 * Note: parquet_types.js uses implicit global assignments (Type = {...})
 * which don't work in ES modules (strict mode). We load it as a classic
 * script to avoid this issue.
 */

import { Thrift, TCompactProtocolReader } from './thrift.js';
import parquetTypesSource from './parquet_types.js?raw';

// Provide Int64 shim for browser (parquet_types.js expects node-int64)
// This is a minimal implementation that works for Parquet metadata parsing
class Int64 {
    constructor(value) {
        if (typeof value === 'bigint') {
            this.value = value;
        } else if (typeof value === 'number') {
            this.value = BigInt(value);
        } else if (value instanceof Int64) {
            this.value = value.value;
        } else {
            this.value = BigInt(0);
        }
    }

    toNumber() {
        return Number(this.value);
    }

    toString() {
        return this.value.toString();
    }

    valueOf() {
        return Number(this.value);
    }
}

// Make Int64 available globally for parquet_types.js
window.Int64 = Int64;

// Make Thrift available globally BEFORE parquet_types.js is evaluated
window.Thrift = Thrift;

// Execute parquet_types.js in non-strict mode using Function constructor
// This allows the implicit global variable assignments to work
// We prepend variable declarations to avoid hoisting issues where
// `var Int64` inside an if-block shadows the global
const preamble = 'var Int64 = window.Int64; var Thrift = window.Thrift;\n';
new Function(preamble + parquetTypesSource)();

// Re-export everything needed
export { Thrift, TCompactProtocolReader };

// Export the parquet types from window (where parquet_types.js puts them)
export const FileMetaData = window.FileMetaData;
export const ColumnIndex = window.ColumnIndex;
export const OffsetIndex = window.OffsetIndex;
export const Type = window.Type;
export const ConvertedType = window.ConvertedType;
export const CompressionCodec = window.CompressionCodec;
export const Encoding = window.Encoding;
export const FieldRepetitionType = window.FieldRepetitionType;
export const PageType = window.PageType;
export const BoundaryOrder = window.BoundaryOrder;
