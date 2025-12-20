/**
 * xiv-strat-board - FF14 Strategy Board Encoder/Decoder
 *
 * Strategy board encoder (JSON → share code).
 */

import type { StrategyBoard, EncodeOptions } from './types';
import { sanitizeBoard } from './validation';
import { buildBinary } from './binary';
import { encodeCipher } from './cipher';

/**
 * Encodes a strategy board to a share code.
 *
 * @param board - Strategy board to encode
 * @param options - Optional encoding options
 * @returns Share code string (e.g., "[stgy:a...]")
 * @throws {Error} If board data is invalid
 *
 * @example
 * ```ts
 * import { encode } from 'xiv-strat-board';
 *
 * const shareCode = encode({
 *   name: 'myboard',
 *   boardBackground: 'checkered',
 *   objects: [
 *     { type: 'tank', x: 256, y: 192, size: 100 },
 *     { type: 'healer', x: 300, y: 192, size: 100 },
 *   ],
 * });
 *
 * console.log(shareCode); // "[stgy:a...]"
 * ```
 */
export function encode(board: StrategyBoard, options?: EncodeOptions): string {
    // Validate and sanitize input
    const sanitized = sanitizeBoard(board);

    // Build binary format
    const binary = buildBinary(sanitized);

    // Encode with cipher
    return encodeCipher(binary, options?.key);
}
