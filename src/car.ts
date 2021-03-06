import Constants from './constants'
import {Line} from './line'
import Vector2D from './vector2d'
import PhysicalObject from './physical_object';
import Pipeline from './pipeline';
import PipelineTransformer from './pipeline_transformer';
import Ground from './ground';

export default class Car extends PhysicalObject {
  public static readonly NITRO_STRENGTH = 20;
  public static readonly ROTATION_STRENGTH = 4;
  public static readonly JUMP_STRENGTH = 30;

  public flying_state: string;
  public dodge_direction: number;
  public jump_state: string;
  public jump_timer: number;
  public flip_timer: number;
  public jump_count: number;
  public nitro_state: string;
  public flip_x_state: string;
  public flip_y_state: string;
  public forward: Vector2D;
  public jumper: Vector2D;
  public tires: Immutable.List<Vector2D>;
  public direction_x: number;
  public direction_y: number;
  public touching_ground: boolean;
  public touching_ground_normals: Immutable.List<Vector2D>;
  public tire_angle: number;

  constructor(initialize: boolean, position: Vector2D) {
      super(initialize, position);
  }

  protected initialize(position: Vector2D) {
    this.position = position;
    super.initialize();
    this.tires = this.tires.map(tire => tire.subtract(this.center_of_mass)).toList();
  }

  protected _define_attributes() {
    this.velocity = new Vector2D(0, 0);
    this.angular_velocity = 0;
    this.angle = 0;
    this.mass = 200;
    this.flying_state = "flying";
    this.dodge_direction = 0;
    this.jump_state = "station";
    this.jump_timer = 0;
    this.flip_timer = 0;
    this.jump_count = 0;
    this.nitro_state = "idle";
    this.flip_x_state = "idle";
    this.flip_y_state = "idle";
    this.direction_x = 1;
    this.direction_y = 1;
    this.touching_ground = false;
    this.tire_angle = 0;
  }

  protected _build_lines() {
    super._build_lines();

    const f = 3;
    const points = [[20, 10], [20, 4],
                    [-2, -7], [-20, -10],
                    [-20, 10], [-16, 14], [16, 14]];

    const up_vector = new Vector2D(0, -1);
    const normal_overrides = [null, up_vector,
                              up_vector, null,
                              null, null, null];

    const elasticity = [Constants.general_elasticity, Constants.general_elasticity,
                        Constants.general_elasticity, Constants.general_elasticity,
                        Constants.tire_elasticity, Constants.tire_elasticity, Constants.tire_elasticity];

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

    this.forward = new Vector2D(-1, 0);
    this.jumper = new Vector2D(0, 1);
    this.tires = Immutable.List([new Vector2D(-16 / f, 14 / f), new Vector2D(16 / f, 14 / f)]);
  }

  protected _mirrorX(): Car {
    return this.copy({
      lines: this.lines.map(line => line.flipX()).toList(),
      forward: this.forward.flipX(),
      jumper: this.jumper.flipX(),
      tires: this.tires.map(tire => tire.flipX()).toList(),
      center_of_mass: this.center_of_mass.flipX(),
      direction_x: this.direction_x * -1
    });
  }

  protected _mirrorY(): Car {
    return this.copy({
      lines: this.lines.map(line => line.flipY()).toList(),
      forward: this.forward.flipY(),
      jumper: this.jumper.flipY(),
      tires: this.tires.map(tire => tire.flipY()).toList(),
      center_of_mass: this.center_of_mass.flipY(),
      direction_y: this.direction_y * -1
    });
  }

  private _apply_flip_x_input(): Car {
    const after_flip_x_input: Car = Constants.key_pressed.get("S") ?
      (this.flip_x_state == "idle" ?
        this.copy({ flip_x_state: "active" }) :
        this) :
      (this.flip_x_state == "idle" ?
        this:
        this.copy({ flip_x_state: "idle" }));

    const is_flipping_x = this.flip_x_state == "idle" &&
                          after_flip_x_input.flip_x_state == "active";
    return is_flipping_x ? after_flip_x_input._mirrorX() : after_flip_x_input;
  }

  private _apply_flip_y_input(): Car {
    const after_flip_y_input: Car = Constants.key_pressed.get("D") ?
      (this.flip_y_state == "idle" ?
        this.copy({ flip_y_state: "active" }) :
        this) :
      (this.flip_y_state == "idle" ?
        this :
        this.copy({ flip_y_state: "idle" }));

    const is_flipping_y = this.flip_y_state == "idle" &&
                          after_flip_y_input.flip_y_state == "active";
    return is_flipping_y ? after_flip_y_input._mirrorY() : after_flip_y_input;
  }

