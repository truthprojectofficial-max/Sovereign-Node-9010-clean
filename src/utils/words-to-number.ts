// ============================================================================
// English Description → Number Extractor
// Sovereign Node 9010 — Groknett ValueForge
// INPUT MUST BE A DESCRIPTION (a sentence), NOT a bare number or number-words.
// e.g. "The store listed it at five hundred and ninety-nine dollars"
// NOT: "599"  NOT: "five hundred ninety-nine"
// ============================================================================

const ONES: Record<string, number> = {
  zero: 0,
  none: 0,
  nil: 0,
  nothing: 0,
  nought: 0,
  no: 0,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  thirteen: 13,
  fourteen: 14,
  fifteen: 15,
  sixteen: 16,
  seventeen: 17,
  eighteen: 18,
  nineteen: 19,
};

const TENS: Record<string, number> = {
  twenty: 20,
  thirty: 30,
  forty: 40,
  fifty: 50,
  sixty: 60,
  seventy: 70,
  eighty: 80,
  ninety: 90,
};

const MAGNITUDES: Record<string, number> = {
  hundred: 100,
  thousand: 1_000,
  million: 1_000_000,
  billion: 1_000_000_000,
};

// All words that are purely "number words" — if the input is ONLY these, it's not a description
const ALL_NUMBER_WORDS = new Set([
  ...Object.keys(ONES),
  ...Object.keys(TENS),
  ...Object.keys(MAGNITUDES),
  'and',
  'a',
  'point',
  'half',
  'quarter',
  'quarters',
  'dollars',
  'dollar',
]);

/**
 * Returns true when the raw input looks like bare digits.
 */
export function isRawNumber(input: string): boolean {
  const trimmed = input.trim();
  if (trimmed === '') return false;
  return /^-?[\d][\d,]*\.?\d*$/.test(trimmed);
}

/**
 * Returns true when the input is ONLY number-words with no descriptive context.
 * e.g. "five hundred ninety-nine" → true (just depicting a number)
 *      "The store listed it at five hundred ninety-nine dollars" → false (description)
 */
export function isOnlyNumberWords(input: string): boolean {
  const tokens = input
    .trim()
    .toLowerCase()
    .replace(/-/g, ' ')
    .replace(/[.,!?;:()]/g, '')
    .split(/\s+/)
    .filter((t) => t.length > 0);
  if (tokens.length === 0) return false;
  return tokens.every((t) => ALL_NUMBER_WORDS.has(t));
}

/**
 * Convert a sequence of English number-words to a number.
 */
export function wordsToNumber(input: string): number | null {
  const raw = input.trim().toLowerCase();
  if (raw === '') return null;

  const normalised = raw
    .replace(/\ba\s+/g, 'one ')
    .replace(/-/g, ' ')
    .replace(/\band\b/g, '')
    .replace(/,/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (normalised === 'half') return 0.5;
  if (normalised === 'quarter') return 0.25;
  if (normalised === 'three quarters') return 0.75;

  const pointParts = normalised.split(/\bpoint\b/);
  if (pointParts.length === 2) {
    const wholePart = parseEnglishInt(pointParts[0].trim());
    const decimalWords = pointParts[1].trim().split(/\s+/);
    let decimalStr = '';
    for (const w of decimalWords) {
      const d = ONES[w];
      if (d !== undefined) {
        decimalStr += String(d);
      } else {
        return null;
      }
    }
    if (wholePart === null) return null;
    return parseFloat(`${wholePart}.${decimalStr}`);
  }

  return parseEnglishInt(normalised);
}

function parseEnglishInt(phrase: string): number | null {
  if (!phrase || phrase.trim() === '') return 0;
  const tokens = phrase.trim().split(/\s+/);
  let current = 0;
  let total = 0;

  for (const token of tokens) {
    if (ONES[token] !== undefined) {
      current += ONES[token];
    } else if (TENS[token] !== undefined) {
      current += TENS[token];
    } else if (token === 'hundred') {
      current = (current === 0 ? 1 : current) * 100;
    } else if (token === 'thousand' || token === 'million' || token === 'billion') {
      current = (current === 0 ? 1 : current) * MAGNITUDES[token];
      total += current;
      current = 0;
    } else {
      return null;
    }
  }

  return total + current;
}

/**
 * Extract a number from within a descriptive English sentence.
 * Scans for number-word sequences and digit sequences embedded in the text.
 * Returns the first number found, or null.
 */
export function extractNumberFromDescription(text: string): number | null {
  const lower = text.toLowerCase().replace(/-/g, ' ').replace(/,/g, '');

  // Try to find embedded digit sequences first (e.g. "$599" in a sentence)
  // Only valid when surrounded by descriptive words — bare digits are caught earlier
  const digitMatch = lower.match(/\$?\s*(\d+\.?\d*)/);

  // Build list of number-word tokens and find contiguous runs
  const words = lower.split(/\s+/);
  const numberWordSet = new Set([
    ...Object.keys(ONES),
    ...Object.keys(TENS),
    ...Object.keys(MAGNITUDES),
    'and',
    'a',
    'point',
  ]);

  let bestRun: string[] = [];
  let currentRun: string[] = [];

  for (const w of words) {
    const clean = w.replace(/[.,!?;:()$]/g, '');
    if (numberWordSet.has(clean)) {
      currentRun.push(clean);
    } else {
      if (currentRun.length > bestRun.length) bestRun = currentRun;
      currentRun = [];
    }
  }
  if (currentRun.length > bestRun.length) bestRun = currentRun;

  // Try to parse the longest number-word run
  if (bestRun.length > 0) {
    const phrase = bestRun
      .join(' ')
      .replace(/\ba\s+/g, 'one ')
      .replace(/\band\b/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    const fromWords = wordsToNumber(phrase);
    if (fromWords !== null) return fromWords;
  }

  // Fall back to embedded digits if they exist
  if (digitMatch) {
    return parseFloat(digitMatch[1]);
  }

  return null;
}

/**
 * Validate + extract number from a description.
 * REJECTS: bare digits ("599"), bare number-words ("five hundred ninety-nine").
 * ACCEPTS: descriptive sentences with numbers in them.
 */
export function parseDescriptionInput(input: string): { value: number } | { error: string } {
  const trimmed = input.trim();
  if (trimmed === '') {
    return { error: 'Write a description (e.g. "The warranty was twenty-four months")' };
  }
  if (isRawNumber(trimmed)) {
    return { error: 'CAN NOT BE A NUMBER — write a description instead' };
  }
  if (isOnlyNumberWords(trimmed)) {
    return {
      error:
        'CAN NOT BE A NUMBER — "' +
        trimmed +
        '" is just a number in words. Describe it (e.g. "I paid five hundred and ninety-nine dollars at the store")',
    };
  }

  const num = extractNumberFromDescription(trimmed);
  if (num === null) {
    return {
      error:
        'No number found in your description. Include a value like "twenty-four months" or "five hundred dollars".',
    };
  }
  return { value: num };
}

// Keep old name as alias for backward compat
export const parseEnglishInput = parseDescriptionInput;
