/**
 * xiv-strat-board - FF14 Strategy Board Encoder/Decoder
 *
 * Unit tests for encoder/decoder functionality.
 */

import { describe, it, expect } from 'vitest';
import { encode, decode } from './index';
import type { StrategyBoard } from './types';

describe('encode/decode roundtrip', () => {
    it('should roundtrip a simple board with one object', () => {
        const board: StrategyBoard = {
            name: 'test',
            boardBackground: 'checkered',
            objects: [
                { type: 'tank', x: 256, y: 192, size: 100 },
            ],
        };

        const shareCode = encode(board);
        expect(shareCode).toMatch(/^\[stgy:a.+\]$/);

        const decoded = decode(shareCode);
        expect(decoded.name).toBe('test');
        expect(decoded.boardBackground).toBe('checkered');
        expect(decoded.objects).toHaveLength(1);
        expect(decoded.objects[0].type).toBe('tank');
        expect(decoded.objects[0].x).toBe(256);
        expect(decoded.objects[0].y).toBe(192);
    });

    it('should roundtrip a board with multiple objects', () => {
        const board: StrategyBoard = {
            name: 'multi',
            boardBackground: 'grey',
            objects: [
                { type: 'tank', x: 200, y: 150 },
                { type: 'healer', x: 300, y: 150 },
                { type: 'dps_1', x: 200, y: 250 },
                { type: 'dps_2', x: 300, y: 250 },
            ],
        };

        const shareCode = encode(board);
        const decoded = decode(shareCode);

        expect(decoded.objects).toHaveLength(4);
        expect(decoded.objects[0].type).toBe('tank');
        expect(decoded.objects[1].type).toBe('healer');
        expect(decoded.objects[2].type).toBe('dps_1');
        expect(decoded.objects[3].type).toBe('dps_2');
    });

    it('should roundtrip waymarks', () => {
        const board: StrategyBoard = {
            objects: [
                { type: 'waymark_a', x: 100, y: 100 },
                { type: 'waymark_b', x: 412, y: 100 },
                { type: 'waymark_c', x: 100, y: 284 },
                { type: 'waymark_d', x: 412, y: 284 },
                { type: 'waymark_1', x: 256, y: 50 },
                { type: 'waymark_2', x: 256, y: 334 },
                { type: 'waymark_3', x: 50, y: 192 },
                { type: 'waymark_4', x: 462, y: 192 },
            ],
        };

        const shareCode = encode(board);
        const decoded = decode(shareCode);

        expect(decoded.objects).toHaveLength(8);
        expect(decoded.objects[0].type).toBe('waymark_a');
        expect(decoded.objects[0].x).toBe(100);
        expect(decoded.objects[0].y).toBe(100);
    });

    it('should roundtrip AoE mechanics with special properties', () => {
        const board: StrategyBoard = {
            objects: [
                { type: 'circle_aoe', x: 256, y: 192, size: 150 },
                { type: 'donut', x: 256, y: 192, size: 100, donutRadius: 50 },
                { type: 'fan_aoe', x: 256, y: 192, size: 100, arcAngle: 90 },
            ],
        };

        const shareCode = encode(board);
        const decoded = decode(shareCode);

        expect(decoded.objects).toHaveLength(3);
        expect(decoded.objects[0].type).toBe('circle_aoe');
        expect(decoded.objects[0].size).toBe(150);
        expect(decoded.objects[1].type).toBe('donut');
        expect(decoded.objects[1].donutRadius).toBe(50);
        expect(decoded.objects[2].type).toBe('fan_aoe');
        expect(decoded.objects[2].arcAngle).toBe(90);
    });

    it('should roundtrip an empty board', () => {
        const board: StrategyBoard = {
            name: 'empty',
            boardBackground: 'none',
            objects: [],
        };

        const shareCode = encode(board);
        const decoded = decode(shareCode);

        expect(decoded.name).toBe('empty');
        expect(decoded.boardBackground).toBe('none');
        expect(decoded.objects).toHaveLength(0);
    });

    it('should produce consistent output with fixed key', () => {
        const board: StrategyBoard = {
            objects: [{ type: 'tank', x: 256, y: 192 }],
        };

        const code1 = encode(board, { key: 42 });
        const code2 = encode(board, { key: 42 });

        expect(code1).toBe(code2);
    });
});

describe('decode validation', () => {
    it('should throw on invalid share code format', () => {
        expect(() => decode('not a share code')).toThrow();
        expect(() => decode('[stgy:b...]')).toThrow();
        expect(() => decode('stgy:a...')).toThrow();
        expect(() => decode('[stgy:a]')).toThrow();
    });

    it('should throw on empty string', () => {
        expect(() => decode('')).toThrow();
    });

    it('should throw on non-string input', () => {
        // @ts-expect-error testing invalid input
        expect(() => decode(123)).toThrow();
        // @ts-expect-error testing invalid input
        expect(() => decode(null)).toThrow();
    });
});

