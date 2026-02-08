import { EnumHelpers } from '../../parquetParser.js';
import { SHORT_ENCODING_NAMES } from './constants.js';

/**
 * Get short encoding name for display
 */
export function getShortEncodingName(encodingValue) {
  const fullName = EnumHelpers.getEncodingName(encodingValue);
  return SHORT_ENCODING_NAMES[fullName] || fullName;
}

/**
 * Get primary encodings for display (exclude level encodings like RLE for def/rep levels)
 */
export function getPrimaryEncodings(encodings, encodingStats) {
  if (!encodings || encodings.length === 0) return [];

  // If we have encoding_stats, use them to identify data page encodings
  if (encodingStats && encodingStats.length > 0) {
    const dataEncodings = new Set();
    for (const stat of encodingStats) {
      // PageType 0 = DATA_PAGE, 3 = DATA_PAGE_V2
      if (stat.page_type === 0 || stat.page_type === 3) {
        dataEncodings.add(stat.encoding);
      }
    }
    if (dataEncodings.size > 0) {
      return [...dataEncodings];
    }
  }

  // Fallback: return unique encodings, prioritizing dictionary encodings
  const uniqueEncodings = [...new Set(encodings)];
  // Filter out RLE if there are other encodings (RLE is typically for levels only)
  if (uniqueEncodings.length > 1) {
    const filtered = uniqueEncodings.filter((e) => {
      const name = EnumHelpers.getEncodingName(e);
      return name !== 'RLE' && name !== 'BIT_PACKED';
    });
    if (filtered.length > 0) return filtered;
  }
  return uniqueEncodings;
}

/**
 * Format encoding stats for display
 */
export function formatEncodingStats(encodingStats) {
  if (!encodingStats || encodingStats.length === 0) return null;

  const grouped = {};
  for (const stat of encodingStats) {
    const pageType = EnumHelpers.getPageTypeName(stat.page_type);
    const encoding = getShortEncodingName(stat.encoding);
    const key = `${pageType}:${encoding}`;
    if (!grouped[key]) {
      grouped[key] = { pageType, encoding, count: 0 };
    }
    grouped[key].count += stat.count;
  }

  return Object.values(grouped);
}
