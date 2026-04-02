import { MountainConfig, DESCENT_SLOPE_ANGLE, SUMMIT_FLAT_LENGTH, VALLEY_FLAT_LENGTH, BASE_FLAT_LENGTH } from '../config';
import { degToRad } from '../utils/helpers';

interface TerrainZone {
  name: 'ascent' | 'summit' | 'descent' | 'valley';
  startHeight: number;   // 沿坡面距离起点
  length: number;        // 沿坡面距离长度
  slopeDeg: number;      // 该段坡度
  direction: 1 | -1;     // 1=上升, -1=下降
}

export class TerrainProfile {
  private zones: TerrainZone[] = [];
  private totalLength = 0;

  /** 每个 zone 起点处的累计世界坐标，预计算缓存 */
  private zoneWorldOrigins: Array<{ x: number; y: number }> = [];

  constructor(mountain: MountainConfig) {
    this.build(mountain);
  }

  setMountain(mountain: MountainConfig): void {
    this.build(mountain);
  }

  private build(mountain: MountainConfig): void {
    const ascentAngleRad = degToRad(mountain.slopeAngle);
    const summitAltitude = mountain.height * Math.sin(ascentAngleRad);
    const descentLength = summitAltitude / Math.sin(degToRad(DESCENT_SLOPE_ANGLE));

    this.zones = [
      { name: 'ascent',  startHeight: 0, length: mountain.height, slopeDeg: mountain.slopeAngle, direction: 1 },
      { name: 'summit',  startHeight: mountain.height, length: SUMMIT_FLAT_LENGTH, slopeDeg: 0, direction: 1 },
      { name: 'descent', startHeight: mountain.height + SUMMIT_FLAT_LENGTH, length: descentLength, slopeDeg: DESCENT_SLOPE_ANGLE, direction: -1 },
      { name: 'valley',  startHeight: mountain.height + SUMMIT_FLAT_LENGTH + descentLength, length: VALLEY_FLAT_LENGTH, slopeDeg: 0, direction: 1 },
    ];
    this.totalLength = this.zones[this.zones.length - 1].startHeight + VALLEY_FLAT_LENGTH;

    // 预计算每个 zone 起点处的世界坐标
    this.zoneWorldOrigins = [];
    let cx = 0, cy = 0;
    for (const zone of this.zones) {
      this.zoneWorldOrigins.push({ x: cx, y: cy });
      const rad = degToRad(zone.slopeDeg);
      cx += zone.length * Math.cos(rad);
      cy -= zone.length * Math.sin(rad) * zone.direction;
      // direction: 上坡 y 减小（向上），下坡 y 增大（向下）
    }
  }

  /** 给定 height，返回世界坐标 */
  getWorldPosition(height: number): { x: number; y: number } {
    const h = Math.max(0, Math.min(height, this.totalLength));
    for (let i = 0; i < this.zones.length; i++) {
      const zone = this.zones[i];
      if (h <= zone.startHeight + zone.length || i === this.zones.length - 1) {
        const local = h - zone.startHeight;
        const rad = degToRad(zone.slopeDeg);
        const origin = this.zoneWorldOrigins[i];
        return {
          x: origin.x + local * Math.cos(rad),
          y: origin.y - local * Math.sin(rad) * zone.direction,
        };
      }
    }
    return this.zoneWorldOrigins[0]; // fallback
  }

  /** 给定 height，返回当前段坡度（弧度），带方向（下坡返回负值） */
  getSlopeRad(height: number): number {
    const zone = this.getZoneAt(height);
    return degToRad(zone.slopeDeg) * zone.direction;
  }

  /** 给定 height，返回当前所在区域名称 */
  getZoneName(height: number): 'ascent' | 'summit' | 'descent' | 'valley' {
    return this.getZoneAt(height).name;
  }

  /** 返回 valley 的起始 height（用于判断是否到达谷底） */
  getValleyStartHeight(): number {
    const valley = this.zones.find(z => z.name === 'valley')!;
    return valley.startHeight;
  }

  /** 返回整个地形的总长度 */
  getTotalLength(): number {
    return this.totalLength;
  }

  /** 返回山顶的 height 值 */
  getSummitHeight(): number {
    return this.zones[0].length; // = mountain.height
  }

  private getZoneAt(height: number): TerrainZone {
    const h = Math.max(0, Math.min(height, this.totalLength));
    for (let i = this.zones.length - 1; i >= 0; i--) {
      if (h >= this.zones[i].startHeight) return this.zones[i];
    }
    return this.zones[0];
  }

  /** 返回所有 zone 信息（供渲染用） */
  getZones(): TerrainZone[] {
    return this.zones;
  }
}