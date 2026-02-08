/**
 * Thrift Compact Protocol Reader for Browser
 * Implements the reading portion of Thrift Compact Protocol
 * https://github.com/apache/thrift/blob/master/doc/specs/thrift-compact-protocol.md
 */

// Thrift type constants (as expected by parquet_types.js)
export const Thrift = {
  Type: {
    STOP: 0,
    BOOL_TRUE: 1,
    BOOL_FALSE: 2,
    BYTE: 3,
    I16: 4,
    I32: 5,
    I64: 6,
    DOUBLE: 7,
    STRING: 8, // Also used for BINARY
    LIST: 9,
    SET: 10,
    MAP: 11,
    STRUCT: 12,
    // Aliases for parquet_types.js compatibility
    BOOL: 2,
    I08: 3,
  },
  copyList: function(lst, types) {
    if (!lst) return lst;
    return lst.slice();
  },
  TProtocolException: class TProtocolException extends Error {
    constructor(type, message) {
      super(message);
      this.type = type;
    }
  },
  TProtocolExceptionType: {
    UNKNOWN: 0,
    INVALID_DATA: 1,
    NEGATIVE_SIZE: 2,
    SIZE_LIMIT: 3,
    BAD_VERSION: 4,
    NOT_IMPLEMENTED: 5,
    DEPTH_LIMIT: 6,
  }
};

// Compact protocol type IDs
const COMPACT_TYPES = {
  STOP: 0,
  BOOL_TRUE: 1,
  BOOL_FALSE: 2,
  BYTE: 3,
  I16: 4,
  I32: 5,
  I64: 6,
  DOUBLE: 7,
  BINARY: 8,
  LIST: 9,
  SET: 10,
  MAP: 11,
  STRUCT: 12,
};

// Map compact type to Thrift type
function compactTypeToThriftType(compactType) {
  switch (compactType) {
    case COMPACT_TYPES.STOP: return Thrift.Type.STOP;
    case COMPACT_TYPES.BOOL_TRUE: return Thrift.Type.BOOL;
    case COMPACT_TYPES.BOOL_FALSE: return Thrift.Type.BOOL;
    case COMPACT_TYPES.BYTE: return Thrift.Type.BYTE;
    case COMPACT_TYPES.I16: return Thrift.Type.I16;
    case COMPACT_TYPES.I32: return Thrift.Type.I32;
    case COMPACT_TYPES.I64: return Thrift.Type.I64;
    case COMPACT_TYPES.DOUBLE: return Thrift.Type.DOUBLE;
    case COMPACT_TYPES.BINARY: return Thrift.Type.STRING;
    case COMPACT_TYPES.LIST: return Thrift.Type.LIST;
    case COMPACT_TYPES.SET: return Thrift.Type.SET;
    case COMPACT_TYPES.MAP: return Thrift.Type.MAP;
    case COMPACT_TYPES.STRUCT: return Thrift.Type.STRUCT;
    default: return compactType;
  }
}

/**
 * Thrift Compact Protocol Reader
 */
export class TCompactProtocolReader {
  constructor(buffer) {
    this.buffer = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
    this.view = new DataView(this.buffer.buffer, this.buffer.byteOffset, this.buffer.byteLength);
    this.offset = 0;
    this.lastFieldId = [0];
    this.boolValue = null;
  }

  // Read a single byte
  readByte() {
    if (this.offset >= this.buffer.length) {
      throw new Error('Buffer underflow');
    }
    return { value: this.buffer[this.offset++] };
  }

  // Read signed byte
  readSignedByte() {
    const val = this.readByte().value;
    return { value: val > 127 ? val - 256 : val };
  }

  // Read varint (variable length integer)
  readVarint() {
    let result = 0n;
    let shift = 0n;
    let byte;
    do {
      if (this.offset >= this.buffer.length) {
        throw new Error('Buffer underflow reading varint');
      }
      byte = this.buffer[this.offset++];
      result |= BigInt(byte & 0x7f) << shift;
      shift += 7n;
    } while (byte & 0x80);
    return result;
  }

  // Read zigzag encoded varint (for signed integers)
  readZigZag() {
    const n = this.readVarint();
    return (n >> 1n) ^ (-(n & 1n));
  }

  // Read i16
  readI16() {
    const val = this.readZigZag();
    return { value: Number(val) };
  }

  // Read i32
  readI32() {
    const val = this.readZigZag();
    return { value: Number(val) };
  }

  // Read i64
  readI64() {
    const val = this.readZigZag();
    // Return as number if safe, otherwise as BigInt
    if (val >= BigInt(Number.MIN_SAFE_INTEGER) && val <= BigInt(Number.MAX_SAFE_INTEGER)) {
      return { value: Number(val) };
    }
    return { value: val };
  }

  // Read double (8 bytes, little endian)
  readDouble() {
    if (this.offset + 8 > this.buffer.length) {
      throw new Error('Buffer underflow reading double');
    }
    const value = this.view.getFloat64(this.offset, true);
    this.offset += 8;
    return { value };
  }