describe('encode validation', () => {
    it('should throw on invalid board input', () => {
        // @ts-expect-error testing invalid input
        expect(() => encode(null)).toThrow();
        // @ts-expect-error testing invalid input
        expect(() => encode('not an object')).toThrow();
    });

    it('should throw on missing objects array', () => {
        // @ts-expect-error testing invalid input
        expect(() => encode({ name: 'test' })).toThrow();
    });

    it('should throw on unknown icon type', () => {
        expect(() => encode({
            objects: [{ type: 'not_a_real_type', x: 256, y: 192 }],
        })).toThrow('Unknown icon type');
    });

    it('should sanitize name to max 7 characters', () => {
        const board: StrategyBoard = {
            name: 'verylongboardname',
            objects: [{ type: 'tank', x: 256, y: 192 }],
        };

        const shareCode = encode(board);
        const decoded = decode(shareCode);

        expect(decoded.name?.length).toBeLessThanOrEqual(7);
    });

    it('should clamp coordinates to valid range', () => {
        const board: StrategyBoard = {
            objects: [
                { type: 'tank', x: -500, y: 1000 },
            ],
        };

        const shareCode = encode(board);
        const decoded = decode(shareCode);

        expect(decoded.objects[0].x).toBeGreaterThanOrEqual(-100);
        expect(decoded.objects[0].x).toBeLessThanOrEqual(612);
        expect(decoded.objects[0].y).toBeGreaterThanOrEqual(-100);
        expect(decoded.objects[0].y).toBeLessThanOrEqual(484);
    });
});

describe('all icon types', () => {
    const testTypes = [
        'tank', 'tank_1', 'tank_2',
        'healer', 'healer_1', 'healer_2',
        'dps', 'dps_1', 'dps_2', 'dps_3', 'dps_4',
        'paladin', 'warrior', 'dark_knight', 'gunbreaker',
        'white_mage', 'scholar', 'astrologian', 'sage',
        'circle_aoe', 'fan_aoe', 'line_aoe', 'donut',
        'stack', 'gaze', 'tower', 'proximity',
        'waymark_a', 'waymark_b', 'waymark_c', 'waymark_d',
        'waymark_1', 'waymark_2', 'waymark_3', 'waymark_4',
        'small_enemy', 'medium_enemy', 'large_enemy',
        'attack_1', 'attack_2', 'attack_3', 'attack_4',
    ];

    for (const type of testTypes) {
        it(`should roundtrip icon type: ${type}`, () => {
            const board: StrategyBoard = {
                objects: [{ type, x: 256, y: 192 }],
            };

            const shareCode = encode(board);
            const decoded = decode(shareCode);

            expect(decoded.objects[0].type).toBe(type);
        });
    }
});

describe('color handling', () => {
    it('should roundtrip hex color', () => {
        const board: StrategyBoard = {
            objects: [
                { type: 'line_aoe', x: 256, y: 192, color: '#ff0000' },
            ],
        };

        const shareCode = encode(board);
        const decoded = decode(shareCode);

        expect(decoded.objects[0].color).toBe('#ff0000');
    });

    it('should roundtrip color with transparency', () => {
        const board: StrategyBoard = {
            objects: [
                { type: 'line_aoe', x: 256, y: 192, color: '#00ff00', transparency: 128 },
            ],
        };

        const shareCode = encode(board);
        const decoded = decode(shareCode);

        expect(decoded.objects[0].color).toBe('#00ff00');
        expect(decoded.objects[0].transparency).toBe(128);
    });
});

describe('board backgrounds', () => {
    const backgrounds = [
        'none', 'checkered', 'checkered_circle', 'checkered_square',
        'grey', 'grey_circle', 'grey_square',
    ] as const;

    for (const bg of backgrounds) {
        it(`should roundtrip board background: ${bg}`, () => {
            const board: StrategyBoard = {
                boardBackground: bg,
                objects: [{ type: 'tank', x: 256, y: 192 }],
            };

            const shareCode = encode(board);
            const decoded = decode(shareCode);

            expect(decoded.boardBackground).toBe(bg);
        });
    }
});

describe('decode external share codes', () => {
    it('should decode Full Party share code with 12-byte name and 17 objects', () => {
        // This share code has a 12-byte name field instead of the standard 8 bytes
        const shareCode = '[stgy:aGz4kwGPfaf8h3GsnyGY8RcjsvIuShQZmcZtFzkdlUwjlvyIRWEM51OI5bb5wPoW9i5fdIqflSXuQuxO-ssbT0x7z7vVNICXYJLPw7BJrkNEkkdL1PsxTGiDSFSfaQVelWWN705StQ-Cfi25ZbbkEPv2nSuoIdeqFF8554DetpRZgJT+LXbHdZD2nCqwbMyhNX2kFAsLY-RNiNgl+BPNiNOPOLG+NrovN-mG+Qy8MQrjKFGrLUELwIq-]';

        const decoded = decode(shareCode);

        expect(decoded.name).toBe('Full Party');
        expect(decoded.boardBackground).toBe('checkered');
        expect(decoded.objects).toHaveLength(17);

        // Verify specific objects
        expect(decoded.objects[0].type).toBe('large_enemy');
        expect(decoded.objects[1].type).toBe('tank_1');
        expect(decoded.objects[2].type).toBe('tank_2');
        expect(decoded.objects[9].type).toBe('waymark_a');
        expect(decoded.objects[16].type).toBe('waymark_4');
    });
});
