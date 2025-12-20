/**
 * xiv-strat-board - FF14 Strategy Board Encoder/Decoder
 *
 * Cipher encoding and decoding (obfuscation layer).
 */

import pako from 'pako';
import {
    CIPHER_TABLE,
    KEY_REVERSE,
    INVERSE_MAPPING,
    FORWARD_MAPPING,
} from './constants';

/**
 * Converts a standard Base64 character to its 6-bit value (0-63).
 *
 * @param c - Single character
 * @returns 6-bit value
 */
export function charToBase64Value(c: string): number {
    const o = c.charCodeAt(0);

    // A-Z = 0-25
    if (o >= 65 && o <= 90) return o - 65;
    // a-z = 26-51
    if (o >= 97 && o <= 122) return o - 71;
    // 0-9 = 52-61
    if (o >= 48 && o <= 57) return o + 4;
    // URL-safe variants
    if (c === '-') return 62;
    if (c === '_') return 63;

    return 0;
}

/**
 * Converts a 6-bit value (0-63) to a standard Base64 character.
 *
 * @param val - 6-bit value
 * @returns Base64 character
 */
export function base64ValueToChar(val: number): string {
    val = val & 63; // Ensure 6-bit range

    if (val < 26) return String.fromCharCode(val + 65);    // A-Z
    if (val < 52) return String.fromCharCode(val + 71);    // a-z
    if (val < 62) return String.fromCharCode(val - 4);     // 0-9
    if (val === 62) return '-';
    if (val === 63) return '_';

    return 'A';
}

/**
 * Decodes an obfuscated share code string to binary data.
 *
 * @param stgyString - Share code string (e.g., "[stgy:a...]")
 * @returns Decompressed binary data
 * @throws {Error} If decoding fails
 */
export function decodeCipher(stgyString: string): Uint8Array {
    // Extract body: [stgy:a<body>]
    const data = stgyString.slice(7, -1);

    if (data.length < 2) {
        throw new Error('Share code body is too short');
    }

    // First character encodes the cipher key
    const keyChar = data[0];
    const keyCharCode = keyChar.charCodeAt(0);

    if (keyCharCode >= CIPHER_TABLE.length) {
        throw new Error('Invalid key character in share code');
    }

    const keyMapped = CIPHER_TABLE[keyCharCode];
    if (keyMapped === 0) {
        throw new Error('Invalid key character in share code');
    }

    const keyMappedChar = String.fromCharCode(keyMapped);
    const key = charToBase64Value(keyMappedChar);

    // Decode remaining characters
    const decoded: string[] = [];

    for (let i = 0; i < data.length - 1; i++) {
        const c = data[i + 1];
        const charCode = c.charCodeAt(0);

        // Apply inverse substitution
        const standardCharCode = INVERSE_MAPPING[charCode] ?? 65; // Default to 'A'
        const standardChar = String.fromCharCode(standardCharCode);

        // Get base64 value and apply reverse shift
        const val = charToBase64Value(standardChar);
        const decodedVal = (val - i - key) & 63;

        decoded.push(base64ValueToChar(decodedVal));
    }

    // Convert URL-safe Base64 to standard Base64
    let b64String = decoded.join('').replace(/-/g, '+').replace(/_/g, '/');

    // Add proper padding based on length
    const padLength = (4 - (b64String.length % 4)) % 4;
    b64String += '='.repeat(padLength);

    // Decode Base64
    const binaryString = atob(b64String);
    const binaryData = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
        binaryData[i] = binaryString.charCodeAt(i);
    }

    // Skip 6-byte header and decompress
    if (binaryData.length < 7) {
        throw new Error('Binary data is too short');
    }

    try {
        const compressed = binaryData.slice(6);
        return pako.inflate(compressed);
    } catch (e) {
        throw new Error(`Failed to decompress data: ${e instanceof Error ? e.message : 'unknown error'}`);
    }
}

/**
 * Encodes binary data to an obfuscated share code string.
 *
 * @param binaryData - Binary data to encode
 * @param key - Optional cipher key (0-63), random if not provided
 * @returns Share code string (e.g., "[stgy:a...]")
 */
export function encodeCipher(binaryData: Uint8Array, key?: number): string {
    // Compress the data
    const compressed = pako.deflate(binaryData, { level: 6 });

    // Build header: [u32 checksum][u16 length]
    const length = binaryData.length;
    const lengthBytes = new Uint8Array(2);
    lengthBytes[0] = length & 0xff;
    lengthBytes[1] = (length >> 8) & 0xff;

    // Calculate CRC32 of length + compressed data
    const checksumInput = new Uint8Array(2 + compressed.length);
    checksumInput.set(lengthBytes, 0);
    checksumInput.set(compressed, 2);
    const checksum = crc32(checksumInput);

    // Build full payload: header + compressed
    const fullData = new Uint8Array(6 + compressed.length);
    fullData[0] = checksum & 0xff;
    fullData[1] = (checksum >> 8) & 0xff;
    fullData[2] = (checksum >> 16) & 0xff;
    fullData[3] = (checksum >> 24) & 0xff;
    fullData[4] = lengthBytes[0];
    fullData[5] = lengthBytes[1];
    fullData.set(compressed, 6);

    // Convert to Base64
    let b64 = '';
    for (let i = 0; i < fullData.length; i++) {
        b64 += String.fromCharCode(fullData[i]);
    }
    b64 = btoa(b64);

    // Convert to URL-safe Base64 and remove padding
    b64 = b64.replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');

    // Use provided key or generate random
    if (key === undefined || key < 0 || key > 63) {
        key = Math.floor(Math.random() * 64);
    }

    // Get key character for output
    const keyCharStandard = base64ValueToChar(key);
    const keyCharCode = keyCharStandard.charCodeAt(0);
    const keySource = KEY_REVERSE[keyCharCode] ?? 86; // Default to 'V'

    // Encode each character
    const encoded: string[] = [];

    for (let i = 0; i < b64.length; i++) {
        const c = b64[i];
        const val = charToBase64Value(c);
        const encodedVal = (val + i + key) & 63;
        const standardChar = base64ValueToChar(encodedVal);
        const standardCharCode = standardChar.charCodeAt(0);
        const substChar = FORWARD_MAPPING[standardCharCode] ?? 65; // Default to 'A'
        encoded.push(String.fromCharCode(substChar));
    }

    return `[stgy:a${String.fromCharCode(keySource)}${encoded.join('')}]`;
}

/**
 * CRC32 implementation (same as zlib.crc32).
 */
function crc32(data: Uint8Array): number {
    let crc = 0xffffffff;

    for (let i = 0; i < data.length; i++) {
        crc ^= data[i];
        for (let j = 0; j < 8; j++) {
            if (crc & 1) {
                crc = (crc >>> 1) ^ 0xedb88320;
            } else {
                crc = crc >>> 1;
            }
        }
    }

    return (crc ^ 0xffffffff) >>> 0;
}
