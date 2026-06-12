// ============================================================================
// Similarity Calculation Utilities
// Jaccard Index for pattern confidence scoring
// ============================================================================

/**
 * Calculate Jaccard Similarity between two sets
 * J(A, B) = |A ∩ B| / |A ∪ B|
 *
 * @param setA - First set of elements
 * @param setB - Second set of elements
 * @returns Jaccard similarity coefficient (0-1 scale)
 *
 * @example
 * jaccardSimilarity(['a', 'b', 'c'], ['b', 'c', 'd']) => 0.5
 * // Intersection: {b, c} = 2 elements
 * // Union: {a, b, c, d} = 4 elements
 * // Jaccard: 2/4 = 0.5
 */
export function jaccardSimilarity(setA: string[], setB: string[]): number {
  if (setA.length === 0 && setB.length === 0) return 1.0; // Empty sets are identical
  if (setA.length === 0 || setB.length === 0) return 0.0; // No overlap possible

  // Convert to Sets for efficient intersection/union operations
  const normalizedA = new Set(setA.map((s) => s.toLowerCase().trim()));
  const normalizedB = new Set(setB.map((s) => s.toLowerCase().trim()));

  // Calculate intersection: elements in both sets
  const intersection = new Set([...normalizedA].filter((x) => normalizedB.has(x)));

  // Calculate union: all unique elements from both sets
  const union = new Set([...normalizedA, ...normalizedB]);

  // Jaccard coefficient: |A ∩ B| / |A ∪ B|
  return intersection.size / union.size;
}

/**
 * Calculate confidence score for pattern matching
 * Uses Jaccard similarity with optional prioritization boost
 *
 * @param patternIndicators - All indicators defined in the pattern
 * @param matchedIndicators - Indicators found in the input text
 * @param isPrioritized - Whether this pattern is prioritized (15% boost)
 * @returns Confidence score (0-1 scale)
 */
export function calculatePatternConfidence(
  patternIndicators: string[],
  matchedIndicators: string[],
  isPrioritized = false,
): number {
  const baseConfidence = jaccardSimilarity(patternIndicators, matchedIndicators);
  const PRIORITY_BOOST = 1.15;
  const adjustedConfidence = isPrioritized
    ? Math.min(baseConfidence * PRIORITY_BOOST, 1.0)
    : baseConfidence;
  return adjustedConfidence;
}
