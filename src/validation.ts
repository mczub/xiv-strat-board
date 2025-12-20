/**
 * xiv-strat-board - FF14 Strategy Board Encoder/Decoder
 *
 * Input validation and sanitization for secure public package usage.
 */

import type { StrategyBoard, StrategyObject } from './types';
import { ICON_TYPE_IDS, BOARD_BACKGROUND_IDS, OBJECT_BACKGROUND_IDS } from './constants';

/**
 * Board coordinate and property bounds.
 */
export const BOUNDS = {
    /** Minimum X coordinate (allows slight overflow for edge objects) */
    minX: -100,
    /** Maximum X coordinate */
    maxX: 612,
    /** Minimum Y coordinate */
    minY: -100,
    /** Maximum Y coordinate */
    maxY: 484,
    /** Minimum size percentage */
    minSize: 1,
    /** Maximum size percentage */
    maxSize: 255,
    /** Minimum arc angle */
    minArc: 0,
    /** Maximum arc angle */
    maxArc: 360,
    /** Minimum donut radius */
    minDonut: 0,
    /** Maximum donut radius */
    maxDonut: 255,
    /** Maximum number of objects per board */
    maxObjects: 50,
    /** Maximum name length (bytes) */
    maxNameLength: 7,
} as const;

/**
 * Characters allowed in cipher-encoded body.
 */
const VALID_CIPHER_CHARS = new Set(
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+-_'.split('')
);

/**
 * Validates the format of a share code string.
 *
 * @param code - The share code to validate
 * @throws {Error} If the share code format is invalid
 */
export function validateShareCode(code: string): void {
    if (typeof code !== 'string') {
        throw new Error('Share code must be a string');
    }

    if (code.length < 10) {
        throw new Error('Share code is too short');
    }

    if (code.length > 10000) {
        throw new Error('Share code is too long');
    }

    if (!code.startsWith('[stgy:a')) {
        throw new Error('Share code must start with "[stgy:a"');
    }

    if (!code.endsWith(']')) {
        throw new Error('Share code must end with "]"');
    }

    // Extract body (between [stgy:a and ])
    const body = code.slice(7, -1);

    if (body.length < 2) {
        throw new Error('Share code body is too short');
    }

    // Validate all characters in body
    for (const char of body) {
        if (!VALID_CIPHER_CHARS.has(char)) {
            throw new Error(`Invalid character in share code: "${char}"`);
        }
    }
}

/**
 * Clamps a number to a range.
 */
function clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
}

/**
 * Validates and sanitizes a board name.
 * Only allows ASCII alphanumeric characters, truncates to max length.
 *
 * @param name - The name to sanitize
 * @returns Sanitized name
 */
export function sanitizeName(name: string | undefined): string {
    if (!name || typeof name !== 'string') {
        return 'board';
    }

    // Remove non-ASCII and control characters, keep alphanumeric and some safe chars
    const sanitized = name
        .replace(/[^\x20-\x7E]/g, '') // Only printable ASCII
        .replace(/[<>:"/\\|?*]/g, '') // Remove filesystem-unsafe chars
        .trim()
        .slice(0, BOUNDS.maxNameLength);

    return sanitized || 'board';
}

/**
 * Validates and sanitizes a coordinate value.
 *
 * @param value - The coordinate value
 * @param isX - Whether this is an X coordinate
 * @returns Sanitized coordinate
 */
export function sanitizeCoordinate(value: unknown, isX: boolean): number {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
        return isX ? 256 : 192; // Default to center
    }

    const min = isX ? BOUNDS.minX : BOUNDS.minY;
    const max = isX ? BOUNDS.maxX : BOUNDS.maxY;

    return clamp(Math.round(value * 10) / 10, min, max);
}

/**
 * Validates and sanitizes a size value.
 *
 * @param value - The size value
 * @returns Sanitized size (50-200 range, default 100)
 */
export function sanitizeSize(value: unknown): number {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
        return 100;
    }
    return clamp(Math.round(value), BOUNDS.minSize, BOUNDS.maxSize);
}

/**
 * Validates and sanitizes a color component (0-255).
 */
export function sanitizeColorComponent(value: unknown): number {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
        return 255;
    }
    return clamp(Math.round(value), 0, 255);
}

/**
 * Parses a hex color string to RGB components.
 *
 * @param color - Hex color string (e.g., '#FF0000' or 'FF0000')
 * @returns RGB components or null if invalid
 */
