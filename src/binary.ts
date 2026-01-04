/**
 * xiv-strat-board - FF14 Strategy Board Encoder/Decoder
 *
 * Binary format builder and parser (TLV format).
 */

import type { DecodeResult, BackgroundType } from './types';
import {
    ICON_TYPES,
    BOARD_BACKGROUND_TYPES,
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
    if (data.length < 0x1C) {
        throw new Error('Binary data is too short for header');
    }

    const reader = new BinaryReader(data);

    // Parse header
    const version = reader.readUint32();

    // Skip fields at 0x04-0x17
    reader.seek(0x18);
    reader.readUint16(); // object_count_header (always 1)

    // Read name length at 0x1A
    const nameLength = reader.readUint16();

    if (data.length < 0x1C + nameLength) {
        throw new Error('Binary data is too short for name field');
    }

    // Read name at 0x1C with variable length
    const nameBytes = reader.readBytes(nameLength);
    const name = new TextDecoder('utf-8', { fatal: false })
        .decode(nameBytes)
        .replace(/\0+$/, '')
        .trim();

    // Parse icon list (Tag 2 entries) with interleaved text content (Tag 3)
    // Text content appears immediately after text icons (iconId 100) in the stream
    const icons: number[] = [];
    const textContents: string[] = []; // Text content for text objects
    while (reader.remaining >= 4) {
        const marker = reader.readUint16();
        if (marker === 2) {
            // Icon entry
            const iconId = reader.readUint16();
            icons.push(iconId);
        } else if (marker === 3) {
            // Tag 3: text content (length > 1) or footer indicator (length = 1)
            const val = reader.readUint16();
            if (val > 1) {
                // Text content - appears after text icon entries
                if (reader.remaining < val) break;
                const textBytes = reader.readBytes(val);
                const textContent = new TextDecoder('utf-8', { fatal: false })
                    .decode(textBytes)
                    .replace(/\0+$/, ''); // Remove null padding
                textContents.push(textContent);
            } else {
                // Footer indicator (val === 1), rewind and let main loop handle it
                reader.seek(reader.position - 4);
                break;
            }
        } else {
            // Other tag, rewind and break to main tag parsing
            reader.seek(reader.position - 2);
            break;
        }
    }

    const n = icons.length;

    // Storage for object properties
    const positions: Array<{ x: number; y: number }> = [];
    const backgrounds: number[] = [];  // Tag 6: also used for rotation angle in rotatable objects
    const sizes: number[] = [];
    const colors: Array<{ r: number; g: number; b: number; a: number }> = [];
    const tag10: number[] = [];  // Tag 10: arc angle for fan_aoe, width for line_aoe, horiz count for knockback
    const tag11: number[] = []; // Tag 11: donut radius, height for line_aoe, vert count/display count
    const tag12: number[] = []; // Tag 12: reserved
    const objectFlags: number[] = []; // Per-object flags from Tag 4
    let boardBackground = 1; // default: none

    // Parse tags
    while (reader.remaining >= 2) {
        const tag = reader.readUint16();

        if (tag === 2) {
            // Additional icon entry (can appear after text content)
            if (reader.remaining < 2) break;
            const iconId = reader.readUint16();
            icons.push(iconId);
        } else if (tag === 4) {
            // Object count header with flags
            if (reader.remaining < 4) break;
            reader.readUint16(); // always 1
            const countVal = reader.readUint16();

            if (countVal > 1) {
                // Multi-object: read per-object flags
                if (reader.remaining < countVal * 2) break;
                for (let i = 0; i < countVal; i++) {
                    objectFlags.push(reader.readUint16());
                }
            } else {
                // Single object: read flags
                if (reader.remaining < 2) break;
                objectFlags.push(reader.readUint16());
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
            // Object backgrounds / rotation angles (stored as signed i16)
            if (reader.remaining < 4) break;
            reader.readUint16(); // always 1
            const count = reader.readUint16();

            for (let i = 0; i < count && reader.remaining >= 2; i++) {
                // Read as signed to support negative angles
                backgrounds.push(reader.readInt16());
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
                tag10.push(reader.readUint16());
            }
        } else if (tag === 11) {
            // Donut radii
            if (reader.remaining < 4) break;
            reader.readUint16(); // always 1
            const count = reader.readUint16();

            for (let i = 0; i < count && reader.remaining >= 2; i++) {
                tag11.push(reader.readUint16());
            }
        } else if (tag === 12) {
            // Rotation angles (for line_aoe)
            if (reader.remaining < 4) break;
            reader.readUint16(); // always 1
            const count = reader.readUint16();

            for (let i = 0; i < count && reader.remaining >= 2; i++) {
                tag12.push(reader.readUint16());
            }
        } else if (tag === 3) {
            // Tag 3 can be:
            // - Footer: [3][1][1][board_bg] when second value is 1
            // - Text content: [3][text_length][text_bytes...] when second value > 1
            if (reader.remaining < 2) break;
            const val = reader.readUint16();

            if (val === 1) {
                // This is the footer
                if (reader.remaining < 4) break;
                reader.readUint16(); // always 1
                boardBackground = reader.readUint16();
                break; // Footer is always last
            } else {
                // This is text content for a text object
                // val is the length of the text content
                if (reader.remaining < val) break;
                const textBytes = reader.readBytes(val);
                const textContent = new TextDecoder('utf-8', { fatal: false })
                    .decode(textBytes)
                    .replace(/\0+$/, ''); // Remove null padding
                textContents.push(textContent);
                // Continue parsing other tags
            }
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
        obj.size = (iconId === 100) ? 100 : (sizes[i] && sizes[i] > 0 ? sizes[i] : 100);

        // Angle - Tag 6 stores rotation angle for all objects except text (100)
        if (iconId !== 100 && backgrounds[i] !== undefined && backgrounds[i] !== 0) {
            obj.angle = backgrounds[i];
        }

        // Color - only for objects with settable colors: line_aoe (11), line (12), text (100)
        const colorableTypes = new Set([11, 12, 100]);
        if (colors[i]) {
            const { r, g, b, a } = colors[i];
            // Color is only settable for certain types
            if (colorableTypes.has(iconId)) {
                const hex = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
                obj.color = hex;
            }
            // Transparency applies to all objects
            if (a > 0) {
                obj.transparency = a;
            }
        }

        // Type-specific handling of Tags 10, 11, 12
        if (iconId === 11) {
            // line_aoe: Tag 10 = width, Tag 11 = height
            if (tag10[i] && tag10[i] > 0) {
                obj.width = tag10[i];
            }
            if (tag11[i] && tag11[i] > 0) {
                obj.height = tag11[i];
            }
        } else if (iconId === 10) {
            // fan_aoe: Tag 10 = arc angle
            if (tag10[i] && tag10[i] > 0) {
                obj.arcAngle = tag10[i];
            }
        } else if (iconId === 12) {
            // line: Tag 10 = endX * 10, Tag 11 = endY * 10, Tag 12 = height
            // Note: 0 is a valid coordinate value for endX/endY
            if (tag10[i] !== undefined) {
                obj.endX = tag10[i] / 10;
            }
            if (tag11[i] !== undefined) {
                obj.endY = tag11[i] / 10;
            }
            if (tag12[i] && tag12[i] > 0) {
                obj.height = tag12[i];
            }
        } else if (iconId === 15) {
            // line_stack: Tag 10 = always 1, Tag 11 = display count
            if (tag11[i] && tag11[i] > 0) {
                obj.displayCount = tag11[i];
            }
        } else if (iconId === 110) {
            // linear_knockback: Tag 10 = horizontal count, Tag 11 = vertical count
            if (tag10[i] && tag10[i] > 0) {
                obj.horizontalCount = tag10[i];
            }
            if (tag11[i] && tag11[i] > 0) {
                obj.verticalCount = tag11[i];
            }
        } else if (iconId === 17) {
            // donut: Tag 10 = arc angle, Tag 11 = inner radius (0 is valid - means no inner hole)
            if (tag10[i] !== undefined && tag10[i] > 0) {
                obj.arcAngle = tag10[i];
            }
            if (tag11[i] !== undefined) {
                obj.donutRadius = tag11[i];
            }
        } else {
            // Default handling for arc angle and donut radius
            if (tag10[i] && tag10[i] > 0) {
                obj.arcAngle = tag10[i];
            }
            if (tag11[i] && tag11[i] > 0) {
                obj.donutRadius = tag11[i];
            }
        }

        // Text content for text objects (icon ID 100)
        if (iconId === 100 && textContents.length > 0) {
            obj.text = textContents.shift();
        }

        // Flags from Tag 4: bits encode hidden, horizontal flip, vertical flip, locked
        // Bit 0 (0x01): visible (1) / hidden (0)
        // Bit 1 (0x02): horizontal flip
        // Bit 2 (0x04): vertical flip
        // Bit 3 (0x08): locked
        const objFlags = objectFlags[i] ?? 1;
        if ((objFlags & 0x01) === 0) {
            obj.hidden = true;
        }
        if (objFlags & 0x02) {
            obj.horizontalFlip = true;
        }
        if (objFlags & 0x04) {
            obj.verticalFlip = true;
        }
        if (objFlags & 0x08) {
            obj.locked = true;
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
    // Header: 0x1c bytes (28 bytes) + nameLen (variable, padded to even)
    // Tag 2 entries: n * 4 bytes
    // Tag 3 text content: 4 bytes header + paddedLen per text object
    // Tag 4: 8 bytes for single, 6 + n*2 for multi
    // Tag 5 (positions): 6 + n * 4
    // Tag 6 (angles): 6 + n * 2
    // Tag 7 (sizes): 6 + n + (n % 2 === 1 ? 1 : 0) padding
    // Tag 8 (colors): 6 + n * 4
    // Tag 10 (type-specific): 6 + n * 2
    // Tag 11 (type-specific): 6 + n * 2
    // Tag 12 (type-specific): 6 + n * 2
    // Tag 3 (footer): 8
    const nameBytes = new TextEncoder().encode(name.slice(0, 20));
    // Name field must be at least 8 bytes, padded to 4-byte alignment with null terminator (game expectation)
    const namePaddedLen = Math.max(8, (nameBytes.length + 1 + 3) & ~3);
    const headerSize = 0x1c + namePaddedLen;
    const tag4Size = n <= 1 ? 8 : (6 + n * 2);
    const tag7Size = 6 + n + (n % 2 === 1 ? 1 : 0);
    // Calculate text content size
    let textContentSize = 0;
    for (const obj of objects) {
        if (obj.typeId === 100 && obj.text) {
            const textLen = new TextEncoder().encode(obj.text).length;
            // Pad to 4-byte alignment with null terminator (game expectation)
            const paddedLen = Math.max(8, (textLen + 1 + 3) & ~3);
            textContentSize += 4 + paddedLen; // 4 bytes for Tag 3 header + text content
        }
    }
    const bufferSize = n === 0
        ? headerSize + 8  // Header + footer only
        : headerSize + n * 4 + textContentSize + tag4Size + (6 + n * 4) + (6 + n * 2) + tag7Size + (6 + n * 4) + (6 + n * 2) + (6 + n * 2) + (6 + n * 2) + 8;

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
    // Name length (calculated above)
    writeUint16(namePaddedLen);

    // Name (variable length, null-padded to even)
    for (let i = 0; i < namePaddedLen; i++) {
        writeUint8(nameBytes[i] ?? 0);
    }

    // Object list (Tag 2 entries) with interleaved text content (Tag 3)
    for (const obj of objects) {
        writeUint16(2);
        writeUint16(obj.typeId);
        // Text content immediately follows text icons (typeId 100)
        if (obj.typeId === 100 && obj.text) {
            const textBytes = new TextEncoder().encode(obj.text);
            // Pad to 4-byte alignment with null terminator (game expectation)
            const paddedLen = Math.max(8, (textBytes.length + 1 + 3) & ~3);
            writeUint16(3);
            writeUint16(paddedLen);
            for (let i = 0; i < paddedLen; i++) {
                writeUint8(textBytes[i] ?? 0);
            }
        }
    }

    // Skip property tags for empty boards
    if (n === 0) {
        // Just write footer
    } else if (n === 1) {
        // Tag 4 - Single object header
        writeUint16(4);
        writeUint16(1);
        const obj = objects[0];
        let flagsVal = 1; // visible by default
        if (obj.hidden) flagsVal &= ~0x01;
        if (obj.horizontalFlip) flagsVal |= 0x02;
        if (obj.verticalFlip) flagsVal |= 0x04;
        if (obj.locked) flagsVal |= 0x08;
        writeUint16(1);
        writeUint16(flagsVal);
    } else {
        // Tag 4 - Multi-object header with per-object flags
        writeUint16(4);
        writeUint16(1);
        writeUint16(n);
        for (const obj of objects) {
            let flagsVal = 1; // visible by default
            if (obj.hidden) flagsVal &= ~0x01;
            if (obj.horizontalFlip) flagsVal |= 0x02;
            if (obj.verticalFlip) flagsVal |= 0x04;
            if (obj.locked) flagsVal |= 0x08;
            writeUint16(flagsVal);
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

        // Tag 6 - Rotation angles (signed i16)
        writeUint16(6);
        writeUint16(1);
        writeUint16(n);
        for (const obj of objects) {
            writeInt16(obj.angle);
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

        // Tag 10 - Type-specific: arcAngle, width, endX, horizontalCount, displayCount
        writeUint16(10);
        writeUint16(1);
        writeUint16(n);
        for (const obj of objects) {
            if (obj.typeId === 11) {
                // line_aoe: width
                writeUint16(obj.width);
            } else if (obj.typeId === 12) {
                // line: endX * 10
                writeUint16(Math.round(obj.endX * 10));
            } else if (obj.typeId === 110) {
                // linear_knockback: horizontalCount
                writeUint16(obj.horizontalCount);
            } else if (obj.typeId === 15) {
                // line_stack: Tag 10 = always 1 (horizontal count?)
                writeUint16(1);
            } else {
                // fan_aoe, donut, others: arcAngle
                writeUint16(obj.arcAngle);
            }
        }

        // Tag 11 - Type-specific: donutRadius, height, endY, verticalCount
        writeUint16(11);
        writeUint16(1);
        writeUint16(n);
        for (const obj of objects) {
            if (obj.typeId === 11) {
                // line_aoe: height
                writeUint16(obj.height);
            } else if (obj.typeId === 12) {
                // line: endY * 10
                writeUint16(Math.round(obj.endY * 10));
            } else if (obj.typeId === 15) {
                // line_stack: displayCount goes in BOTH Tag 10 and Tag 11
                writeUint16(obj.displayCount);
            } else if (obj.typeId === 110) {
                // linear_knockback: verticalCount
                writeUint16(obj.verticalCount);
            } else {
                // donut, others: donutRadius
                writeUint16(obj.donutRadius);
            }
        }

        // Tag 12 - Type-specific: height for line
        writeUint16(12);
        writeUint16(1);
        writeUint16(n);
        for (const obj of objects) {
            if (obj.typeId === 12) {
                // line: height
                writeUint16(obj.height);
            } else {
                writeUint16(0);
            }
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
