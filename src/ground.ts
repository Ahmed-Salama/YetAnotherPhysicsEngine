import Constants from './constants'
import PhysicalSetup from './physical_setup'
import Vector2D from './vector2d'
import {Line} from './line'
import PhysicalObject from './physical_object';

export default class Ground extends PhysicalObject {
  public points: Array<Array<number>>;

  constructor(initialize: boolean, points: Array<Array<number>>) {
    super(initialize, points);
  }

  protected initialize(points: Array<Array<number>>) {
    this.points = points;
    super.initialize();
  }

  protected _define_attributes() {
    super._define_attributes();
    this.name = "ground";
    this.is_ground = true;
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

  public update_physical_setup(_: number, physical_setup: PhysicalSetup) {
    return physical_setup;
  }

  public draw(ctx: CanvasRenderingContext2D) {
    const f = 1;
    const self = this;

    ctx.save();
    const line_to = (x: number, y: number) => {
      const vector = this._translate(new Vector2D(x / f, y / f));
      return ctx.lineTo(Constants.drawing_scale * vector.x, Constants.drawing_scale * vector.y);
    }
    const move_to = (x: number, y: number) => {
      const vector = this._translate(new Vector2D(x / f, y / f));
      return ctx.moveTo(Constants.drawing_scale * vector.x, Constants.drawing_scale * vector.y);
    }
    ctx.beginPath();
    const draw_polygon_pattern = (points: number[][]) => {
      // ctx.fillStyle = ctx.createPattern(patter_canvas, 'repeat');
      ctx.fillStyle = Constants.ground_pattern_color;
      ctx.strokeStyle = Constants.ground_stroke_color;
      move_to(points[0][0], points[0][1]);
      for (var i = 1; i < points.length; i++) {
          line_to(points[i][0], points[i][1]);
      }
      ctx.fill();
      ctx.stroke();
    }
    draw_polygon_pattern(this.points);
    ctx.restore();
  }
}
