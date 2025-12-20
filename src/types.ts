/**
 * xiv-strat-board - FF14 Strategy Board Encoder/Decoder
 *
 * TypeScript interfaces and types for the Strategy Board format.
 */

/**
 * Valid icon type names for strategy board objects.
 * Includes AoE mechanics, jobs, role markers, waymarks, enemies, and shapes.
 */
export type IconType =
    // Field backgrounds
    | 'checkered_circle'
    | 'checkered_square'
    | 'grey_circle'
    | 'grey_square'
    // AoE/Mechanics
    | 'circle_aoe'
    | 'fan_aoe'
    | 'line_aoe'
    | 'line'
    | 'gaze'
    | 'stack'
    | 'line_stack'
    | 'proximity'
    | 'donut'
    | 'stack_multi'
    | 'proximity_player'
    | 'tankbuster'
    | 'radial_knockback'
    | 'linear_knockback'
    | 'tower'
    | 'targeting'
    | 'moving_circle_aoe'
    | '1person_aoe'
    | '2person_aoe'
    | '3person_aoe'
    | '4person_aoe'
    // Base classes
    | 'gladiator'
    | 'pugilist'
    | 'marauder'
    | 'lancer'
    | 'archer'
    | 'conjurer'
    | 'thaumaturge'
    | 'arcanist'
    | 'rogue'
    // Jobs
    | 'paladin'
    | 'monk'
    | 'warrior'
    | 'dragoon'
    | 'bard'
    | 'white_mage'
    | 'black_mage'
    | 'summoner'
    | 'scholar'
    | 'ninja'
    | 'machinist'
    | 'dark_knight'
    | 'astrologian'
    | 'samurai'
    | 'red_mage'
    | 'blue_mage'
    | 'gunbreaker'
    | 'dancer'
    | 'reaper'
    | 'sage'
    | 'viper'
    | 'pictomancer'
    // Role markers
    | 'tank'
    | 'tank_1'
    | 'tank_2'
    | 'healer'
    | 'healer_1'
    | 'healer_2'
    | 'dps'
    | 'dps_1'
    | 'dps_2'
    | 'dps_3'
    | 'dps_4'
    | 'melee_dps'
    | 'ranged_dps'
    | 'physical_ranged_dps'
    | 'magical_ranged_dps'
    | 'pure_healer'
    | 'barrier_healer'
    // Enemies
    | 'small_enemy'
    | 'medium_enemy'
    | 'large_enemy'
    // Target markers
    | 'attack_1'
    | 'attack_2'
    | 'attack_3'
    | 'attack_4'
    | 'attack_5'
    | 'attack_6'
    | 'attack_7'
    | 'attack_8'
    | 'bind_1'
    | 'bind_2'
    | 'bind_3'
    | 'ignore_1'
    | 'ignore_2'
    // Chain markers
    | 'square_marker'
    | 'circle_marker'
    | 'plus_marker'
    | 'triangle_marker'
    // Waymarks
    | 'waymark_a'
    | 'waymark_b'
    | 'waymark_c'
    | 'waymark_d'
    | 'waymark_1'
    | 'waymark_2'
    | 'waymark_3'
    | 'waymark_4'
    // Shapes
    | 'shape_circle'
    | 'shape_x'
    | 'shape_triangle'
    | 'shape_square'
    | 'up_arrow'
    | 'text'
    | 'rotate'
    | 'highlighted_circle'
    | 'highlighted_x'
    | 'highlighted_square'
    | 'highlighted_triangle'
    | 'rotate_clockwise'
    | 'rotate_counterclockwise'
    // Effects
    | 'enhancement'
    | 'enfeeblement'
    // Lock-on markers
    | 'lockon_red'
    | 'lockon_blue'
    | 'lockon_purple'
    | 'lockon_green'
    // Groups
    | 'group';

/**
 * Valid board background types.
 */
export type BackgroundType =
    | 'none'
    | 'checkered'
    | 'checkered_circle'
    | 'checkered_square'
    | 'grey'
    | 'grey_circle'
    | 'grey_square';

/**
 * An object placed on the strategy board.
 */
export interface StrategyObject {
    /** Icon type name (e.g., 'tank', 'circle_aoe') */
    type: IconType | string;

    /** Optional numeric type ID (overrides type name if provided) */
    typeId?: number;

    /** X coordinate (0-512, center at 256) */
    x: number;

    /** Y coordinate (0-384, center at 192) */
    y: number;

    /** Size percentage (50-200, default 100) */
    size?: number;

    /** Object background type */
    background?: BackgroundType | number;

    /** RGB color as hex string '#RRGGBB' */
    color?: string;

    /** Red color component (0-255) */
    colorR?: number;

    /** Green color component (0-255) */
    colorG?: number;

    /** Blue color component (0-255) */
    colorB?: number;

    /** Transparency/alpha (0-255) */
    transparency?: number;

    /** Arc angle for fan AoEs (10-360 degrees) */
    arcAngle?: number;

    /** Donut inner radius (0-240) */
    donutRadius?: number;

    /** Whether object is hidden */
    hidden?: boolean;

    /** Whether object is locked */
    locked?: boolean;
}

/**
 * A complete strategy board configuration.
 */
export interface StrategyBoard {
    /** Board name (max 7 characters, ASCII only) */
    name?: string;

    /** Board background type */
    boardBackground?: BackgroundType;

    /** Objects placed on the board */
    objects: StrategyObject[];
}

/**
 * Result of decoding a share code.
 */
export interface DecodeResult extends StrategyBoard {
    /** Format version number */
    version: number;
}

/**
 * Options for encoding a strategy board.
 */
export interface EncodeOptions {
    /**
     * Fixed cipher key (0-63).
     * If not provided, a random key will be used.
     */
    key?: number;
}