  private _apply_ground_movement_input(time_unit: number): Car {
    const movement_added_velocity = 
      (this.touching_ground ? 1 : 0) *
      (Constants.key_pressed.get("down") * -1 +
      Constants.key_pressed.get("up"));

    const movement_vectory = 
      this.forward
        .reverse()
        .normalize()
        .multiply(movement_added_velocity)
        .rotate(this.angle)
        .multiply(Car.NITRO_STRENGTH);

    return this.copy({
      velocity: this.velocity.add_vector(movement_vectory.multiply(time_unit * 1.0 / 1000))
    });
  }

  private _apply_nitro_input(time_unit: number): Car {
    const after_nitro_input: Car = this.copy({
      nitro_state: Constants.key_pressed.get("nitro") ? "active" : "idle"
    });

    const is_nitro_active = after_nitro_input.nitro_state == "active";

    const nitro_vector = 
      this.forward
        .reverse()
        .normalize()
        .multiply(is_nitro_active ? 1 : 0)
        .rotate(this.angle)
        .multiply(Car.NITRO_STRENGTH);

    return after_nitro_input.copy({
      velocity: after_nitro_input.velocity.add_vector(nitro_vector.multiply(time_unit * 1.0 / 1000))
    });
  }

  private _get_ground_lines_touching_both_tires(grounds: Immutable.List<PhysicalObject>): Immutable.List<Line> {
    const TIRE_RADIUS = 1;
    const self = this;

    const get_ground_lines_touching_tires = (tires: Immutable.List<Vector2D>, ground: PhysicalObject): Immutable.List<Line> => {
      return ground.lines.filter(ground_line => {
        return tires.every(tire => {
          const projected_tire = tire.rotate(self.angle).add_vector(self.position);
          return ground_line.offset(ground.position).point_distance(projected_tire) < TIRE_RADIUS;
        });
      }).toList();
    }

    return grounds.flatMap(ground => get_ground_lines_touching_tires(this.tires, ground)).toList();
  }

  private _apply_ground_touches(collided_objects: Immutable.List<PhysicalObject>): PhysicalObject {
    const collided_grounds = collided_objects.filter(o => o instanceof Ground).toList();
    const ground_lines_touching_both_tires = this._get_ground_lines_touching_both_tires(collided_grounds);

    return this.copy({
      touching_ground: ground_lines_touching_both_tires.size > 0,
      touching_ground_normals: ground_lines_touching_both_tires.map(l => l.normal).toList(),
    });
  }

  private _apply_jump_reset(): PhysicalObject {
    if (this.touching_ground) {
      const new_angle = this.touching_ground_normals.first().crossW(this.direction_y * -1).angle();

      // Reset angular velocity and set the angle so that the forward is perpendicular to the ground
      return this.copy({ jump_count: this.jump_timer > 0 ? this.jump_count : 2, angular_velocity: 0, angle: new_angle });
    } else {
      return this;
    }
  }

  private _apply_jump_input(time_unit: number): Car {
    const is_dodging = 
      !this.touching_ground && 
      this.flip_timer > 0 && 
      ((Constants.key_pressed.get("left") == 1) !== (Constants.key_pressed.get("right") == 1));

    const after_jump_input: Car = Constants.key_pressed.get("A") ?
      (this.jump_state == "station" && this.jump_count > 0 && !is_dodging ?
        this.copy({
          flying_state: "flying",
          jump_state: "jumping",
          jump_timer: Constants.jump_timer_duration,
          jump_count: this.jump_count - 1,
          flip_timer: Constants.flip_timer_duration
        }) :
        this.copy({
          jump_timer: Math.max(0, this.jump_timer - 1),
          flip_timer: Math.max(0, this.flip_timer - 1)
        })) :
      (this.jump_state == "station" ?
        this.copy({
          jump_timer: Math.max(0, this.jump_timer - 1),
          flip_timer: Math.max(0, this.flip_timer - 1)
        }) :
        this.copy({
          jump_state: "station",
          jump_timer: Math.max(0, this.jump_timer - 1),
          flip_timer: Math.max(0, this.flip_timer - 1)
        }));

    const car_jumping_index = after_jump_input.jump_timer;
    const car_jumping = after_jump_input.jump_timer > 0;
    const car_flying = after_jump_input.flying_state == "flying";

    const jump_vector = 
      this.jumper
        .reverse()
        .normalize()
        .multiply(car_flying ? 1 : 0)
        .multiply(car_jumping ? 1 : 0)
        .rotate(this.angle)
        .multiply(Car.JUMP_STRENGTH)
        .multiply(1.0 / Math.pow(2, Constants.jump_timer_duration - car_jumping_index + 1));

    return after_jump_input.copy({
      velocity: after_jump_input.velocity.add_vector(jump_vector),
    });
  }

