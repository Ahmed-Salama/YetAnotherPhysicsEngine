import Constants from './constants'
import Vector2D from './vector2d'
import {Line} from './line'
import PhysicalObject from './physical_object';

export default class Ball extends PhysicalObject {
  public radius: number;

  constructor(initialize: boolean, position: Vector2D) {
    super(initialize, position);
  }

  protected initialize(position: Vector2D) {
    super.initialize();
    this.position = position;
  }

  protected _define_attributes() {
    super._define_attributes();
    this.radius = 10;
    this.velocity = new Vector2D(0, 0);
    this.mass = 20;
  }

  protected _build_lines() {
    super._build_lines();
    
    const samples = 16;
    for (var s = 0; s < samples; s++) {
      const angle1 = -s * 2 * Math.PI / samples;
      const angle2 = -(s + 1) * 2 * Math.PI / samples;

      const start_position = new Vector2D(this.radius * Math.cos(angle1),
                                          this.radius * Math.sin(angle1));
      const end_position = new Vector2D(this.radius * Math.cos(angle2),
                                        this.radius * Math.sin(angle2));
      this.lines = this.lines.push(new Line(true,
                                            start_position,
                                            end_position,
                                            Constants.general_elasticity));
    }


  }

  public updated_before_collision(time_unit: number, other_objects: Immutable.List<PhysicalObject>): PhysicalObject {
    return this._updated_with_physics(time_unit);
  }

  public updated_with_collisions(collided_objects: Immutable.List<PhysicalObject>): Ball {
    return this;
  }

  public draw(ctx: CanvasRenderingContext2D) {
    const self = this;
    ctx.save();
    if (Constants.debugging) {
      ctx.strokeStyle = "blue";
      super.draw(ctx);
    } else {
      this._draw_circle(Vector2D.empty, 1, Constants.drawing_scale * this.radius,
                        "#21618C", ctx);
      this._draw_circle(Vector2D.empty, 1, Constants.drawing_scale * 0.9 * this.radius,
                        "#3498DB", ctx);
      this._draw_circle(Vector2D.empty, 1, Constants.drawing_scale * 0.8 * this.radius,
                        "#5DADE2", ctx);
      this._draw_circle(Vector2D.empty, 1, Constants.drawing_scale * 0.6 * this.radius,
                        "#85C1E9", ctx);
      this._draw_circle(Vector2D.empty, 1, Constants.drawing_scale * 0.2 * this.radius,
                        "#AED6F1", ctx);


      const fixed_shape_radius = 9;
      const fixed_shape_angles = Immutable.List([0, 2 / 3 * Math.PI, 4 / 3 * Math.PI]);
      fixed_shape_angles.forEach(angle => {
        const center = new Vector2D(fixed_shape_radius * Math.cos(angle),
                                    fixed_shape_radius * Math.sin(angle));
        self._draw_circle(center, 1, 8, "#2C3E50", ctx);
      });
    }
    ctx.restore();
  }
}
