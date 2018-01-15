import Constants from './constants'
import PhysicalSetup from './physical_setup'
import Vector2D from './vector2d'
import {Line} from './line'
import PhysicalObject from './physical_object';
import GameElement from './game_element';

export default class Ball extends PhysicalObject {
  public radius: number;

  constructor(initialize: boolean) {
    super(initialize);
  }

  protected _define_attributes() {
    super._define_attributes();
    this.radius = 10;
    this.position = new Vector2D(80, 40);
    this.velocity = new Vector2D(0, 0);
    this.mass = 20;
    this.name = "ball";
  }

  protected _build_lines() {
    super._build_lines();
    const f = 3;
    // const points = [[20, 10], [20, 4],
    //                 [-2, -7], [-20, -10],
    //                 [-20, 10], [-16, 14], [16, 14]];
    const points = [[20, 10], [20, -10], [-20, -10], [-20, 10]];

    const up_vector = new Vector2D(0, -1);
    const normal_overrides = [null, up_vector,
                              up_vector, null,
                              null, null, null];

    const elasticity = [Constants.general_elasticity, Constants.general_elasticity,
                        Constants.general_elasticity, Constants.general_elasticity,
                        Constants.tire_elasticity, Constants.tire_elasticity,
                        Constants.tire_elasticity];

    for (let i = 0; i < points.length; i++) {
      const j = (i + 1) % points.length;
      const p1 = points[i];
      const p2 = points[j];
      this.lines = this.lines.push(new Line(true,
                                            new Vector2D(p1[0] / f, p1[1] / f),
                                            new Vector2D(p2[0] / f, p2[1] / f),
                                            elasticity[i],
                                            null));
    }
    // const samples = 16;
    // for (var s = 0; s < samples; s++) {
    //   const angle1 = -s * 2 * Math.PI / samples;
    //   const angle2 = -(s + 1) * 2 * Math.PI / samples;

    //   const start_position = new Vector2D(this.radius * Math.cos(angle1),
    //                                       this.radius * Math.sin(angle1));
    //   const end_position = new Vector2D(this.radius * Math.cos(angle2),
    //                                     this.radius * Math.sin(angle2));
    //   this.lines = this.lines.push(new Line(true,
    //                                         start_position,
    //                                         end_position,
                                            // Constants.general_elasticity));
    // }
  }

  public updated_before_collision(time_unit: number, other_objects: Immutable.List<PhysicalObject>): PhysicalObject {
    return this._updated_with_physics(time_unit) as Ball;
  }

  public updated_with_collisions(collided_objects: Immutable.List<PhysicalObject>): Ball {
    return this;
  }

  public draw(ctx: CanvasRenderingContext2D, camera_position: Vector2D) {
    ctx.save();
    if (Constants.debugging) {
      ctx.strokeStyle = "blue";
      super.draw(ctx, camera_position);
    } else {
      this._draw_circle(Vector2D.empty, 1, Constants.drawing_scale * this.radius,
                        "#21618C", ctx, camera_position);
      this._draw_circle(Vector2D.empty, 1, Constants.drawing_scale * 0.9 * this.radius,
                        "#3498DB", ctx, camera_position);
      this._draw_circle(Vector2D.empty, 1, Constants.drawing_scale * 0.8 * this.radius,
                        "#5DADE2", ctx, camera_position);
      this._draw_circle(Vector2D.empty, 1, Constants.drawing_scale * 0.6 * this.radius,
                        "#85C1E9", ctx, camera_position);
      this._draw_circle(Vector2D.empty, 1, Constants.drawing_scale * 0.2 * this.radius,
                        "#AED6F1", ctx, camera_position);
    }
    ctx.restore();
  }
}