  private _apply_dodge_input(time_unit: number): Car {
    const is_dodging = 
      !this.touching_ground && 
      this.flip_timer > 0 && 
      ((Constants.key_pressed.get("left") == 1) !== (Constants.key_pressed.get("right") == 1));

    const dodge_direction = 
      (Constants.key_pressed.get("left") * -1 +
      Constants.key_pressed.get("right"));

    const after_jump_input: Car = Constants.key_pressed.get("A") ?
      (this.jump_state == "station" && this.jump_count > 0 && is_dodging ?
        this.copy({
          flying_state: "dodging",
          dodge_direction: dodge_direction,
          jump_state: "jumping",
          jump_timer: Constants.dodge_timer_duration,
          jump_count: 0
        }) :
        this.copy({
          jump_timer: Math.max(0, this.jump_timer - 1)
        })) :
      (this.jump_state == "station" ?
        this.copy({
          jump_timer: Math.max(0, this.jump_timer - 1)
        }) :
        this.copy({
          jump_state: "station",
          jump_timer: Math.max(0, this.jump_timer - 1)
        }));

    const car_jumping_index = after_jump_input.jump_timer;
    const car_jumping = after_jump_input.jump_timer > 0;
    const car_dodging = after_jump_input.flying_state == "dodging";

    const apply_dodge = (car_dodging ? 1 : 0) * (car_jumping ? 1 : 0);
    const dodge_angular_velocity = apply_dodge * after_jump_input.dodge_direction * Car.ROTATION_STRENGTH * 2 * time_unit * 1.0 / 1000;
    const dodge_velocity =
      this.forward
        .reverse()
        .rotate(this.angle)
        .multiply(this.direction_x * this.direction_y * after_jump_input.dodge_direction)
        .resetY()
        .normalize()
        .multiply(car_jumping_index == Constants.dodge_timer_duration ? 1 : 0)
        .multiply(apply_dodge)
        .multiply(30);

    return after_jump_input.copy({
      velocity: after_jump_input.velocity.add_vector(dodge_velocity),
      angular_velocity: after_jump_input.angular_velocity + dodge_angular_velocity,
    });
  }

  private _apply_rotation_input(time_unit: number): Car {
    const angular_force = 
      (this.touching_ground ? 0 : 1) *
      (Constants.key_pressed.get("left") * -1 +
      Constants.key_pressed.get("right"));

    const angular_velocity_input = 
      Car.ROTATION_STRENGTH *
      angular_force *
      time_unit * 1.0 / 1000;

    return this.copy({
      angular_velocity: this.angular_velocity + angular_velocity_input
    });
  }

  private _update_tire_angle(time_unit: number): Car {
    if (this.touching_ground) {
      return this.copy({ tire_angle: this.tire_angle - this.forward.normalize().multiply(this.velocity.dot(this.forward.normalize())).cross(this.touching_ground_normals.first()) * time_unit * 1.0 / 1000 });
    } else {
      return this;
    }
  }

  public updated_before_collision(time_unit: number, other_objects: Immutable.List<PhysicalObject>): Car {
    const pipeline = new Pipeline<PhysicalObject>(Immutable.List([
      new PipelineTransformer(this._apply_flip_x_input, []),
      new PipelineTransformer(this._apply_flip_y_input, []),
      new PipelineTransformer(this._apply_nitro_input, [time_unit]),
      new PipelineTransformer(this._apply_ground_movement_input, [time_unit]),
      new PipelineTransformer(this._apply_ground_touches, [other_objects]),
      new PipelineTransformer(this._apply_jump_reset, []),
      new PipelineTransformer(this._apply_jump_input, [time_unit]),
      new PipelineTransformer(this._apply_dodge_input, [time_unit]),
      new PipelineTransformer(this._apply_rotation_input, [time_unit]),
      new PipelineTransformer(this._update_tire_angle, [time_unit]),
      new PipelineTransformer(this._updated_with_physics, [time_unit])
    ]));

    return pipeline.execute(this) as Car;
  }

  private _cancel_vertical_velocity_if_dodging(): Car {
    const car_jumping = this.jump_timer > 0;
    const car_dodging = this.flying_state == "dodging";

    if (car_jumping && car_dodging) {
      return this.copy({ velocity: this.velocity.resetY() });
    } else {
      return this;
    }
  }

  private _cancel_angular_velocity_if_touching_ground(): Car {
    if (this.touching_ground) {
      return this.copy({ angular_velocity: 0 });
    }
    else {
      return this;
    }
  }

  private _cancel_upward_velocity_if_touching_ground(): Car {
    const ground_normal = this.touching_ground_normals.first();
    if (this.touching_ground) {
      return this.copy({ velocity: this.velocity.rotate(-ground_normal.angle()).mapX(x => Math.max(x, 0)).rotate(ground_normal.angle()) });
    }
    else {
      return this;
    }
  }

