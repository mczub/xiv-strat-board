# xiv-strat-board

Encoder and decoder for FF14 Strategy Board share codes.

## Installation

```bash
npm install xiv-strat-board
```

## Usage

### Encoding a Strategy Board

```typescript
import { encode } from 'xiv-strat-board';

const shareCode = encode({
  name: 'myboard',
  boardBackground: 'checkered',
  objects: [
    { type: 'tank', x: 256, y: 192, size: 100 },
    { type: 'healer', x: 300, y: 192, size: 100 },
    { type: 'circle_aoe', x: 256, y: 192, size: 150 },
  ],
});

console.log(shareCode); // "[stgy:a...]"
```

### Decoding a Share Code

```typescript
import { decode } from 'xiv-strat-board';

const board = decode('[stgy:aVe.........]');

console.log(board.name);              // "myboard"
console.log(board.boardBackground);   // "checkered"
console.log(board.objects.length);    // 3

for (const obj of board.objects) {
  console.log(`${obj.type} at (${obj.x}, ${obj.y})`);
}
```

## API

### `encode(board: StrategyBoard, options?: EncodeOptions): string`

Encodes a strategy board to a share code.

**Parameters:**
- `board` - The strategy board to encode
- `options.key` - Optional cipher key (0-63), random if not provided

**Returns:** Share code string (e.g., `"[stgy:a...]"`)

**Throws:** `Error` if board data is invalid

### `decode(shareCode: string): DecodeResult`

Decodes a share code to a strategy board.

**Parameters:**
- `shareCode` - Share code string (e.g., `"[stgy:a...]"`)

**Returns:** Decoded strategy board with `version`, `name`, `boardBackground`, and `objects`

**Throws:** `Error` if share code is invalid or malformed

## Types

### `StrategyBoard`

```typescript
interface StrategyBoard {
  name?: string;                    // Max 7 characters
  boardBackground?: BackgroundType;
  objects: StrategyObject[];
}
```

### `StrategyObject`

```typescript
interface StrategyObject {
  type: IconType;         // e.g., 'tank', 'circle_aoe', 'waymark_a'
  typeId?: number;        // Optional numeric ID (overrides type)
  x: number;              // 0-512, center at 256
  y: number;              // 0-384, center at 192
  size?: number;          // 1-255, default 100
  background?: BackgroundType;

  // Color (only for line_aoe, line, text)
  color?: string;         // Hex color '#RRGGBB'
  transparency?: number;  // 0-255

  // AoE properties
  arcAngle?: number;      // 10-360 for fan_aoe and donut
  donutRadius?: number;   // 0-255 for donut inner radius

  // Line AoE properties
  width?: number;         // Width for line_aoe
  height?: number;        // Height for line_aoe

  // Line properties
  endX?: number;          // End X for line objects
  endY?: number;          // End Y for line objects

  // Rotation (for fan_aoe, line_aoe, line_stack, linear_knockback, etc.)
  angle?: number;         // Rotation angle in degrees

  // Counted mechanics
  displayCount?: number;      // Display count for line_stack
  horizontalCount?: number;   // Horizontal count for linear_knockback
  verticalCount?: number;     // Vertical count for linear_knockback

  // Text objects
  text?: string;          // Text content for text objects

  // Flip states
  horizontalFlip?: boolean;
  verticalFlip?: boolean;

  // Visibility
  hidden?: boolean;
  locked?: boolean;
}
```

### `BackgroundType`

```typescript
type BackgroundType =
  | 'none'
  | 'checkered'
  | 'checkered_circle'
  | 'checkered_square'
  | 'grey'
  | 'grey_circle'
  | 'grey_square';
```

### Icon Types

The package supports 100+ icon types including:

- **Role markers:** `tank`, `tank_1`, `tank_2`, `healer`, `healer_1`, `healer_2`, `dps`, `dps_1`-`dps_4`, `melee_dps`, `ranged_dps`, `physical_ranged_dps`, `magical_ranged_dps`, `pure_healer`, `barrier_healer`
- **Jobs:** All jobs including `viper`, `pictomancer`, and base classes
- **Mechanics:** `circle_aoe`, `fan_aoe`, `line_aoe`, `donut`, `stack`, `line_stack`, `gaze`, `tower`, `proximity`, `proximity_player`, `tankbuster`, `radial_knockback`, `linear_knockback`, `targeting`, `moving_circle_aoe`, `1person_aoe`-`4person_aoe`
- **Waymarks:** `waymark_a`-`waymark_d`, `waymark_1`-`waymark_4`
- **Markers:** `attack_1`-`attack_8`, `bind_1`-`bind_3`, `ignore_1`, `ignore_2`, `square_marker`, `circle_marker`, `plus_marker`, `triangle_marker`
- **Enemies:** `small_enemy`, `medium_enemy`, `large_enemy`
- **Shapes:** `shape_circle`, `shape_x`, `shape_triangle`, `shape_square`, `up_arrow`, `text`, `rotate`, `rotate_clockwise`, `rotate_counterclockwise`, `highlighted_circle`, `highlighted_x`, `highlighted_square`, `highlighted_triangle`
- **Effects:** `enhancement`, `enfeeblement`, `lockon_red`, `lockon_blue`, `lockon_purple`, `lockon_green`

See `ICON_TYPE_IDS` export for the complete list.

## Browser Support

This package works in both Node.js and browsers. It uses `pako` for zlib compression, which is browser-compatible.

## Special Thanks

Special thanks to @MinhP for reverse engineering work on the share code format and @ennea for an [awesome viewer implementation](https://ennea.github.io/ffxiv-strategy-board-viewer/).

## License

MIT
