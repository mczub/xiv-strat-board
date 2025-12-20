/**
 * xiv-strat-board - FF14 Strategy Board Encoder/Decoder
 *
 * Encode and decode FF14 Strategy Board share codes.
 *
 * @packageDocumentation
 */

// Main API
export { encode } from './encoder';
export { decode } from './decoder';

// Types
export type {
    StrategyBoard,
    StrategyObject,
    DecodeResult,
    EncodeOptions,
    IconType,
    BackgroundType,
} from './types';

// Constants (for advanced usage)
export { ICON_TYPE_IDS, ICON_TYPES } from './constants';
