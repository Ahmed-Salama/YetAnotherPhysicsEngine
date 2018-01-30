///<reference path='../node_modules/immutable/dist/immutable.d.ts'/>
import {Collision} from './collision'
import Constants from './constants'
import Vector2D from './vector2d'
import {Intersection, Line} from './line'
import GameElement from './game_element';

const GRAVITY_VECTOR = new Vector2D(0, 9.8);

export default class PhysicalObject extends GameElement {
  public position: Vector2D;
  public velocity: Vector2D;
  public angle: number;
  public angular_velocity: number;
  public mass: number;
  public moment_of_inertia: number;
  public center_of_mass: Vector2D;
  public lines: Immutable.List<Line>;

  constructor(initialize: boolean, ...rest: any[]) {
    super(initialize, ...rest);
  }

  protected initialize(...rest: any[]) {
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
    
    const self = this;
    this.lines = this.lines.map(line => line.copy<Line>({ start_position: line.start_position.subtract(self.center_of_mass), end_position: line.end_position.subtract(self.center_of_mass) })).toList();
    this.position = this.position.add_vector(this.center_of_mass);
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

  public updated_with_collisions(collided_objects: Immutable.List<PhysicalObject>): PhysicalObject {
    throw new Error('Unsupported method');
  }

  public updated_before_collision(time_unit: number, other_objects: Immutable.List<PhysicalObject>): PhysicalObject {
    throw new Error('Unsupported method');
  }

  public calculate_delta(time_unit: number) {
    const time_fraction = time_unit * 1.0 / 1000;
    return {
      position: this.velocity.multiply(time_fraction),
      angle: this.angular_velocity * time_fraction
    };
  }

  public _updated_with_physics(time_unit: number): PhysicalObject {
    const time_fraction = time_unit * 1.0 / 1000;

    const new_velocity = 
      this.velocity
        .add_vector(GRAVITY_VECTOR.multiply(time_fraction));

    const velocity_air_drag_coeff = 0.02;
    const velocity_air_drag_vector = 
      new_velocity
        .normalize()
        .reverse()
        .multiply(
          Math.min(
            Math.abs(new_velocity.length()),
            Math.pow(new_velocity.length(), 2) *
            velocity_air_drag_coeff *
            time_fraction
          ));

    const angular_velocity_air_drag =
      (this.angular_velocity > 0 ? -1 : 1) *
      Math.min(
        Math.abs(this.angular_velocity),
        (this.angular_velocity * this.angular_velocity) *
        2 *
        time_fraction
      );

    return this.copy({
      velocity:
        new_velocity
          .add_vector(velocity_air_drag_vector),
      angular_velocity:
        this.angular_velocity +
        angular_velocity_air_drag
    });
  }

  protected _translate(vector: Vector2D) {
    return this.position.add_vector(vector.rotate(this.angle));
  }

  public _stroke_line(start: Vector2D, end: Vector2D, color: string,
                         ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.beginPath();
    const to_draw_start_position = this._translate(start);
    const to_draw_end_position = this._translate(end);
    ctx.moveTo(to_draw_start_position.x,
               to_draw_start_position.y);
    ctx.lineTo(to_draw_end_position.x,
               to_draw_end_position.y);
    ctx.stroke();
    ctx.restore();
  }

  protected _draw_circle(center: Vector2D, f: number, radius: number, color: string,
                         ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.fillStyle = color;
    let to_draw_center = this._translate(center.multiply(1.0/f));
    ctx.beginPath();
    ctx.arc(to_draw_center.x, to_draw_center.y, radius, 0, 2 * Math.PI);
    ctx.fill();
    ctx.restore();
  }

  public draw(ctx: CanvasRenderingContext2D) {
    ctx.save();
    
    const self = this;
    this.lines.forEach(line => {
      self._stroke_line(line.start_position, line.end_position, "black", ctx);

      // normal vector calculations
      const start_to_end_vector = line.start_position.to(line.end_position);
      const mid_point = start_to_end_vector.normalize().multiply(
          start_to_end_vector.length() / 2);
      const normal_start_position = line.start_position.add_vector(mid_point);
      const normal_end_position = line.start_position
                                      .add_vector(mid_point).add_vector(line.normal);
      self._stroke_line(normal_start_position, normal_end_position, "black",
                        ctx);
    });

    this._draw_circle(Vector2D.empty, 1, 2, "black", ctx);

    const _stroke_line_no_angle = (start: Vector2D, end: Vector2D, color: string) => {
      ctx.save();
      ctx.strokeStyle = color;
      ctx.beginPath();
      const to_draw_start_position = self.position.add_vector(start);
      const to_draw_end_position = self.position.add_vector(end);
      ctx.moveTo(to_draw_start_position.x, to_draw_start_position.y);
      ctx.lineTo(to_draw_end_position.x, to_draw_end_position.y);
      ctx.stroke();
      ctx.restore();
    }
    
    _stroke_line_no_angle(Vector2D.empty, this.velocity, "green");
    _stroke_line_no_angle(Vector2D.empty, new Vector2D(8 * this.angular_velocity, 0), "orange");

    ctx.restore();
  }

  public calculate_collision(other: PhysicalObject) {
    const self = this;
    var done = false;
    const intersection_results = this.lines
      .flatMap(l1 => {
        const projected_l1 = l1.rotate(self.angle).offset(self.position);
        return other.lines
          .flatMap(l2 => {
            const projected_l2 = l2.rotate(other.angle).offset(other.position);
            const intersection_result = projected_l1.is_intersecting(projected_l2);

            if (intersection_result.intersection_exists) {
              return Immutable.Iterable([intersection_result]);
            } else {
              return Immutable.Iterable<Intersection>(null);
            }
          });
      }).toList();

    return new Collision(true, intersection_results);
  }

  public is_colliding(other: PhysicalObject): boolean {
    const self = this;

    return this.lines
      .reduce((is_colliding_s, l1) => {
        const projected_l1 = l1.rotate(self.angle).offset(self.position);
        return is_colliding_s || other.lines
          .reduce((is_colliding_e, l2) => {
            const projected_l2 = l2.rotate(other.angle).offset(other.position);
            const intersection_result = projected_l1.is_intersecting(projected_l2);

            return is_colliding_e || intersection_result.intersection_exists;
          }, false);
      }, false)
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
