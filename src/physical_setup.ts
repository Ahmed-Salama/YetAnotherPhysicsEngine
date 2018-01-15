import Ball from './ball'
import Camera from './camera'
import Car from './car'
import Entity from './entity'
import GameElement from './game_element'
import Ground from './ground'
import PhysicalObject from './physical_object'
import Vector2D from './vector2d';
import {Collision, CollisionResult} from './collision'
import {Intersection, Line} from './line'
import Constants from './constants'

export default class PhysicalSetup extends GameElement {
  public objects: Immutable.Map<number, PhysicalObject>;
  public frame_calculations: Immutable.List<number>;
  public camera: Camera;

  constructor(initialize: boolean) {
    super(initialize);
  }

  protected initialize() {
    super.initialize();

    const my_car = new Car(true);
    const ground = new Ground(true);
    const ball = new Ball(true);

    this.objects = Immutable.Map([
        [my_car.id, my_car],
        [ground.id, ground],
        [ball.id, ball],
    ]);

    this.camera = new Camera(true);
    this.camera = this.camera.attach(my_car);

    this.frame_calculations = Immutable.List();
  }

  public updated(time_unit: number) {
    const start_time = performance.now();
    const all_objects_except_ground = this
                                        .filter_objects(o => !o.is_ground)
                                        .map(o => o.id)
                                        .toList();

    // Update every physical object
    const final_game_set_1 = all_objects_except_ground.reduce(
      (reduced_physical_setup, object_id) => {
        const object = reduced_physical_setup.objects.get(object_id);
        const next_state = object.updated_before_collision(time_unit, reduced_physical_setup.filter_objects(o => o.id != object.id).toList()) as PhysicalObject;
        return reduced_physical_setup.replace_element(next_state);
      },
      this as PhysicalSetup
    ); 

    const final_game_set = all_objects_except_ground.reduce(
      (reduced_physical_setup, object_id) =>
        reduced_physical_setup._updated_per_object(time_unit, object_id),
      final_game_set_1 as PhysicalSetup
    ); 
    const end_time = performance.now();

    var current_frame_calculations = this.frame_calculations.push(end_time - start_time);
    if (this.frame_calculations.size > 60) {
      current_frame_calculations = current_frame_calculations.shift();
    }

    return final_game_set.copy({ frame_calculations: current_frame_calculations}) as GameElement;
  }

  private _updated_per_object(time_unit: number, object_id: number): PhysicalSetup {
    const rec = (current_physical_setup: PhysicalSetup, iterations: number): PhysicalSetup => {
      if (iterations == 0) {
        // alert("Error");
        return current_physical_setup;
      }

      const object = current_physical_setup.objects.get(object_id);
      const delta = object.calculate_delta(time_unit);

      const next_state_delta_position = delta.position;
      const next_state_delta_angle = delta.angle;

      // Collide object with all remaining objects in the setup
      const all_objects_except_me = current_physical_setup.filter_objects(o => o.id != object.id).map(e => e.id);
      const {
            collided_objects,
            reduced_physical_setup: after_collision_physical_setup} = 
            all_objects_except_me.reduce(
              ({collided_objects, reduced_physical_setup}, to_collide) => {
                const updated_object = reduced_physical_setup.objects.get(object.id) as PhysicalObject;
                const updated_to_collide = reduced_physical_setup.objects.get(to_collide) as PhysicalObject;
                
                const {next_physical_setup,
                      collision} = reduced_physical_setup._collide_object_plus_delta_with_another(
                                      updated_object,
                                      delta.position,
                                      delta.angle,
                                      updated_to_collide);

                return {
                        collided_objects: collision.collided() ? collided_objects.push(updated_to_collide) : collided_objects, 
                        reduced_physical_setup: next_physical_setup};
              },
              { collided_objects: Immutable.List<PhysicalObject>(), 
                reduced_physical_setup: current_physical_setup });

      const after_collision_object = after_collision_physical_setup.objects.get(object.id);
      const next_state_after_collision_object = after_collision_object.updated_with_collisions(collided_objects) as PhysicalObject;

      const finished = collided_objects.size == 0;
      const delta_scale = finished ? 1 : 0;

      const final_delta = next_state_after_collision_object.calculate_delta(time_unit);
      const final_delta_position = final_delta.position.multiply(delta_scale);
      const final_delta_angle = final_delta.angle * delta_scale;

      const updated_object_with_delta = next_state_after_collision_object
                                          .move(final_delta_position)
                                          .rotate(final_delta_angle);

      if (finished) return after_collision_physical_setup.replace_element(updated_object_with_delta);
      else return rec(after_collision_physical_setup.replace_element(after_collision_object), iterations - 1);
    }

    return rec(this, 30);

    // const delta_scale = collided_objects.size > 0 ? 
    //   after_collision_physical_setup._is_object_plus_delta_collision_free(next_state_after_collision_object, 
    //                                                                 after_collision_delta_position, 
    //                                                                 after_collision_delta_angle) :
    //   1;
    // const delta_scale = 1;

    // if (delta_scale < 1) console.log(delta_scale);
    // const final_delta_position = after_collision_delta_position.multiply(delta_scale);
    // const final_delta_angle = after_collision_delta_angle * delta_scale;

    // const updated_object_with_delta = next_state_after_collision_object
    //                                     .move(final_delta_position)
    //                                     .rotate(final_delta_angle);

    // const final_physical_setup = after_collision_physical_setup.replace_element(updated_object_with_delta);
    // return final_physical_setup;
  }

