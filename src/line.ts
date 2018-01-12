import Constants from './constants'
import Entity from './entity'
import Vector2D from './vector2d'

export class Intersection {
  public self_line: Line;
  public other_line: Line;
  public intersection_exists: boolean;
  public intersection_point: Vector2D;

  constructor(sl: Line, ol: Line, intersection_exists: boolean, intersection_point: Vector2D) {
    this.self_line = sl;
    this.other_line = ol;
    this.intersection_exists = intersection_exists;
    this.intersection_point = intersection_point;
  }
}

export class Line extends Entity {
  public start_position: Vector2D;
  public end_position: Vector2D;
  public elasticity: number;

  constructor(start_position: Vector2D, end_position: Vector2D, elasticity: number) {
    super();
    this.start_position = start_position;
    this.end_position = end_position;
    this.elasticity = elasticity;
  }
  
  public offset(vector: Vector2D): Line {
    return this.copy({
      start_position: this.start_position.add_vector(vector),
      end_position: this.end_position.add_vector(vector)
    });
  }

  public rotate(angle: number): Line {
    return this.copy({
      start_position: this.start_position.rotate(angle),
      end_position: this.end_position.rotate(angle)
    });
  }
  
  public normal(): Vector2D {
    return this.start_position.to(this.end_position).rotate(Math.PI / 2).normalize();
  }

  public flipX(): Line {
    return this.copy({
      start_position: this.end_position.flipX(),
      end_position: this.start_position.flipX()
    }) as Line;
  }

  public flipY(): Line {
    return this.copy({
      start_position: this.end_position.flipY(),
      end_position: this.start_position.flipY()
    }) as Line;
  }

  public toString() {
    return "{start: " + this.start_position.toString() +
        ", end: " + this.end_position.toString() + "}"; 
  }

  public point_distance(p: Vector2D): number {
    const start_p = this.start_position.to(p);
    const line = this.start_position.to(this.end_position);
    const cross = line.cross(start_p);
    const line_length = line.length();
    return Math.abs(cross / line_length);
  }

  public is_intersecting(l2: Line): Intersection {
    const l1_constants = this._get_constants();
    const A1 = l1_constants[0];
    const B1 = l1_constants[1];
    const C1 = l1_constants[2];

    const l2_constants = l2._get_constants();
    const A2 = l2_constants[0];
    const B2 = l2_constants[1];
    const C2 = l2_constants[2];

    const det = A1 * B2 - A2 * B1;

    if (Math.abs(det) <= Constants.eps) {
      return new Intersection(this, l2, false, null);
    }

    const x = (B2 * C1 - B1 * C2) / det;
    const y = (A1 * C2 - A2 * C1) / det;

    return new Intersection(this, l2, this._on_segment(x, y) && l2._on_segment(x, y),
                            new Vector2D(x, y));
  }

  private _on_segment(x: number, y: number) {
    const X1 = this.start_position.x;
    const X2 = this.end_position.x;
    const Y1 = this.start_position.y;
    const Y2 = this.end_position.y;

    return Math.min(X1, X2) - Constants.eps <= x && x <= Math.max(X1, X2) + Constants.eps &&
           Math.min(Y1, Y2) - Constants.eps <= y && y <= Math.max(Y1, Y2) + Constants.eps;
  }

  private _get_constants() {
    const X1 = this.start_position.x;
    const X2 = this.end_position.x;
    const Y1 = this.start_position.y;
    const Y2 = this.end_position.y;

    const A = Y2 - Y1;
    const B = X1 - X2;
    const C = A * X1 + B * Y1;
    return [A, B, C];
  }

}
