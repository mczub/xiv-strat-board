/**
 * xiv-strat-board - FF14 Strategy Board Encoder/Decoder
 *
 * Strategy board decoder (share code → JSON).
 */

import type { DecodeResult } from './types';
import { validateShareCode } from './validation';
import { decodeCipher } from './cipher';
import { parseBinary } from './binary';

/**
 * Decodes a share code to a strategy board.
 *
 * @param shareCode - Share code string (e.g., "[stgy:a...]")
 * @returns Decoded strategy board
 * @throws {Error} If share code is invalid or malformed
 *
 * @example
 * ```ts
 * import { decode } from 'xiv-strat-board';
 *
 * const board = decode('[stgy:aVe......]');
 *
 * console.log(board.name);
 * console.log(board.objects.length);
 * for (const obj of board.objects) {
 *   console.log(`${obj.type} at (${obj.x}, ${obj.y})`);
 * }
 * ```
 */
export function decode(shareCode: string): DecodeResult {
    // Validate share code format
    validateShareCode(shareCode);

    // Decode cipher and decompress
    const binary = decodeCipher(shareCode);

    // Parse binary format
    return parseBinary(binary);
}
