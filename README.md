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
  type: IconType;        // e.g., 'tank', 'circle_aoe', 'waymark_a'
  typeId?: number;       // Optional numeric ID (overrides type)
  x: number;             // 0-512, center at 256
  y: number;             // 0-384, center at 192
  size?: number;         // 50-200, default 100
  background?: BackgroundType;
  color?: string;        // Hex color '#RRGGBB'
  transparency?: number; // 0-255
  arcAngle?: number;     // 10-360 for fan AoEs
  donutRadius?: number;  // 0-240 for donut AoEs
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

The package supports 80+ icon types including:

- **Role markers:** `tank`, `tank_1`, `tank_2`, `healer`, `healer_1`, `healer_2`, `dps`, `dps_1`-`dps_4`
- **Jobs:** `paladin`, `warrior`, `dark_knight`, `gunbreaker`, `white_mage`, `scholar`, `astrologian`, `sage`, etc.
- **Mechanics:** `circle_aoe`, `fan_aoe`, `donut`, `stack`, `gaze`, `tower`, `proximity`, `tankbuster`
- **Waymarks:** `waymark_a`-`waymark_d`, `waymark_1`-`waymark_4`
- **Markers:** `attack_1`-`attack_8`, `bind_1`-`bind_3`, `ignore_1`, `ignore_2`
- **Enemies:** `small_enemy`, `medium_enemy`, `large_enemy`

See `ICON_TYPE_IDS` export for the complete list.

## Browser Support

This package works in both Node.js and browsers. It uses `pako` for zlib compression, which is browser-compatible.

## License

MIT
