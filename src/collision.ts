import Entity from './entity'
import {Intersection} from './line'
import Vector2D from './vector2d'

export interface CollisionResult {
  game_set: Entity;
  collision?: Collision;
  delta_position: Vector2D;
  delta_angle: number;
}

export class Collision extends Entity {
  public intersections: Immutable.List<Intersection>;

  constructor(intersections: Immutable.List<Intersection>) {
    super();
    this.intersections = intersections;
  }

  collided() {
    return this.intersections.size > 0;
  }
}
