/**
 * xiv-strat-board - FF14 Strategy Board Encoder/Decoder
 *
 * Cipher tables and icon/background mappings from game data.
 */

/**
 * Cipher lookup table (DAT_1420cf520 from game binary).
 * Used to decode the key character in share codes.
 */
export const CIPHER_TABLE = new Uint8Array([
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 78, 0, 80, 0, 0,
    120, 103, 48, 75, 56, 83, 74, 50, 115, 90, 0, 0, 0, 0, 0, 0,
    0, 68, 70, 116, 84, 54, 69, 97, 86, 99, 112, 76, 77, 109, 101, 106,
    57, 88, 66, 52, 82, 89, 55, 95, 110, 79, 98, 0, 0, 0, 0, 0,
    0, 105, 45, 118, 72, 67, 65, 114, 87, 111, 100, 73, 113, 104, 85, 108,
    107, 51, 102, 121, 53, 71, 119, 49, 117, 122, 81, 0, 0, 0, 0, 0,
]);

/**
 * Reverse mapping of CIPHER_TABLE for encoding.
 * Maps output character code -> input character code.
 */
export const KEY_REVERSE: Record<number, number> = {};
for (let i = 0; i < CIPHER_TABLE.length; i++) {
    if (CIPHER_TABLE[i] !== 0) {
        KEY_REVERSE[CIPHER_TABLE[i]] = i;
    }
}

/**
 * Inverse character substitution mapping.
 * Maps obfuscated character code -> standard Base64 character code.
 */
export const INVERSE_MAPPING: Record<number, number> = {
    98: 45, 50: 48, 119: 49, 55: 50, 113: 51, 83: 52, 116: 53, 69: 54,
    86: 55, 52: 56, 80: 57, 102: 65, 82: 66, 101: 67, 65: 68, 70: 69,
    66: 70, 117: 71, 100: 72, 107: 73, 54: 74, 51: 75, 75: 76, 76: 77,
    43: 78, 89: 79, 45: 80, 122: 81, 84: 82, 53: 83, 68: 84, 110: 85,
    72: 86, 104: 87, 81: 88, 85: 89, 57: 90, 87: 95, 71: 97, 90: 98,
    73: 99, 106: 100, 78: 101, 114: 102, 49: 103, 109: 104, 97: 105,
    79: 106, 112: 107, 111: 108, 77: 109, 88: 110, 105: 111, 74: 112,
    108: 113, 103: 114, 56: 115, 67: 116, 120: 117, 99: 118, 118: 119,
    48: 120, 115: 121, 121: 122,
};

/**
 * Forward character substitution mapping (reverse of INVERSE_MAPPING).
 * Maps standard Base64 character code -> obfuscated character code.
 */
export const FORWARD_MAPPING: Record<number, number> = {};
for (const [k, v] of Object.entries(INVERSE_MAPPING)) {
    FORWARD_MAPPING[v] = Number(k);
}

/**
 * Icon type name to numeric ID mapping.
 * Complete list from stgy.csv game data.
 */