  private _is_object_plus_delta_collision_free(object: PhysicalObject, delta_p: Vector2D, delta_a: number) {
    const object_with_delta_p = object.move(delta_p);
    const object_with_delta_a = object.rotate(delta_a);

    const intersects = this
      .filter_objects(o => o.id != object.id)
      .some(other => 
        object_with_delta_p.calculate_collision(other).collided() ||
        object_with_delta_a.calculate_collision(other).collided());

    return intersects ? 0 : 1;
  }

  public _collide_object_plus_delta_with_another(o_a: PhysicalObject, o_a_delta_position: Vector2D, o_a_delta_angle: number, o_b: PhysicalObject) {
    const canvas = document.getElementById("canvas") as HTMLCanvasElement;
    const ctx = canvas.getContext("2d");

    const contact_force_coeff = 0.2;
    const o_a_updated = o_a.move(o_a_delta_position).rotate(o_a_delta_angle);

    const collision = o_a_updated.calculate_collision(o_b);
    if (!collision.collided()) {
      return {
        next_physical_setup: this as PhysicalSetup,
        collision: collision
      };
    }

    // Impulse-based collision handling.
    // Reference: https://www.myphysicslab.com/engine2D/collision-en.html#collision_physics
    const intersection_weight = 1.0 / collision.intersections.size;

    if (o_b.is_ground) {
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
    
        // const old_intersection_point = intersection_point.subtract(o_a_updated.position).rotate(-o_a_updated.angle).rotate(o_a.angle).add_vector(o_a.position);
        // const normal = intersection_point.to(old_intersection_point);
        const normal = intersection.other_line.normal;
        
        const r_ap = o_a_updated.center_of_mass
                      .rotate(o_a_updated.angle)
                      .add_vector(o_a_updated.position)
                      .to(intersection_point);

        const v_a1 = o_a_updated.velocity;
        const w_a1 = o_a_updated.angular_velocity;

        const v_ap1 = v_a1.add_vector(r_ap.crossW_inverted(w_a1));

        const m_a = o_a_updated.mass;
        const i_a = o_a_updated.moment_of_inertia;

        const impulse = - intersection_weight * (1 + elasticity) * v_ap1.dot(normal) /
                          (1.0/m_a + Math.pow(r_ap.cross(normal), 2)/i_a);

        const new_delta_p = delta_p
                              .rotate(-normal.angle())
                              .mapX(x => x > 0 ? x : -x)
                              .rotate(normal.angle());


        const contact_velocity_a = normal
        .multiply(intersection_weight)
        .multiply(contact_force_coeff);
        const d_v_a = normal.multiply(impulse / m_a)//.add_vector(contact_velocity_a);
        const d_w_a = r_ap.cross(normal.multiply(impulse)) / i_a;

        return collide_rec(delta_v_a.add_vector(d_v_a), delta_w_a + d_w_a, new_delta_p,
                           remaining_intersections.shift());
      }

      const delta = collide_rec(Vector2D.empty, 0, o_a_delta_position, collision.intersections);

      return {
        next_physical_setup: this.replace_element(o_a.copy({
            velocity: o_a.velocity.add_vector(delta.d_v_a),
            angular_velocity: o_a.angular_velocity + delta.d_w_a
        })),
        collision: collision
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

        const v_a1 = o_a_updated.velocity;
        const v_b1 = o_b.velocity;

        const c_a = o_a.position;
        const r_ap = c_a.to(intersection_point);

        const c_b = o_b.position;
        const r_bp = c_b.to(intersection_point);

        // const old_intersection_point = intersection_point.subtract(o_a_updated.position).rotate(-o_a_updated.angle).rotate(o_a.angle).add_vector(o_a.position);
        // const normal = intersection_point.to(old_intersection_point).normalize();
        const normal = intersection.self_line.normal;
        // const normal = intersection.other_line.normal;
        // const normal = c_b.to(c_a).normalize();

        const w_a1 = o_a_updated.angular_velocity;
        const w_b1 = o_b.angular_velocity;

        const v_ap1 = v_a1.add_vector(r_ap.crossW_inverted(w_a1));
        const v_bp1 = v_b1.add_vector(r_bp.crossW_inverted(w_b1));

        const v_ab1 = v_ap1.subtract(v_bp1);

        const m_a = o_a_updated.mass;
        const m_b = o_b.mass;

        const i_a = o_a_updated.moment_of_inertia;
        const i_b = o_b.moment_of_inertia;

        const impulse = intersection_weight * (1 + elasticity) * v_ab1.dot(normal) /
                        (1.0/m_a + 1.0/m_b + Math.pow(r_ap.cross(normal), 2)/i_a + Math.pow(r_bp.cross(normal), 2)/i_b);
        // alert(impulse);

        const contact_normal = c_a.to(c_b).normalize();
        const new_delta_p = delta_p
                              .rotate(-normal.angle())
                              // .mapX(x => Math.max(0, x))
                              .resetX()
                              .rotate(normal.angle());

        // New velocities calculated based on impulse and contact forces
        const contact_velocity = contact_normal
                                     .multiply(intersection_weight)
                                     .multiply(contact_force_coeff);

        const stroke = (start: Vector2D, end: Vector2D, color: string) => {
          ctx.save();
          ctx.strokeStyle = color;
          ctx.beginPath();
          const to_draw_start_position = start;
          const to_draw_end_position = end;
          ctx.moveTo(Constants.drawing_scale * to_draw_start_position.x,
                    Constants.drawing_scale * to_draw_start_position.y);
          ctx.lineTo(Constants.drawing_scale * to_draw_end_position.x,
                    Constants.drawing_scale * to_draw_end_position.y);
          ctx.stroke();
          ctx.restore();
        }
        // stroke(c_a, c_a.add_vector(contact_velocity.multiply(100)), "red");
        // stroke(c_b, c_b.add_vector(contact_velocity.reverse().multiply(100)), "red");

        const d_v_a = normal.multiply(-impulse / m_a).add_vector(contact_velocity.reverse());
        const d_v_b = normal.multiply(impulse / m_b).add_vector(contact_velocity);

        const d_w_a = r_ap.cross(normal.multiply(-impulse)) / i_a;
        const d_w_b = r_bp.cross(normal.multiply(impulse)) / i_b;

        return collide_rec(delta_v_a.add_vector(d_v_a), delta_w_a + d_w_a,
                           delta_v_b.add_vector(d_v_b), delta_w_b + d_w_b,
                           new_delta_p,
                           remaining_intersections.shift());
      }

      const delta = collide_rec(Vector2D.empty, 0, Vector2D.empty, 0, o_a_delta_position,
                                collision.intersections);

      const updated_self = o_a.copy<PhysicalObject>({
          velocity: o_a.velocity.add_vector(delta.d_v_a),
          angular_velocity: o_a.angular_velocity + delta.d_w_a
      });
      const updated_other = o_b.copy<PhysicalObject>({
          velocity: o_b.velocity.add_vector(delta.d_v_b),
          angular_velocity: o_b.angular_velocity + delta.d_w_b
      });

      return {
        next_physical_setup: this.replace_element(updated_self).replace_element(updated_other),
        collision: collision
      };
    }
  }

  public draw(ctx: CanvasRenderingContext2D) {
    const self = this;
    this.objects
        .valueSeq()
        .forEach((o) => o.draw(ctx, self.camera.get_coordinates(self)));

    const average_frame_duration = this.frame_calculations.reduce((s, x) => s + x, 0) / this.frame_calculations.size;
    ctx.strokeText(average_frame_duration.toPrecision(1), 10, 10);    
  }

  public replace_element(element: PhysicalObject): PhysicalSetup {
    return this.copy({ objects: this.objects.set(element.id, element) });
  }

  public filter_objects(predicate: (_: PhysicalObject) => boolean): Immutable.List<PhysicalObject> {
    return this.objects
            .entrySeq()
            .filter(([k, v]) => predicate(v))
            .map(([k, v]) => v)
            .toList();
  } 
}
