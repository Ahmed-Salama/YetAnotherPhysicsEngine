import Constants from './constants'
import GameSet from './game_set'
import {Line} from './line'
import Vector2D from './vector2d'
import PhysicalObject from './physical_object';
import GameElement from './game_element';
import Pipeline from './pipeline';
import PipelineTransformer from './pipeline_transformer';
import { Collision } from './collision';

export default class Car extends PhysicalObject {
  public static readonly NITRO_STRENGTH = 20;
  public static readonly ROTATION_STRENGTH = 3;
  public static readonly JUMP_STRENGTH = 18;

  public flying_state: string;
  public jump_state: string;
  public jump_timer: number;
  public jump_count: number;
  public nitro_state: string;
  public flip_x_state: string;
  public flip_y_state: string;
  public nitro: Vector2D;
  public jumper: Vector2D;
  public tires: Immutable.List<Vector2D>;
  public direction_x: number;
  public direction_y: number;
  public touching_ground: boolean;

  constructor(initialize: boolean) {
      super(initialize);
  }

  protected _define_attributes() {
    super._define_attributes();
    this.position = new Vector2D(60, 85);
    this.mass = 200;
    this.flying_state = "flying";
    this.jump_state = "station";
    this.jump_timer = 0;
    this.jump_count = 0;
    this.nitro_state = "idle";
    this.flip_x_state = "idle";
    this.flip_y_state = "idle";
    this.direction_x = 1;
    this.direction_y = 1;
    this.name = "car";
    this.touching_ground = false;
  }

  protected _build_lines() {
    super._build_lines();

    const f = 3;
    const points = [[20, 10], [20, 4],
                    [-2, -7], [-20, -10],
                    [-20, 10], [-16, 14], [16, 14]];

    const elasticity = [Constants.general_elasticity, Constants.general_elasticity,
                        Constants.general_elasticity, Constants.general_elasticity,
                        Constants.tire_elasticity, Constants.tire_elasticity,
                        Constants.tire_elasticity];

    for (let i = 0; i < points.length; i++) {
      const j = (i + 1) % points.length;
      const p1 = points[i];
      const p2 = points[j];
      this.lines = this.lines.push(new Line(new Vector2D(p1[0] / f, p1[1] / f),
                                            new Vector2D(p2[0] / f, p2[1] / f),
                                            elasticity[i]));
    }

    this.nitro = new Vector2D(-20 / f, 0);
    this.jumper = new Vector2D(0, 14 / f);
    this.tires = Immutable.List([new Vector2D(-16 / f, 14 / f), new Vector2D(16 / f, 14 / f)]);
  }

  protected _mirrorX(): Car {
    return this.copy({
        lines: this.lines.map(line => line.flipX()).toList(),
        nitro: this.nitro.flipX(),
        jumper: this.jumper.flipX(),
        tires: this.tires.map(tire => tire.flipX()).toList(),
        direction_x: this.direction_x * -1
    });
  }

