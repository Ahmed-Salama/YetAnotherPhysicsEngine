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
                                      updated_to_collide,
                                      time_unit);

                return {
                        collided_objects: collision.collided() ? collided_objects.push(updated_to_collide) : collided_objects, 
                        reduced_physical_setup: next_physical_setup};
              },
              { collided_objects: Immutable.List<PhysicalObject>(), 
                reduced_physical_setup: current_physical_setup });

      const after_collision_object = after_collision_physical_setup.objects.get(object.id);
      const next_state_after_collision_object = after_collision_object.updated_with_collisions(collided_objects) as PhysicalObject;

      const finished = collided_objects.size == 0;
      const delta_scale = 1;

      const final_delta = next_state_after_collision_object.calculate_delta(time_unit);
      const final_delta_position = final_delta.position.multiply(delta_scale);
      const final_delta_angle = final_delta.angle * delta_scale;

      const updated_object_with_delta = next_state_after_collision_object
                                          .move(final_delta_position)
                                          .rotate(final_delta_angle);

      return after_collision_physical_setup.replace_element(updated_object_with_delta);
    }

    return rec(this, 1);

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

  public _collide_object_plus_delta_with_another(o_a: PhysicalObject, o_b: PhysicalObject, time_unit: number) {
    const canvas = document.getElementById("canvas") as HTMLCanvasElement;
    const ctx = canvas.getContext("2d");

    const o_a_delta = o_a.calculate_delta(time_unit);
    const o_b_delta = o_b.calculate_delta(time_unit);

    const o_a_updated = o_a.move(o_a_delta.position).rotate(o_a_delta.angle);
    const o_b_updated = o_b.move(o_b_delta.position).rotate(o_b_delta.angle);

    const collision = o_a_updated.calculate_collision(o_b_updated);
    if (!collision.collided()) {
      return {
        next_physical_setup: this as PhysicalSetup,
        collision: collision
      };
    }

    // Impulse-based collision handling.
    // Reference: https://www.myphysicslab.com/engine2D/collision-en.html#collision_physics
    const first_intersection = collision.intersections.first();

    if (o_b.is_ground) {
        const intersection = first_intersection;
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

        const impulse = - (1 + elasticity) * v_ap1.dot(normal) /
                          (1.0/m_a + Math.pow(r_ap.cross(normal), 2)/i_a);

        const d_v_a = normal.multiply(impulse / m_a);
        const d_w_a = r_ap.cross(normal.multiply(impulse)) / i_a;
        const updated_self = o_a.copy<PhysicalObject>({
            velocity: o_a.velocity.add_vector(d_v_a),
            angular_velocity: o_a.angular_velocity + d_w_a
        });
      const after_impulse_physical_setup = this.replace_element(updated_self);
      const after_contact_physical_setup = after_impulse_physical_setup.binary_search_ground_contact_velocity(o_a.id, normal, o_b.id, time_unit);
      return {
        next_physical_setup: after_contact_physical_setup,
        collision: collision
      };
    } else {
        const intersection = first_intersection;
        const intersection_point = intersection.intersection_point;

        const elasticity =
            (intersection.self_line.elasticity + intersection.other_line.elasticity) / 2;

        const v_a1 = o_a_updated.velocity;
        const v_b1 = o_b.velocity;

        const c_a = o_a.position;
        const r_ap = c_a.to(intersection_point);

        const c_b = o_b.position;
        const r_bp = c_b.to(intersection_point);

        const normal = intersection.other_line.normal;

        const w_a1 = o_a_updated.angular_velocity;
        const w_b1 = o_b.angular_velocity;

        const v_ap1 = v_a1.add_vector(r_ap.crossW_inverted(w_a1));
        const v_bp1 = v_b1.add_vector(r_bp.crossW_inverted(w_b1));

        const v_ab1 = v_ap1.subtract(v_bp1);

        const m_a = o_a_updated.mass;
        const m_b = o_b.mass;

        const i_a = o_a_updated.moment_of_inertia;
        const i_b = o_b.moment_of_inertia;

        const impulse = (1 + elasticity) * v_ab1.dot(normal) /
                        (1.0/m_a + 1.0/m_b + Math.pow(r_ap.cross(normal), 2)/i_a + Math.pow(r_bp.cross(normal), 2)/i_b);

        const d_v_a = normal.multiply(-impulse / m_a)
        const d_v_b = normal.multiply(impulse / m_b)

        const d_w_a = r_ap.cross(normal.multiply(-impulse)) / i_a;
        const d_w_b = r_bp.cross(normal.multiply(impulse)) / i_b;


      const updated_self = o_a.copy<PhysicalObject>({
          velocity: o_a.velocity.add_vector(d_v_a),
          angular_velocity: o_a.angular_velocity + d_w_a
      });
      const updated_other = o_b.copy<PhysicalObject>({
          velocity: o_b.velocity.add_vector(d_v_b),
          angular_velocity: o_b.angular_velocity + d_w_b
      });

      const after_impulse_physical_setup = this.replace_element(updated_self).replace_element(updated_other);
      const after_contact_physical_setup = after_impulse_physical_setup.binary_search_contact_velocity(o_a.id, o_b.id, time_unit);

      return {
        next_physical_setup:after_contact_physical_setup,
        collision: collision
      };
    }
  }

  public binary_search_ground_contact_velocity(o_a_id: number, normal: Vector2D, ground_id: number, time_unit: number) {
    const o_a = this.objects.get(o_a_id);
    const ground = this.objects.get(ground_id);
    const m_a = o_a.mass;
    const c_a = o_a.position;

    const contact_velocity = normal;

    const can = (v: number) => {
      const o_a_v = o_a.velocity.add_vector(contact_velocity.multiply(v));

      const time_fraction = time_unit * 1.0 / 1000;
      const o_a_delta_position = o_a_v.multiply(time_fraction);
      const o_a_delta_angle = o_a.angular_velocity * time_fraction;

      const o_a_translated = o_a.move(o_a_delta_position).rotate(o_a_delta_angle);

      if (o_a_translated.calculate_collision(ground).collided()) return false;
      else return true;
    }

    const binary_search = (lo: number, hi: number, iterations: number): number => {
      if (iterations == 0) return hi;

      const md = (lo + hi) / 2;

      if (can(md)) return binary_search(lo, md, iterations - 1);
      else return binary_search(md, hi, iterations - 1);
    }

    const multiplier = binary_search(0, 10, 5);
    const amplifier = 2;
    const o_a_updated = o_a.copy<PhysicalObject>({ velocity: o_a.velocity.add_vector(contact_velocity.multiply(multiplier * amplifier) )});

    return this.replace_element(o_a_updated);
  }

  public binary_search_contact_velocity(o_a_id: number, o_b_id: number, time_unit: number) {
    const o_a = this.objects.get(o_a_id);
    const o_b = this.objects.get(o_b_id);

    const m_a = o_a.mass;
    const m_b = o_b.mass;
    
    const c_a = o_a.position;
    const c_b = o_b.position;

    const contact_normal = c_a.to(c_b).normalize();

    const contact_velocity_a = contact_normal.reverse()
                                 .multiply(m_b / (m_a + m_b));
    const contact_velocity_b = contact_normal
                                 .multiply(m_a / (m_a + m_b));

    const can = (v: number) => {
      const o_a_v = o_a.velocity.add_vector(contact_velocity_a.multiply(v));
      const o_b_v = o_b.velocity.add_vector(contact_velocity_b.multiply(v));

      const time_fraction = time_unit * 1.0 / 1000;
      const o_a_delta_position = o_a_v.multiply(time_fraction);
      const o_b_delta_position = o_b_v.multiply(time_fraction);

      const o_a_delta_angle = o_a.angular_velocity * time_fraction;
      const o_b_delta_angle = o_b.angular_velocity * time_fraction;

      const o_a_translated = o_a.move(o_a_delta_position).rotate(o_a_delta_angle);
      const o_b_translated = o_b.move(o_b_delta_position).rotate(o_b_delta_angle);

      if (o_a_translated.calculate_collision(o_b_translated).collided()) return false;
      else return true;
    }

    const binary_search = (lo: number, hi: number, iterations: number): number => {
      if (iterations == 0) return hi;

      const md = (lo + hi) / 2;

      if (can(md)) return binary_search(lo, md, iterations - 1);
      else return binary_search(md, hi, iterations - 1);
    }

    const multiplier = binary_search(0, 10, 5);
    const amplifier = 2;
    const o_a_updated = o_a.copy<PhysicalObject>({ velocity: o_a.velocity.add_vector(contact_velocity_a.multiply(multiplier * amplifier) )});
    const o_b_updated = o_b.copy<PhysicalObject>({ velocity: o_b.velocity.add_vector(contact_velocity_b.multiply(multiplier * amplifier) )});

    return this.replace_element(o_a_updated).replace_element(o_b_updated);
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