  public updated_with_collisions(collided_objects: Immutable.List<PhysicalObject>): Car {
    const pipeline = new Pipeline<PhysicalObject>(Immutable.List([
      new PipelineTransformer(this._cancel_vertical_velocity_if_dodging, []),
      new PipelineTransformer(this._cancel_angular_velocity_if_touching_ground, []),
      new PipelineTransformer(this._cancel_upward_velocity_if_touching_ground, []),
    ]));

    return pipeline.execute(this) as Car;
  }

  public draw(ctx: CanvasRenderingContext2D) {
    const f = 3;
    const self = this;

    ctx.save();
    if (Constants.debugging) {
      ctx.strokeStyle = "red";
      super.draw(ctx);

      this._draw_circle(this.forward, 1, 1, "violet", ctx);
      this._draw_circle(this.jumper, 1, 1, this.jump_state == "station" ? "yellow" : "orange", ctx);

      this.tires.forEach(tire => self._draw_circle(tire, 1, 0.25, "red", ctx));
    } else {
      const line_to = (x: number, y: number) => {
        const vector = this._translate((new Vector2D(x, y)).multiply(1/f).subtract(self.center_of_mass));
        return ctx.lineTo(vector.x, vector.y);
     }
      const move_to = (x: number, y: number) => {
        const vector = this._translate((new Vector2D(x, y)).multiply(1/f).subtract(self.center_of_mass));
        return ctx.moveTo(vector.x, vector.y);
      }
      const draw_polygon = (points: number[][], color: string) => {
        ctx.fillStyle = color;
        ctx.strokeStyle = "black";
        // ctx.lineWidth = 0.1;
        ctx.beginPath();
        move_to(points[0][0] * this.direction_x, points[0][1] * this.direction_y);
        for (var i = 1; i < points.length; i++) {
          line_to(points[i][0] * this.direction_x, points[i][1] * this.direction_y);
        }
        ctx.fill();
        ctx.stroke();
      }

      // Nitro
      if (this.nitro_state == "active") {
        const random_extra_length = 4 * Math.random();
        draw_polygon([[-10, -3], [-30 - random_extra_length, -1],
                      [-30 - random_extra_length, 3], [-10, 4]], "#D35400");
        draw_polygon([[-10, -2], [-25 - random_extra_length, 0],
                      [-25 - random_extra_length, 2], [-10, 4]], "#F4D03F");
      }

      draw_polygon([[20, 7], 
                    [-16, -4], [-16, 6],
                    [12, 8]],
                  "black");

      draw_polygon([[20, 7], [20, 3],
                    [12, 0], [7, -4], [-2, -7], [-5, -3],
                    [-18, -3], [-18, 1],
                    [-8, 3], [-2, 9], [2, 9], [8, 5], [12, 4]],
                   "#E67E22");

      draw_polygon([[-12, -8],
                    [-20, -10], [-20, -7],
                    [-12, -7]], "#E67E22");

      draw_polygon([[-15, -7], [-17, -7], [-16, -4], [-14, -4]], "gray");
      draw_polygon([[-1, -5.5], [-3, -3.5], [5, -0.5], [-14, -4]], "gray");
      draw_polygon([[-1, -5.5], [-3, -3.5], [5, -0.5], [9, -0.5], [6, -3.5]], "black");
      
      draw_polygon([[-2, -7], [-12, -6], [-14, -3], [-5, -3]], "gray");
      draw_polygon([[-4, -6], [-10, -5], [-14, -4], [-5, -4]], "#922B21");

      const draw_tire = (x: number, y: number) => {
        const tire_center = (new Vector2D(x, y)).multiply(1/f).subtract(self.center_of_mass);
        this._draw_circle(tire_center, 1, 2, "black", ctx);
        this._draw_circle(tire_center, 1, 1.8, "gray", ctx);
        this._draw_circle(tire_center, 1, 1, "lightgray", ctx);
        this._draw_circle(tire_center, 1, 0.8, "black", ctx);

        // const tire_vectors = Immutable.List([[-1, -3], [1, -3], [1, 3], [-1, 3]]).map(p => new Vector2D(p[0], p[1]).rotate(self.tire_angle));
        
        // draw_polygon(tire_vectors.map(v => [x + v.x, y + v.y]).toArray(), "lightgray");
        // draw_polygon(tire_vectors.map(v => [x - v.y, y + v.x]).toArray(), "lightgray");
      }
      
      draw_tire(-12 * this.direction_x, 9.5 * this.direction_y);
      draw_tire(12 * this.direction_x, 9.5 * this.direction_y);
    }

    ctx.restore();
  }
}
