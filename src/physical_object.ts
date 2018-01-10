///<reference path='../node_modules/immutable/dist/immutable.d.ts'/>
import {Collision, CollisionResult} from './collision'
import Constants from './constants'
import Entity from './entity'
import GameSet from './game_set'
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

  public collide(delta_position: Vector2D, delta_angle: number, other: PhysicalObject,
                 game_set: GameSet): CollisionResult {
    const advanced_self = this.move(delta_position).rotate(delta_angle);

    const collision = advanced_self.calculate_collision(other);
    if (!collision.collided()) {
      return {
        game_set: game_set,
        delta_position: delta_position,
        delta_angle: delta_angle
      };
    }

    // Impulse-based collision handling.
    // Reference: https://www.myphysicslab.com/engine2D/collision-en.html#collision_physics
    const impulse_weight = 1.0 / collision.intersections.size;

    if (other.is_ground) {
      const collide_rec = (delta_v_a: Vector2D, delta_w_a: number, delta_p: Vector2D,
                           remaining_intersections: Immutable.List<Intersection>): any => {
        if (remaining_intersections.size == 0) {
          return {
            d_v_a: delta_v_a,
            d_w_a: delta_w_a,
            d_p: delta_p,
          };
        }

        const intersection = remaining_intersections.first();
        const intersection_point = intersection.intersection_point;

        const elasticity =
            (intersection.self_line.elasticity + intersection.other_line.elasticity) / 2;
    
        const normal = intersection.other_line.normal(); 
        const r_ap = advanced_self.position.add_vector(advanced_self.center_of_mass)
                                           .to(intersection_point);

        const v_a1 = advanced_self.velocity;
        const w_a1 = advanced_self.angular_velocity;

        const v_ap1 = v_a1.add_vector(r_ap.crossW(w_a1));

        const m_a = advanced_self.mass;
        const i_a = advanced_self.moment_of_inertia;

        const impulse = - impulse_weight * (1 + elasticity) * v_ap1.dot(normal) /
            (1.0/m_a + Math.pow(r_ap.cross(normal), 2)/i_a);

        const d_v_a = normal.multiply(impulse / m_a);
        if (Constants.debugging) {
          console.log(v_a1.toString() + ": " + impulse_weight + " w " + d_v_a.toString());
        }
        const d_w_a = r_ap.cross(normal.multiply(impulse)) / i_a;

        const new_delta_p = delta_p.rotate(-normal.angle()).resetX().rotate(normal.angle());

        return collide_rec(delta_v_a.add_vector(d_v_a), delta_w_a + d_w_a, new_delta_p,
                           remaining_intersections.shift());
      }

      const delta = collide_rec(Vector2D.empty, 0, delta_position, collision.intersections);
      const still_colliding = this.move(delta.d_p).calculate_collision(other).collided();
      if (Constants.debugging) {
        console.log("reflect " + delta.d_v_a.toString() + " - " +
                    this.velocity.add_vector(delta.d_v_a).toString());
      }

      return {
        game_set: game_set.replace_element(this.copy({
            velocity: this.velocity.add_vector(delta.d_v_a),
            angular_velocity: this.angular_velocity + delta.d_w_a
        })),
        delta_position: still_colliding ? Vector2D.empty : delta.d_p,
        delta_angle: 0
      };
    } else {
      const collide_rec = (delta_v_a: Vector2D, delta_w_a: number, delta_v_b: Vector2D,
                           delta_w_b: number, delta_p: Vector2D,
                           remaining_intersections: Immutable.List<Intersection>): any => {
        if (remaining_intersections.size == 0) {
          return {
            d_v_a: delta_v_a,
            d_w_a: delta_w_a,
            d_v_b: delta_v_b,
            d_w_b: delta_w_b,
            d_p: delta_p
          };
        }

        const intersection = remaining_intersections.first();
        const intersection_point = intersection.intersection_point;

        const elasticity =
            (intersection.self_line.elasticity + intersection.other_line.elasticity) / 2;

        const normal = intersection.self_line.normal();

        const v_a1 = advanced_self.velocity;
        const v_b1 = other.velocity;

        const r_ap = advanced_self.position.add_vector(advanced_self.center_of_mass)
                                           .to(intersection_point);
        const r_bp = other.position.add_vector(advanced_self.center_of_mass)
                                   .to(intersection_point);

        const w_a1 = advanced_self.angular_velocity;
        const w_b1 = other.angular_velocity;

        const v_ap1 = v_a1.add_vector(r_ap.crossW(w_a1));
        const v_bp1 = v_b1.add_vector(r_bp.crossW(w_b1));

        const v_ab1 = v_ap1.subtract(v_bp1);

        const m_a = advanced_self.mass;
        const m_b = other.mass;

        const i_a = advanced_self.moment_of_inertia;
        const i_b = other.moment_of_inertia;

        const impulse = - impulse_weight * (1 + elasticity) * v_ab1.dot(normal) /
            (1.0/m_a + 1.0/m_b + Math.pow(r_ap.cross(normal), 2)/i_a +
            Math.pow(r_bp.cross(normal), 2)/i_b);

        // alert("Self: " + advanced_self.position +
            // "\nOther: " + other.position + 
            // "\nIntersection: " + intersection_point + 
            // "\nImpulse: " + impulse +
            // "\nVelocity: " + v_ab1.dot(normal) +
            // "\nTerm: " + (1.0/m_a + 1.0/m_b));

        const d_v_a = normal.multiply(impulse / m_a);
        const d_v_b = normal.multiply(-impulse / m_b);

        const d_w_a = r_ap.cross(normal.multiply(impulse)) / i_a;
        const d_w_b = -r_bp.cross(normal.multiply(impulse)) / i_b;

        const new_delta_p = delta_p.rotate(-normal.angle()).resetX().rotate(normal.angle());

        return collide_rec(delta_v_a.add_vector(d_v_a), delta_w_a + d_w_a,
                           delta_v_b.add_vector(d_v_b), delta_w_b + d_w_b, new_delta_p,
                           remaining_intersections.shift());
      }

      const delta = collide_rec(Vector2D.empty, 0, Vector2D.empty, 0, delta_position,
                                collision.intersections);

      const updated_self = this.copy<PhysicalObject>({
          velocity: this.velocity.add_vector(delta.d_v_a),
          angular_velocity: this.angular_velocity + delta.d_w_a
      });
      const updated_other = other.copy<PhysicalObject>({
          velocity: other.velocity.add_vector(delta.d_v_b),
          angular_velocity: other.angular_velocity + delta.d_w_b
      });
      const still_colliding = this.move(delta.d_p).calculate_collision(other).collided();

      return {"game_set": game_set.replace_element(updated_self).replace_element(updated_other),
              "delta_position": still_colliding ? Vector2D.empty : delta.d_p,
              "delta_angle": 0};
    }
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