  // Read binary/string
  readBinary() {
    const length = Number(this.readVarint());
    if (length < 0) {
      throw new Error('Negative binary length');
    }
    if (this.offset + length > this.buffer.length) {
      throw new Error('Buffer underflow reading binary');
    }
    const value = this.buffer.slice(this.offset, this.offset + length);
    this.offset += length;
    return { value };
  }

  // Read string (UTF-8 decoded)
  readString() {
    const binary = this.readBinary();
    const decoder = new TextDecoder('utf-8');
    return { value: decoder.decode(binary.value) };
  }

  // Read bool
  readBool() {
    if (this.boolValue !== null) {
      const value = this.boolValue;
      this.boolValue = null;
      return { value };
    }
    const byte = this.readByte().value;
    return { value: byte === 1 };
  }

  // Read struct begin (no-op for compact protocol)
  readStructBegin() {
    this.lastFieldId.push(0);
    return {};
  }

  // Read struct end
  readStructEnd() {
    this.lastFieldId.pop();
  }

  // Read field begin
  readFieldBegin() {
    const byte = this.readByte().value;

    if (byte === 0) {
      return { ftype: Thrift.Type.STOP, fid: 0 };
    }

    const delta = (byte >> 4) & 0x0f;
    let compactType = byte & 0x0f;
    let fieldId;

    if (delta === 0) {
      // Long form - field id is a zigzag varint
      fieldId = Number(this.readZigZag());
    } else {
      // Short form - delta encoded
      fieldId = this.lastFieldId[this.lastFieldId.length - 1] + delta;
    }

    this.lastFieldId[this.lastFieldId.length - 1] = fieldId;

    // Handle inline bool value
    if (compactType === COMPACT_TYPES.BOOL_TRUE) {
      this.boolValue = true;
      compactType = COMPACT_TYPES.BOOL_TRUE;
    } else if (compactType === COMPACT_TYPES.BOOL_FALSE) {
      this.boolValue = false;
      compactType = COMPACT_TYPES.BOOL_FALSE;
    }

    return {
      ftype: compactTypeToThriftType(compactType),
      fid: fieldId
    };
  }

  // Read field end (no-op)
  readFieldEnd() {}

  // Read list begin
  readListBegin() {
    const byte = this.readByte().value;
    let size = (byte >> 4) & 0x0f;
    const elemType = byte & 0x0f;

    if (size === 15) {
      // Large list
      size = Number(this.readVarint());
    }

    return {
      etype: compactTypeToThriftType(elemType),
      size: size
    };
  }

  // Read list end (no-op)
  readListEnd() {}

  // Read map begin
  readMapBegin() {
    const size = Number(this.readVarint());
    if (size === 0) {
      return { ktype: Thrift.Type.STOP, vtype: Thrift.Type.STOP, size: 0 };
    }
    const types = this.readByte().value;
    return {
      ktype: compactTypeToThriftType((types >> 4) & 0x0f),
      vtype: compactTypeToThriftType(types & 0x0f),
      size: size
    };
  }

  // Read map end (no-op)
  readMapEnd() {}

  // Read set begin (same as list)
  readSetBegin() {
    return this.readListBegin();
  }

  // Read set end (no-op)
  readSetEnd() {}

  // Skip a value of the given type
  skip(type) {
    switch (type) {
      case Thrift.Type.STOP:
        break;
      case Thrift.Type.BOOL:
      case Thrift.Type.BOOL_TRUE:
      case Thrift.Type.BOOL_FALSE:
        if (this.boolValue === null) {
          this.readByte();
        } else {
          this.boolValue = null;
        }
        break;
      case Thrift.Type.BYTE:
      case Thrift.Type.I08:
        this.readByte();
        break;
      case Thrift.Type.I16:
        this.readI16();
        break;
      case Thrift.Type.I32:
        this.readI32();
        break;
      case Thrift.Type.I64:
        this.readI64();
        break;
      case Thrift.Type.DOUBLE:
        this.readDouble();
        break;
      case Thrift.Type.STRING:
        this.readBinary();
        break;
      case Thrift.Type.STRUCT:
        this.readStructBegin();
        while (true) {
          const field = this.readFieldBegin();
          if (field.ftype === Thrift.Type.STOP) break;
          this.skip(field.ftype);
          this.readFieldEnd();
        }
        this.readStructEnd();
        break;
      case Thrift.Type.LIST:
      case Thrift.Type.SET:
        const list = this.readListBegin();
        for (let i = 0; i < list.size; i++) {
          this.skip(list.etype);
        }
        this.readListEnd();
        break;
      case Thrift.Type.MAP:
        const map = this.readMapBegin();
        for (let i = 0; i < map.size; i++) {
          this.skip(map.ktype);
          this.skip(map.vtype);
        }
        this.readMapEnd();
        break;
      default:
        throw new Error(`Unknown type to skip: ${type}`);
    }
  }
}

// Make Thrift available globally for parquet_types.js
if (typeof window !== 'undefined') {
  window.Thrift = Thrift;
}
