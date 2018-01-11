///<reference path='../node_modules/immutable/dist/immutable.d.ts'/>
import {Collision, CollisionResult} from './collision'
import Constants from './constants'
import Entity from './entity'
import Vector2D from './vector2d'
import {Intersection, Line} from './line'
import GameElement from './game_element';

const gravity_vector = new Vector2D(0, 9.8);

export default class PhysicalObject extends GameElement {
  public position: Vector2D;
  public velocity: Vector2D;
  public angle: number;
  public angular_velocity: number;
  public mass: number;
  public moment_of_inertia: number;
  public center_of_mass: Vector2D;
  public is_ground: boolean;
  public lines: Immutable.List<Line>;


  constructor(initialize: boolean) {
    super(initialize);
  }

  protected initialize() {
    this._define_attributes();
    this._build_lines();
    
    const contribution_ratio = 1.0 / (2 * this.lines.size);
    this.moment_of_inertia = 
      this.mass *
      this.lines
        .reduce(
          (acc, line) =>
            acc +
            contribution_ratio *
              (Math.pow(line.start_position.length(), 2) +
               Math.pow(line.end_position.length(), 2)),
          0);

    this.center_of_mass = 
      this.lines
        .reduce(
          (com, line) =>
            com
              .add_vector(line.start_position.multiply(contribution_ratio))
              .add_vector(line.end_position.multiply(contribution_ratio)),
          Vector2D.empty);
  }

  protected _define_attributes() {
    this.position = new Vector2D(0, 0);
    this.velocity = new Vector2D(0, 0);
    this.angle = 0;
    this.angular_velocity = 0;
    this.mass = 1;
  }

  protected _build_lines() {
    this.lines = Immutable.List();
  }

  public _updated_physics(time_unit: number): PhysicalObject {
    const time_fraction = time_unit * 1.0 / 1000;

    const new_velocity = 
      this.velocity
        .add_vector(gravity_vector.multiply(time_fraction));

    const velocity_air_drag_coeff = 0.02;
    const velocity_air_drag_vector = 
      new_velocity
        .normalize()
        .reverse()
        .multiply(
          Math.pow(new_velocity.length(), 2) *
          velocity_air_drag_coeff *
          time_fraction);

    const angular_velocity_air_drag =
      (this.angular_velocity > 0 ? -1 : 1) *
      Math.pow(this.angular_velocity, 2) *
      0.74;

    return this.copy({
      position:
        this.position
          .add_vector(this.velocity.multiply(time_fraction)),
      velocity:
        new_velocity
          .add_vector(velocity_air_drag_vector),
      angle:
        this.angle +
        this.angular_velocity * time_fraction,
      angular_velocity:
        this.angular_velocity +
        angular_velocity_air_drag * time_fraction
    });
  }

  protected _translate(vector: Vector2D) {
    return this.position.add_vector(vector.rotate(this.angle));
  }

  protected _camera_translate(vector: Vector2D, camera_position: Vector2D): Vector2D {
    const after_position_and_rotation = this._translate(vector);
    return after_position_and_rotation.add_vector(
          new Vector2D(
            - camera_position.x +
            Constants.canvas_size / (2 * Constants.drawing_scale),
            0));
  }

  protected _stroke_line(start: Vector2D, end: Vector2D, color: string,
                         ctx: CanvasRenderingContext2D, camera_position: Vector2D) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.beginPath();
    const to_draw_start_position = this._camera_translate(start, camera_position);
    const to_draw_end_position = this._camera_translate(end, camera_position);
    ctx.moveTo(Constants.drawing_scale * to_draw_start_position.x,
               Constants.drawing_scale * to_draw_start_position.y);
    ctx.lineTo(Constants.drawing_scale * to_draw_end_position.x,
               Constants.drawing_scale * to_draw_end_position.y);
    ctx.stroke();
    ctx.restore();
  }

  protected _draw_circle(center: Vector2D, f: number, radius: number, color: string,
                         ctx: CanvasRenderingContext2D, camera_position: Vector2D) {
    ctx.save();
    ctx.fillStyle = color;
    let to_draw_center = this._camera_translate(center.multiply(1.0/f), camera_position);
    ctx.beginPath();
    ctx.arc(Constants.drawing_scale * to_draw_center.x, Constants.drawing_scale *
            to_draw_center.y, radius, 0, 2 * Math.PI);
    ctx.fill();
    ctx.restore();
  }

  public draw(ctx: CanvasRenderingContext2D, camera_position: Vector2D) {
    ctx.save();
    
    const self = this;
    this.lines.forEach(line => {
        self._stroke_line(line.start_position, line.end_position, "black", ctx, camera_position);

        // normal vector calculations
        const start_to_end_vector = line.start_position.to(line.end_position);
        const mid_point = start_to_end_vector.normalize().multiply(
            start_to_end_vector.length() / 2);
        const normal_start_position = line.start_position.add_vector(mid_point);
        const normal_end_position = line.start_position
                                        .add_vector(mid_point).add_vector(line.normal());
        self._stroke_line(normal_start_position, normal_end_position, "black",
                          ctx, camera_position);
    });

    if (!this.is_ground) {
      this._draw_circle(this.center_of_mass, 1, 2, "black", ctx, camera_position);
    }

    this._stroke_line(Vector2D.empty, this.velocity, "green", ctx, camera_position);
    this._stroke_line(Vector2D.empty, new Vector2D(8 * this.angular_velocity, 0),
                      "orange", ctx, camera_position);

    ctx.restore();
  }

  public calculate_collision(other: PhysicalObject) {
    const self = this;
    var intersection_results = this.lines
      .flatMap(l1 => {
        const projected_l1 = l1.rotate(self.angle).offset(self.position);
        return other.lines
          .map(l2 => {
            const projected_l2 = l2.rotate(other.angle).offset(other.position);
            return projected_l1.is_intersecting(projected_l2);
          });
      });

    return new Collision(
      intersection_results
        .filter(x => x.intersection_exists)
        .toList());
  }

  public move(vector: Vector2D): PhysicalObject {
    return this.copy({ position: this.position.add_vector(vector) });
  }

  public rotate(delta_angle: number): PhysicalObject {
    return this.copy({ angle: this.angle + delta_angle });
  }

  public toString() {
    return this.lines.map(line =>
        line.rotate(this.angle).offset(this.position).toString()).join("\n");
  }
}
