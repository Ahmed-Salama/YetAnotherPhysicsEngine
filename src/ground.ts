import Constants from './constants'
import GameSet from './game_set'
import Vector2D from './vector2d'
import {Line} from './line'
import PhysicalObject from './physical_object';

export default class Ground extends PhysicalObject {
  public outer_lines: Immutable.List<Line>;
  public points: Immutable.List<Array<number>>;
  public outer_points: Immutable.List<Array<number>>;

  constructor(initialize: boolean) {
    super(initialize);
  }

  protected _define_attributes() {
    super._define_attributes();
    this.name = "ground";
    this.is_ground = true;
    this.position = Vector2D.empty;
  }

  protected _build_lines() {
    super._build_lines();

    this.outer_lines = Immutable.List();

    const padding = 10;
    this.points = Immutable.List([[0+padding, 0+padding], [200 - padding, 0+padding],
                                  [200-padding, 100-padding], [0+padding, 100-padding]]);
    const offsets = Immutable.List([[-1, -1], [1, -1], [1, 1], [-1, 1]]);
    const offset = 4;
    this.outer_points = this.points.zip(offsets).map(([p, o]) =>
        [p[0] + o[0] * offset, p[1] + o[1] * offset]).toList();

    const points_array = this.points.toArray();
    for (var i = 0; i < this.points.size; i++) {
      var j = (i + 1) % this.points.size;
      const start_position = new Vector2D(points_array[i][0], points_array[i][1]);
      const end_position = new Vector2D(points_array[j][0], points_array[j][1]);
      this.lines = this.lines.push(new Line(start_position, end_position,
                                            Constants.general_elasticity));
    }

    const outer_points_array = this.outer_points.toArray();
    for (var i = 0; i < outer_points_array.length; i++) {
      var j = (i + 1) % outer_points_array.length;
      const start_position = new Vector2D(outer_points_array[i][0], outer_points_array[i][1]);
      const end_position = new Vector2D(outer_points_array[j][0], outer_points_array[j][1]);
      this.outer_lines = this.outer_lines.push(new Line(start_position, end_position,
                                                        Constants.general_elasticity));
    }
  }

  public update_game_set(_: number, game_set: GameSet) {
    return game_set;
  }

  public draw(ctx: CanvasRenderingContext2D, camera_position: Vector2D) {
    const f = 1;
    const self = this;

    ctx.save();
    const line_to = (x: number, y: number) => {
      const vector = this._camera_translate(new Vector2D(x / f, y / f), camera_position);
      return ctx.lineTo(Constants.drawing_scale * vector.x, Constants.drawing_scale * vector.y);
    }
    const move_to = (x: number, y: number) => {
      const vector = this._camera_translate(new Vector2D(x / f, y / f), camera_position);
      return ctx.moveTo(Constants.drawing_scale * vector.x, Constants.drawing_scale * vector.y);
    }
    ctx.beginPath();
    const draw_polygon_pattern = (points: number[][]) => {
      // ctx.fillStyle = ctx.createPattern(patter_canvas, 'repeat');
      ctx.fillStyle = Constants.ground_pattern_color;
      move_to(points[0][0], points[0][1]);
      for (var i = 1; i < points.length; i++) {
          line_to(points[i][0], points[i][1]);
      }
    }

    draw_polygon_pattern(this.points.toArray());
    draw_polygon_pattern(this.outer_points.toArray());
    ctx.fill('evenodd');

    ctx.beginPath();
    const draw_polygon = (points: number[][]) => {
      move_to(points[0][0], points[0][1]);
      for (var i = 1; i < points.length + 1; i++) {
        const index = i % points.length;
        line_to(points[index][0], points[index][1]);
      }
    }
    ctx.strokeStyle = Constants.ground_stroke_color;
    draw_polygon(this.points.toArray());
    ctx.stroke();
    ctx.restore();
  }
}