export const ICON_TYPE_IDS: Record<string, number> = {
    // Field backgrounds (type 1)
    checkered_circle: 4,
    checkered_square: 8,
    grey_circle: 124,
    grey_square: 125,

    // AoE/Mechanics (type 6)
    circle_aoe: 9,
    fan_aoe: 10,
    line_aoe: 11,
    line: 12,
    gaze: 13,
    stack: 14,
    line_stack: 15,
    proximity: 16,
    donut: 17,
    stack_multi: 106,
    proximity_player: 107,
    tankbuster: 108,
    radial_knockback: 109,
    linear_knockback: 110,
    tower: 111,
    targeting: 112,
    moving_circle_aoe: 126,
    '1person_aoe': 127,
    '2person_aoe': 128,
    '3person_aoe': 129,
    '4person_aoe': 130,

    // Base classes (type 2)
    gladiator: 18,
    pugilist: 19,
    marauder: 20,
    lancer: 21,
    archer: 22,
    conjurer: 23,
    thaumaturge: 24,
    arcanist: 25,
    rogue: 26,

    // Jobs (type 2)
    paladin: 27,
    monk: 28,
    warrior: 29,
    dragoon: 30,
    bard: 31,
    white_mage: 32,
    black_mage: 33,
    summoner: 34,
    scholar: 35,
    ninja: 36,
    machinist: 37,
    dark_knight: 38,
    astrologian: 39,
    samurai: 40,
    red_mage: 41,
    blue_mage: 42,
    gunbreaker: 43,
    dancer: 44,
    reaper: 45,
    sage: 46,
    viper: 101,
    pictomancer: 102,

    // Role markers (type 2)
    tank: 47,
    tank_1: 48,
    tank_2: 49,
    healer: 50,
    healer_1: 51,
    healer_2: 52,
    dps: 53,
    dps_1: 54,
    dps_2: 55,
    dps_3: 56,
    dps_4: 57,
    melee_dps: 118,
    ranged_dps: 119,
    physical_ranged_dps: 120,
    magical_ranged_dps: 121,
    pure_healer: 122,
    barrier_healer: 123,

    // Enemies (type 3)
    small_enemy: 60,
    medium_enemy: 62,
    large_enemy: 64,

    // Target markers (type 3)
    attack_1: 65,
    attack_2: 66,
    attack_3: 67,
    attack_4: 68,
    attack_5: 69,
    attack_6: 115,
    attack_7: 116,
    attack_8: 117,
    bind_1: 70,
    bind_2: 71,
    bind_3: 72,
    ignore_1: 73,
    ignore_2: 74,

    // Chain markers (type 3)
    square_marker: 75,
    circle_marker: 76,
    plus_marker: 77,
    triangle_marker: 78,

    // Waymarks (type 3)
    waymark_a: 79,
    waymark_b: 80,
    waymark_c: 81,
    waymark_d: 82,
    waymark_1: 83,
    waymark_2: 84,
    waymark_3: 85,
    waymark_4: 86,

    // Shapes (type 4)
    shape_circle: 87,
    shape_x: 88,
    shape_triangle: 89,
    shape_square: 90,
    up_arrow: 94,
    text: 100,
    rotate: 103,
    highlighted_circle: 135,
    highlighted_x: 136,
    highlighted_square: 137,
    highlighted_triangle: 138,
    rotate_clockwise: 139,
    rotate_counterclockwise: 140,

    // Effects (type 3)
    enhancement: 113,
    enfeeblement: 114,

    // Lock-on markers (type 3)
    lockon_red: 131,
    lockon_blue: 132,
    lockon_purple: 133,
    lockon_green: 134,

    // Groups (type 5)
    group: 105,
};

/**
 * Icon numeric ID to type name mapping (reverse of ICON_TYPE_IDS).
 */
export const ICON_TYPES: Record<number, string> = {};
for (const [name, id] of Object.entries(ICON_TYPE_IDS)) {
    ICON_TYPES[id] = name;
}

/**
 * Board background numeric ID to name mapping.
 * Used in Tag 3 footer.
 */
export const BOARD_BACKGROUND_TYPES: Record<number, string> = {
    1: 'none',
    2: 'checkered',
    3: 'checkered_circle',
    4: 'checkered_square',
    5: 'grey',
    6: 'grey_circle',
    7: 'grey_square',
};

/**
 * Board background name to numeric ID mapping.
 */
export const BOARD_BACKGROUND_IDS: Record<string, number> = {
    none: 1,
    checkered: 2,
    checkered_circle: 3,
    checkered_square: 4,
    grey: 5,
    grey_circle: 6,
    grey_square: 7,
};

/**
 * Object background numeric ID to name mapping.
 */
export const OBJECT_BACKGROUND_TYPES: Record<number, string> = {
    0: 'none',
    1: 'checkered',
    2: 'checkered_circle',
    3: 'checkered_square',
    4: 'grey',
    5: 'grey_circle',
    6: 'grey_square',
};

/**
 * Object background name to numeric ID mapping.
 */
export const OBJECT_BACKGROUND_IDS: Record<string, number> = {
    none: 0,
    checkered: 1,
    checkered_circle: 2,
    checkered_square: 3,
    grey: 4,
    grey_circle: 5,
    grey_square: 6,
};
