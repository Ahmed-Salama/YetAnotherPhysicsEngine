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

  constructor(initialize: boolean, intersections: Immutable.List<Intersection>, use_self_lines_normal: boolean) {
    super(initialize, intersections, use_self_lines_normal);
  }

  public initialize(intersections: Immutable.List<Intersection>, use_self_lines_normal: boolean) {
    this.intersections = intersections;
    this.use_self_lines_normal = use_self_lines_normal;
  }

  collided() {
    return this.intersections.size > 0;
  }
}
