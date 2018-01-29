import Entity from './entity'
import {Intersection} from './line'
import Vector2D from './vector2d'

export interface CollisionResult {
  physical_setup: Entity;
  collision?: Collision;
  delta_position: Vector2D;
  delta_angle: number;
}

export class Collision extends Entity {
  public intersections: Immutable.List<Intersection>;
  use_self_lines_normal: boolean;

  constructor(initialize: boolean, intersections: Immutable.List<Intersection>) {
    super(initialize, intersections);
  }

  public initialize(intersections: Immutable.List<Intersection>) {
    this.intersections = intersections;
  }

  collided() {
    return this.intersections.size > 0;
  }
}
