import Constants from './constants'
import Vector2D from './vector2d'
import {Line} from './line'
import PhysicalObject from './physical_object';

export default class CustomObject extends PhysicalObject {
  public points: Array<Array<number>>;
  public color: string;

  constructor(initialize: boolean, position: Vector2D, points: Array<Array<number>>, color: string) {
    super(initialize, position, points, color);
  }

  protected initialize(position: Vector2D, points: Array<Array<number>>, color: string) {
    this.points = points;
    super.initialize();
    this.position = position;
    this.color = color;
  }

  protected _define_attributes() {
    super._define_attributes();
    this.position = Vector2D.empty;
    this.mass = Infinity;
    this.moment_of_inertia = Infinity;
  }

  protected _build_lines() {
    super._build_lines();

    for (var i = 0; i < this.points.length; i++) {
      var j = (i + 1) % this.points.length;
      const start_position = new Vector2D(this.points[i][0], this.points[i][1]);
      const end_position = new Vector2D(this.points[j][0], this.points[j][1]);
      this.lines = this.lines.push(new Line(true,
                                            start_position,
                                            end_position,
                                            Constants.general_elasticity));
    }
  }

  public updated_with_collisions(_: Immutable.List<PhysicalObject>): PhysicalObject {
    return this;
  }

  public draw(ctx: CanvasRenderingContext2D) {
    const f = 1;
    const self = this;

    if (Constants.debugging) {
      super.draw(ctx);
      return;
    }

    ctx.save();
    const line_to = (x: number, y: number) => {
      const vector = this._translate(new Vector2D(x / f, y / f));
      return ctx.lineTo(vector.x, vector.y);
    }
    const move_to = (x: number, y: number) => {
      const vector = this._translate(new Vector2D(x / f, y / f));
      return ctx.moveTo(vector.x, vector.y);
    }
    ctx.beginPath();
    const draw_polygon_pattern = (points: number[][]) => {
      ctx.fillStyle = self.color;
      move_to(points[0][0], points[0][1]);
      for (var i = 1; i < points.length; i++) {
          line_to(points[i][0], points[i][1]);
      }
      line_to(points[0][0], points[0][1]);
      ctx.fill();
    }
    draw_polygon_pattern(this.points);
    ctx.restore();
  }
}
