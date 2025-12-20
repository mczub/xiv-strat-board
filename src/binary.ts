/**
 * xiv-strat-board - FF14 Strategy Board Encoder/Decoder
 *
 * Binary format builder and parser (TLV format).
 */

import type { DecodeResult, BackgroundType } from './types';
import {
    ICON_TYPES,
    BOARD_BACKGROUND_TYPES,
    OBJECT_BACKGROUND_TYPES,
} from './constants';
import type { sanitizeObject } from './validation';

/**
 * DataView wrapper for reading binary data with bounds checking.
 */
class BinaryReader {
    private view: DataView;
    private pos: number;

    constructor(data: Uint8Array) {
        this.view = new DataView(data.buffer, data.byteOffset, data.byteLength);
        this.pos = 0;
    }

    get position(): number {
        return this.pos;
    }

    get length(): number {
        return this.view.byteLength;
    }

    get remaining(): number {
        return this.length - this.pos;
    }

    seek(pos: number): void {
        if (pos < 0 || pos > this.length) {
            throw new Error(`Seek position ${pos} out of bounds [0, ${this.length}]`);
        }
        this.pos = pos;
    }

    readUint8(): number {
        if (this.pos + 1 > this.length) {
            throw new Error('Unexpected end of data reading uint8');
        }
        const val = this.view.getUint8(this.pos);
        this.pos += 1;
        return val;
    }

    readInt16(): number {
        if (this.pos + 2 > this.length) {
            throw new Error('Unexpected end of data reading int16');
        }
        const val = this.view.getInt16(this.pos, true); // little-endian
        this.pos += 2;
        return val;
    }

    readUint16(): number {
        if (this.pos + 2 > this.length) {
            throw new Error('Unexpected end of data reading uint16');
        }
        const val = this.view.getUint16(this.pos, true); // little-endian
        this.pos += 2;
        return val;
    }

    readUint32(): number {
        if (this.pos + 4 > this.length) {
            throw new Error('Unexpected end of data reading uint32');
        }
        const val = this.view.getUint32(this.pos, true); // little-endian
        this.pos += 4;
        return val;
    }

    readBytes(count: number): Uint8Array {
        if (this.pos + count > this.length) {
            throw new Error(`Unexpected end of data reading ${count} bytes`);
        }
        const data = new Uint8Array(this.view.buffer, this.view.byteOffset + this.pos, count);
        this.pos += count;
        return data;
    }
}

/**
 * Parses decompressed binary data into a strategy board structure.
 *
 * @param data - Decompressed binary data
 * @returns Parsed board structure
 * @throws {Error} If binary format is invalid
 */