  protected _mirrorY(): Car {
    return this.copy({
        lines: this.lines.map(line => line.flipY()).toList(),
        nitro: this.nitro.flipY(),
        jumper: this.jumper.flipY(),
        tires: this.tires.map(tire => tire.flipY()).toList(),
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

  private _apply_nitro_input(time_unit: number): Car {
    const after_nitro_input: Car = this.copy({
      nitro_state: Constants.key_pressed.get("up") ? "active" : "idle"
    });

    const is_nitro_active = after_nitro_input.nitro_state == "active";

    const nitro_vector = 
      this.nitro
        .reverse()
        .normalize()
        .multiply(is_nitro_active ? 1 : 0)
        .rotate(this.angle)
        .multiply(Car.NITRO_STRENGTH);

    return after_nitro_input.copy({
        velocity: after_nitro_input.velocity.add_vector(nitro_vector.multiply(time_unit * 1.0 / 1000))
    });
  }

  private _are_tires_touching_ground(grounds: Immutable.List<PhysicalObject>): boolean {
    const TIRE_RADIUS = 3;
    const tire_to_ground_distance = (tire: Vector2D, ground: PhysicalObject): number => {
      const projected_tire = tire.rotate(this.angle).add_vector(this.position);
      return ground.lines.map(line => line.offset(ground.position).rotate(ground.angle).point_distance(projected_tire)).min();
    }
    return this.tires.every(tire => grounds.some(ground => tire_to_ground_distance(tire, ground) < TIRE_RADIUS));
  }

  private _apply_jump_reset(other_objects: Immutable.List<PhysicalObject>): PhysicalObject {
    if (this._are_tires_touching_ground(other_objects.filter(o => o.is_ground).toList())) {
      if (this.jump_timer > 0) {
        return this.copy({ touching_ground: true });
      } else {
        return this.copy({ jump_count: 2, touching_ground: true });
      }
    } else {
      return this.copy({ touching_ground: false });
    }
  }

  private _apply_jump_input(time_unit: number): Car {
    const after_jump_input: Car = Constants.key_pressed.get("A") ?
        (this.jump_state == "station" && this.jump_count > 0 ?
            this.copy({
              flying_state: "flying",
              jump_state: "jumping",
              jump_timer: Constants.jump_timer_duration,
              jump_count: this.jump_count - 1
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
    const car_flying = after_jump_input.flying_state == "flying";

    const jump_vector = 
      this.jumper
        .reverse()
        .normalize()
        .multiply(car_jumping ? 1 : 0)
        .rotate(this.angle)
        .multiply(Car.JUMP_STRENGTH)
        .multiply(1.0 / Math.pow(2, Constants.jump_timer_duration - car_jumping_index + 1));

    return after_jump_input.copy({
        velocity: after_jump_input.velocity.add_vector(jump_vector),
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

  public updated_before_collision(time_unit: number, other_objects: Immutable.List<PhysicalObject>): Car {
    const pipeline = new Pipeline<PhysicalObject>(Immutable.List([
      new PipelineTransformer(this._apply_flip_x_input, []),
      new PipelineTransformer(this._apply_flip_y_input, []),
      new PipelineTransformer(this._apply_nitro_input, [time_unit]),
      new PipelineTransformer(this._apply_jump_reset, [other_objects]),
      new PipelineTransformer(this._apply_jump_input, [time_unit]),
      new PipelineTransformer(this._apply_rotation_input, [time_unit]),
      new PipelineTransformer(this._updated_with_physics, [time_unit])
    ]));

    return pipeline.execute(this) as Car;
  }

  public updated_with_collisions(collided_objects: Immutable.List<PhysicalObject>): Car {
    return this;
  }

  public draw(ctx: CanvasRenderingContext2D, camera_position: Vector2D) {
    const f = 3;
    const self = this;

    ctx.save();
    if (Constants.debugging) {
      ctx.strokeStyle = "red";
      super.draw(ctx, camera_position);

      this._draw_circle(this.nitro, 1, 6, "violet", ctx, camera_position);
      this._draw_circle(this.jumper, 1, 6, this.jump_state == "station" ? "yellow" : "orange", ctx, camera_position);

      this.tires.forEach(tire => self._draw_circle(tire, 1, 2, "red", ctx, camera_position));
    } else {
      const line_to = (x: number, y: number) => {
        const vector = this._camera_translate(new Vector2D(x / f, y / f), camera_position);
        return ctx.lineTo(Constants.drawing_scale * vector.x, Constants.drawing_scale * vector.y);
     }
      const move_to = (x: number, y: number) => {
        const vector = this._camera_translate(new Vector2D(x / f, y / f), camera_position);
        return ctx.moveTo(Constants.drawing_scale * vector.x, Constants.drawing_scale * vector.y);
      }
      const draw_polygon = (points: number[][], color: string) => {

        ctx.fillStyle = color;
        ctx.beginPath();
        move_to(points[0][0] * this.direction_x, points[0][1] * this.direction_y);
        for (var i = 1; i < points.length; i++) {
          line_to(points[i][0] * this.direction_x, points[i][1] * this.direction_y);
        }
        ctx.fill();
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
        this._draw_circle(new Vector2D(x, y), f, 11, "gray", ctx, camera_position);
        this._draw_circle(new Vector2D(x, y), f, 7, "lightgray", ctx, camera_position);
        this._draw_circle(new Vector2D(x, y), f, 5, "black", ctx, camera_position);
      }
      
      draw_tire(-12 * this.direction_x, 8 * this.direction_y);
      draw_tire(12 * this.direction_x, 8 * this.direction_y);
    }

    ctx.restore();
  }
}