export function parseHexColor(color: string | undefined): { r: number; g: number; b: number } | null {
    if (!color || typeof color !== 'string') {
        return null;
    }

    // Remove # prefix if present
    const hex = color.replace(/^#/, '');

    // Validate hex format
    if (!/^[0-9A-Fa-f]{6}$/.test(hex)) {
        return null;
    }

    return {
        r: parseInt(hex.slice(0, 2), 16),
        g: parseInt(hex.slice(2, 4), 16),
        b: parseInt(hex.slice(4, 6), 16),
    };
}

/**
 * Validates a background type value.
 */
export function validateBackground(value: unknown): number {
    if (typeof value === 'number') {
        if (value >= 0 && value <= 6) {
            return value;
        }
        return 0;
    }

    if (typeof value === 'string') {
        const id = OBJECT_BACKGROUND_IDS[value.toLowerCase()];
        return id ?? 0;
    }

    return 0;
}

/**
 * Validates a board background type value.
 */
export function validateBoardBackground(value: unknown): number {
    if (typeof value === 'string') {
        const id = BOARD_BACKGROUND_IDS[value.toLowerCase()];
        return id ?? 1;
    }

    if (typeof value === 'number' && value >= 1 && value <= 7) {
        return value;
    }

    return 1; // default: none
}

/**
 * Validates an icon type, returning the numeric ID.
 *
 * @param typeName - Icon type name or ID
 * @param typeId - Optional explicit type ID
 * @returns Numeric icon type ID
 * @throws {Error} If icon type is unknown
 */
export function validateIconType(typeName: string, typeId?: number): number {
    // Explicit typeId takes priority
    if (typeof typeId === 'number' && Number.isFinite(typeId) && typeId > 0 && typeId < 256) {
        return typeId;
    }

    // Look up by name
    const id = ICON_TYPE_IDS[typeName];
    if (id !== undefined) {
        return id;
    }

    // Try to parse as unknown_{id} format
    const unknownMatch = typeName.match(/^unknown_(\d+)$/);
    if (unknownMatch) {
        const parsedId = parseInt(unknownMatch[1], 10);
        if (parsedId > 0 && parsedId < 256) {
            return parsedId;
        }
    }

    throw new Error(`Unknown icon type: "${typeName}"`);
}

/**
 * Sanitizes a single strategy object.
 *
 * @param obj - The object to sanitize
 * @param index - Object index for error messages
 * @returns Sanitized object data
 * @throws {Error} If object data is invalid
 */
export function sanitizeObject(
    obj: StrategyObject,
    index: number
): {
    typeId: number;
    x: number;
    y: number;
    size: number;
    background: number;
    colorR: number;
    colorG: number;
    colorB: number;
    transparency: number;
    arcAngle: number;
    donutRadius: number;
    hidden: boolean;
    locked: boolean;
} {
    if (!obj || typeof obj !== 'object') {
        throw new Error(`Object at index ${index} is not a valid object`);
    }

    if (!obj.type && !obj.typeId) {
        throw new Error(`Object at index ${index} must have a type or typeId`);
    }

    const typeId = validateIconType(obj.type || '', obj.typeId);

    // Parse color from hex string or components
    let colorR = obj.colorR ?? 255;
    let colorG = obj.colorG ?? 255;
    let colorB = obj.colorB ?? 255;

    if (obj.color) {
        const parsed = parseHexColor(obj.color);
        if (parsed) {
            colorR = parsed.r;
            colorG = parsed.g;
            colorB = parsed.b;
        }
    }

    return {
        typeId,
        x: sanitizeCoordinate(obj.x, true),
        y: sanitizeCoordinate(obj.y, false),
        size: sanitizeSize(obj.size),
        background: validateBackground(obj.background),
        colorR: sanitizeColorComponent(colorR),
        colorG: sanitizeColorComponent(colorG),
        colorB: sanitizeColorComponent(colorB),
        transparency: sanitizeColorComponent(obj.transparency ?? 0),
        arcAngle: clamp(Math.round(obj.arcAngle ?? 0), BOUNDS.minArc, BOUNDS.maxArc),
        donutRadius: clamp(Math.round(obj.donutRadius ?? 0), BOUNDS.minDonut, BOUNDS.maxDonut),
        hidden: Boolean(obj.hidden),
        locked: Boolean(obj.locked),
    };
}

/**
 * Validates and sanitizes a complete strategy board for encoding.
 *
 * @param board - The board to sanitize
 * @returns Sanitized board data ready for binary encoding
 * @throws {Error} If board data is invalid
 */
export function sanitizeBoard(board: StrategyBoard): {
    name: string;
    boardBackground: number;
    objects: ReturnType<typeof sanitizeObject>[];
} {
    if (!board || typeof board !== 'object') {
        throw new Error('Board must be an object');
    }

    if (!Array.isArray(board.objects)) {
        throw new Error('Board must have an objects array');
    }

    if (board.objects.length > BOUNDS.maxObjects) {
        throw new Error(`Board has too many objects (max ${BOUNDS.maxObjects})`);
    }

    return {
        name: sanitizeName(board.name),
        boardBackground: validateBoardBackground(board.boardBackground),
        objects: board.objects.map((obj, i) => sanitizeObject(obj, i)),
    };
}