export function parseBinary(data: Uint8Array): DecodeResult {
    if (data.length < 0x24) {
        throw new Error('Binary data is too short for header');
    }

    const reader = new BinaryReader(data);

    // Parse header
    const version = reader.readUint32();

    // Skip fields at 0x04-0x1B
    reader.seek(0x1c);

    // Read name at 0x1C-0x23 (8 bytes)
    const nameBytes = reader.readBytes(8);
    const name = new TextDecoder('utf-8', { fatal: false })
        .decode(nameBytes)
        .replace(/\0+$/, '')
        .trim();

    // Parse icon list (Tag 2 entries)
    const icons: number[] = [];
    while (reader.remaining >= 4) {
        const marker = reader.readUint16();
        if (marker !== 2) {
            // Not a Tag 2 entry, rewind and break
            reader.seek(reader.position - 2);
            break;
        }
        const iconId = reader.readUint16();
        icons.push(iconId);
    }

    const n = icons.length;

    // Storage for object properties
    const positions: Array<{ x: number; y: number }> = [];
    const backgrounds: number[] = [];
    const sizes: number[] = [];
    const colors: Array<{ r: number; g: number; b: number; a: number }> = [];
    const arcAngles: number[] = [];
    const donutRadii: number[] = [];
    let boardBackground = 1; // default: none
    let flags = 1; // default: visible

    // Parse tags
    while (reader.remaining >= 2) {
        const tag = reader.readUint16();

        if (tag === 4) {
            // Object count header with flags
            if (reader.remaining < 4) break;
            reader.readUint16(); // always 1
            const countVal = reader.readUint16();

            if (countVal > 1) {
                // Multi-object: skip n × 2 bytes
                if (reader.remaining < countVal * 2) break;
                for (let i = 0; i < countVal; i++) {
                    reader.readUint16();
                }
            } else {
                // Single object: read flags
                if (reader.remaining < 2) break;
                flags = reader.readUint16();
            }
        } else if (tag === 5) {
            // Positions
            if (reader.remaining < 4) break;
            reader.readUint16(); // always 3
            const count = reader.readUint16();

            for (let i = 0; i < count && reader.remaining >= 4; i++) {
                const x = reader.readInt16() / 10;
                const y = reader.readInt16() / 10;
                positions.push({ x, y });
            }
        } else if (tag === 6) {
            // Object backgrounds
            if (reader.remaining < 4) break;
            reader.readUint16(); // always 1
            const count = reader.readUint16();

            for (let i = 0; i < count && reader.remaining >= 2; i++) {
                backgrounds.push(reader.readUint16());
            }
        } else if (tag === 7) {
            // Sizes (u8, packed)
            if (reader.remaining < 4) break;
            reader.readUint16(); // always 0
            const count = reader.readUint16();

            for (let i = 0; i < count && reader.remaining >= 1; i++) {
                sizes.push(reader.readUint8());
            }

            // Skip padding byte if odd count
            if (count % 2 === 1 && reader.remaining >= 1) {
                reader.readUint8();
            }
        } else if (tag === 8) {
            // Colors (RGBA)
            if (reader.remaining < 4) break;
            reader.readUint16(); // always 2
            const count = reader.readUint16();

            for (let i = 0; i < count && reader.remaining >= 4; i++) {
                const r = reader.readUint8();
                const g = reader.readUint8();
                const b = reader.readUint8();
                const a = reader.readUint8();
                colors.push({ r, g, b, a });
            }
        } else if (tag === 10) {
            // Arc angles
            if (reader.remaining < 4) break;
            reader.readUint16(); // always 1
            const count = reader.readUint16();

            for (let i = 0; i < count && reader.remaining >= 2; i++) {
                arcAngles.push(reader.readUint16());
            }
        } else if (tag === 11) {
            // Donut radii
            if (reader.remaining < 4) break;
            reader.readUint16(); // always 1
            const count = reader.readUint16();

            for (let i = 0; i < count && reader.remaining >= 2; i++) {
                donutRadii.push(reader.readUint16());
            }
        } else if (tag === 12) {
            // Reserved
            if (reader.remaining < 4) break;
            reader.readUint16();
            const count = reader.readUint16();

            // Skip count × 2 bytes
            for (let i = 0; i < count && reader.remaining >= 2; i++) {
                reader.readUint16();
            }
        } else if (tag === 3) {
            // Footer with board background
            if (reader.remaining < 6) break;
            reader.readUint16(); // always 1
            reader.readUint16(); // always 1
            boardBackground = reader.readUint16();
            break; // Footer is always last
        } else {
            // Unknown tag, skip
            break;
        }
    }

    // Build objects array
    const objects: DecodeResult['objects'] = [];

    for (let i = 0; i < n; i++) {
        const iconId = icons[i];
        const typeName = ICON_TYPES[iconId] ?? `unknown_${iconId}`;

        const obj: DecodeResult['objects'][0] = {
            type: typeName,
            typeId: iconId,
            x: positions[i]?.x ?? 0,
            y: positions[i]?.y ?? 0,
        };

        // Size
        obj.size = sizes[i] && sizes[i] > 0 ? sizes[i] : 100;

        // Background
        if (backgrounds[i] !== undefined && backgrounds[i] > 0) {
            const bgName = OBJECT_BACKGROUND_TYPES[backgrounds[i]];
            obj.background = bgName as BackgroundType ?? backgrounds[i];
        }

        // Color
        if (colors[i]) {
            const { r, g, b, a } = colors[i];
            const hex = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
            obj.color = hex;
            if (a > 0) {
                obj.transparency = a;
            }
        }

        // Arc angle
        if (arcAngles[i] && arcAngles[i] > 0) {
            obj.arcAngle = arcAngles[i];
        }

        // Donut radius
        if (donutRadii[i] && donutRadii[i] > 0) {
            obj.donutRadius = donutRadii[i];
        }

        // Hidden/locked flags (single object only)
        if (n === 1) {
            if (flags === 0) {
                obj.hidden = true;
            } else if (flags === 9 || (flags & 0x08)) {
                obj.locked = true;
            }
        }

        objects.push(obj);
    }

    return {
        version,
        name: name || undefined,
        boardBackground: BOARD_BACKGROUND_TYPES[boardBackground] as BackgroundType ?? 'none',
        objects,
    };
}

/**
 * Builds binary payload from sanitized board data.
 *
 * @param data - Sanitized board data from validation
 * @returns Binary payload
 */
