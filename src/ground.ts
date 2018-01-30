import Constants from './constants'
import Vector2D from './vector2d'
import {Line} from './line'
import PhysicalObject from './physical_object';
import Utils from './utils';

const pattern = Utils.createPinstripeCanvas();

export default class Ground extends PhysicalObject {
  public points: Array<Array<number>>;
  public color: string;
  public border_color: string;

  constructor(initialize: boolean, position: Vector2D, points: Array<Array<number>>) {
    super(initialize, position, points);
  }

  protected initialize(position: Vector2D, points: Array<Array<number>>) {
    this.points = points;
    this.position = position;
    super.initialize();
  }

  protected _define_attributes() {
    this.velocity = Vector2D.empty;
    this.angular_velocity = 0;
    this.angle = 0;
    this.mass = Infinity;
    this.moment_of_inertia = Infinity;
    this.color = Constants.ground_pattern_color;
    this.border_color = Constants.ground_stroke_color;
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
    const line_to = (v: Vector2D) => {
      const vector = this._translate(v);
      return ctx.lineTo(vector.x, vector.y);
    }
    const move_to = (v: Vector2D) => {
      const vector = this._translate(v);
      return ctx.moveTo(vector.x, vector.y);
    }
    ctx.beginPath();
    const draw_polygon_pattern = (points: Vector2D[]) => {
      // ctx.fillStyle = ctx.createPattern(pattern, 'repeat');
      ctx.fillStyle = self.color;
      ctx.strokeStyle = self.border_color;
      move_to(points[0]);
      for (var i = 1; i < points.length; i++) {
          line_to(points[i]);
      }
      line_to(points[0]);
      ctx.fill();
      ctx.stroke();
    }
    draw_polygon_pattern(this.lines.map(line => line.start_position).toArray());
    ctx.restore();
  }
}