export function buildBinary(data: {
    name: string;
    boardBackground: number;
    objects: ReturnType<typeof sanitizeObject>[];
}): Uint8Array {
    const { name, boardBackground, objects } = data;
    const n = objects.length;

    // Calculate required buffer size
    // Header: 0x24 bytes (36 bytes)
    // Tag 2 entries: n * 4 bytes
    // Tag 4: 8 bytes for single, 6 + n*2 for multi
    // Tag 5 (positions): 6 + n * 4
    // Tag 6 (backgrounds): 6 + n * 2
    // Tag 7 (sizes): 6 + n + (n % 2 === 1 ? 1 : 0) padding
    // Tag 8 (colors): 6 + n * 4
    // Tag 10 (arc): 6 + n * 2
    // Tag 11 (donut): 6 + n * 2
    // Tag 12 (reserved): 6 + n * 2
    // Tag 3 (footer): 8
    const tag4Size = n <= 1 ? 8 : (6 + n * 2);
    const tag7Size = 6 + n + (n % 2 === 1 ? 1 : 0);
    const bufferSize = n === 0
        ? 0x24 + 8  // Header + footer only
        : 0x24 + n * 4 + tag4Size + (6 + n * 4) + (6 + n * 2) + tag7Size + (6 + n * 4) + (6 + n * 2) + (6 + n * 2) + (6 + n * 2) + 8;

    const buffer = new ArrayBuffer(bufferSize);
    const view = new DataView(buffer);
    let pos = 0;

    // Helper to write values
    const writeUint8 = (val: number) => {
        view.setUint8(pos, val);
        pos += 1;
    };
    const writeUint16 = (val: number) => {
        view.setUint16(pos, val, true);
        pos += 2;
    };
    const writeInt16 = (val: number) => {
        view.setInt16(pos, val, true);
        pos += 2;
    };
    const writeUint32 = (val: number) => {
        view.setUint32(pos, val, true);
        pos += 4;
    };

    // Header (0x00 - 0x23)
    writeUint32(2); // Version
    writeUint32(0); // Field at 0x04 - will update
    for (let i = 0; i < 10; i++) writeUint8(0); // Padding
    writeUint32(0); // Payload size - will update
    writeUint16(0); // Padding
    writeUint16(1); // Object count header
    writeUint16(8); // Name length

    // Name (8 bytes, null-padded)
    const nameBytes = new TextEncoder().encode(name.slice(0, 7));
    for (let i = 0; i < 8; i++) {
        writeUint8(nameBytes[i] ?? 0);
    }

    // Object list (Tag 2 entries)
    for (const obj of objects) {
        writeUint16(2);
        writeUint16(obj.typeId);
    }

    // Skip property tags for empty boards
    if (n === 0) {
        // Just write footer
    } else if (n === 1) {
        // Tag 4 - Single object header
        writeUint16(4);
        writeUint16(1);
        const obj = objects[0];
        let flagsVal = 1; // visible
        if (obj.hidden) {
            flagsVal = 0;
        } else if (obj.locked) {
            flagsVal = 9;
        }
        writeUint16(1);
        writeUint16(flagsVal);
    } else {
        // Tag 4 - Multi-object header
        writeUint16(4);
        writeUint16(1);
        writeUint16(n);
        for (let i = 0; i < n; i++) {
            writeUint16(1);
        }
    }

    // Only write property tags if there are objects
    if (n > 0) {
        // Tag 5 - Positions
        writeUint16(5);
        writeUint16(3);
        writeUint16(n);
        for (const obj of objects) {
            writeInt16(Math.round(obj.x * 10));
            writeInt16(Math.round(obj.y * 10));
        }

        // Tag 6 - Object backgrounds
        writeUint16(6);
        writeUint16(1);
        writeUint16(n);
        for (const obj of objects) {
            writeUint16(obj.background);
        }

        // Tag 7 - Sizes
        writeUint16(7);
        writeUint16(0);
        writeUint16(n);
        for (const obj of objects) {
            writeUint8(obj.size & 0xff);
        }
        // Padding if odd count
        if (n % 2 === 1) {
            writeUint8(0);
        }

        // Tag 8 - Colors
        writeUint16(8);
        writeUint16(2);
        writeUint16(n);
        for (const obj of objects) {
            writeUint8(obj.colorR);
            writeUint8(obj.colorG);
            writeUint8(obj.colorB);
            writeUint8(obj.transparency);
        }

        // Tag 10 - Arc angles
        writeUint16(10);
        writeUint16(1);
        writeUint16(n);
        for (const obj of objects) {
            writeUint16(obj.arcAngle);
        }

        // Tag 11 - Donut radii
        writeUint16(11);
        writeUint16(1);
        writeUint16(n);
        for (const obj of objects) {
            writeUint16(obj.donutRadius);
        }

        // Tag 12 - Reserved
        writeUint16(12);
        writeUint16(1);
        writeUint16(n);
        for (let i = 0; i < n; i++) {
            writeUint16(0);
        }
    }

    // Tag 3 - Footer
    writeUint16(3);
    writeUint16(1);
    writeUint16(1);
    writeUint16(boardBackground);

    // Trim to actual size
    const result = new Uint8Array(buffer, 0, pos);

    // Update sizes in header
    const headerView = new DataView(result.buffer, result.byteOffset, result.byteLength);
    const payloadSize = pos - 0x1c;
    headerView.setUint32(0x12, payloadSize, true);
    const field04 = pos - 16;
    headerView.setUint32(0x04, field04, true);

    return result;
}
