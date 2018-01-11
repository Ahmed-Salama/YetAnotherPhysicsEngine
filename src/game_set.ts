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

export default class GameSet extends GameElement {
  public objects: Immutable.Map<number, PhysicalObject>;
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
  }

  public updated(time_unit: number) {
    const all_objects_except_ground = this
                                        .filter_objects(o => !o.is_ground)
                                        .map(o => o.id)
                                        .toList();

    return all_objects_except_ground.reduce(
      (current_game_set, object_id) =>
        current_game_set._updated_per_object(time_unit, object_id),
      this as GameSet
    ); 
  }

  private _updated_per_object(time_unit: number, object_id: number): GameSet {
    const object = this.objects.get(object_id);

    // Calculate updated object
    const next_state = object.updated(time_unit) as PhysicalObject;

    const next_state_reset_translation = next_state.copy<PhysicalObject>({
      position: object.position,
      angle: object.angle
    });

    const next_state_delta_position = next_state.position.subtract(object.position);
    const next_state_delta_angle = next_state.angle - object.angle;

    // Collide object with all remaining objects in the setup
    const all_objects_except_me = this.filter_objects(o => o.id != object.id).map(e => e.id);
    const {reduced_delta_position: after_collision_delta_position,
           reduced_delta_angle: after_collision_delta_angle,
           collided,
           reduced_game_set: after_collision_game_set} = 
           all_objects_except_me.reduce(
            ({reduced_delta_position, reduced_delta_angle, collided, reduced_game_set}, to_collide) => {
              const updated_object = reduced_game_set.objects.get(object.id) as PhysicalObject;
              const updated_to_collide = reduced_game_set.objects.get(to_collide) as PhysicalObject;
              
              const {next_game_set, 
                     next_delta_position, 
                     next_delta_angle, 
                     collision} = reduced_game_set._collide_object_plus_delta_with_another(
                                    updated_object,
                                    reduced_delta_position,
                                    reduced_delta_angle,
                                    updated_to_collide);

              return {reduced_delta_position: next_delta_position,
                      reduced_delta_angle: next_delta_angle,
                      collided: collided || collision.collided(), 
                      reduced_game_set: next_game_set};
            },
            { reduced_delta_position: next_state_delta_position,
              reduced_delta_angle: next_state_delta_angle, 
              collided: false, 
              reduced_game_set: this.replace_element(next_state_reset_translation) });

    const after_collision_object = after_collision_game_set.objects.get(object.id);
    const delta_scale = collided ? 
      after_collision_game_set._is_object_plus_delta_collision_free(after_collision_object, 
                                                                    after_collision_delta_position, 
                                                                    after_collision_delta_angle) :
      1;

    if (delta_scale < 1) console.log(delta_scale);
    const final_delta_position = after_collision_delta_position.multiply(delta_scale);
    const final_delta_angle = after_collision_delta_angle * delta_scale;

    const updated_object_with_delta = after_collision_object
                                        .move(final_delta_position)
                                        .rotate(final_delta_angle);

    const final_game_set = after_collision_game_set.replace_element(updated_object_with_delta);
    return final_game_set;
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
    const contact_force_coeff = 3;
    const o_a_updated = o_a.move(o_a_delta_position).rotate(o_a_delta_angle);

    const collision = o_a_updated.calculate_collision(o_b);
    if (!collision.collided()) {
      return {
        next_game_set: this as GameSet,
        next_delta_position: o_a_delta_position,
        next_delta_angle: o_a_delta_angle,
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
    
        const normal = intersection.other_line.normal(); 
        const r_ap = o_a_updated.position
                      .add_vector(o_a_updated.center_of_mass)
                      .to(intersection_point);

        const v_a1 = o_a_updated.velocity;
        const w_a1 = o_a_updated.angular_velocity;

        const v_ap1 = v_a1.add_vector(r_ap.crossW(w_a1));

        const m_a = o_a_updated.mass;
        const i_a = o_a_updated.moment_of_inertia;

        const impulse = - intersection_weight * (1 + elasticity) * v_ap1.dot(normal) /
                          (1.0/m_a + Math.pow(r_ap.cross(normal), 2)/i_a);

        const new_delta_p = delta_p
                              .rotate(-normal.angle())
                              .mapX(x => x > 0 ? x : -x)
                              .rotate(normal.angle());

        const d_v_a = normal.multiply(impulse / m_a)
        const d_w_a = r_ap.cross(normal.multiply(impulse)) / i_a;

        return collide_rec(delta_v_a.add_vector(d_v_a), delta_w_a + d_w_a, new_delta_p,
                           remaining_intersections.shift());
      }

      const delta = collide_rec(Vector2D.empty, 0, o_a_delta_position, collision.intersections);

      return {
        next_game_set: this.replace_element(o_a.copy({
            velocity: o_a.velocity.add_vector(delta.d_v_a),
            angular_velocity: o_a.angular_velocity + delta.d_w_a
        })),
        next_delta_position: delta.d_p,
        next_delta_angle: 0,
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

        const normal = intersection.self_line.normal();

        const v_a1 = o_a_updated.velocity;
        const v_b1 = o_b.velocity;

        const r_ap = o_a_updated.position
                      .add_vector(o_a_updated.center_of_mass)
                      .to(intersection_point);
        const r_bp = o_b.position
                      .add_vector(o_a_updated.center_of_mass)
                      .to(intersection_point);

        const w_a1 = o_a_updated.angular_velocity;
        const w_b1 = o_b.angular_velocity;

        const v_ap1 = v_a1.add_vector(r_ap.crossW(w_a1));
        const v_bp1 = v_b1.add_vector(r_bp.crossW(w_b1));

        const v_ab1 = v_ap1.subtract(v_bp1);

        const m_a = o_a_updated.mass;
        const m_b = o_b.mass;

        const i_a = o_a_updated.moment_of_inertia;
        const i_b = o_b.moment_of_inertia;

        const impulse = - intersection_weight * (1 + elasticity) * v_ab1.dot(normal) /
                        (1.0/m_a + 1.0/m_b + Math.pow(r_ap.cross(normal), 2)/i_a +
                        Math.pow(r_bp.cross(normal), 2)/i_b);

        const normal_reverse = normal.reverse();
        const new_delta_p = delta_p
                              .rotate(-normal_reverse.angle())
                              .mapX(x => Math.max(0, x))
                              .rotate(normal_reverse.angle());

        // New velocities calculated based on impulse and contact forces
        const contact_velocity_a = normal_reverse
                                     .multiply(intersection_weight)
                                     .multiply(delta_p.length() - new_delta_p.length() + contact_force_coeff * m_b / (m_a + m_b));
        const contact_velocity_b = normal
                                     .multiply(intersection_weight)
                                     .multiply(delta_p.length() - new_delta_p.length() + contact_force_coeff * m_a / (m_a + m_b));

        const d_v_a = normal.multiply(impulse / m_a).add_vector(contact_velocity_a);
        const d_v_b = normal.multiply(-impulse / m_b).add_vector(contact_velocity_b);

        const d_w_a = r_ap.cross(normal.multiply(impulse)) / i_a;
        const d_w_b = -r_bp.cross(normal.multiply(impulse)) / i_b;

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
        next_game_set: this.replace_element(updated_self).replace_element(updated_other),
        next_delta_position: delta.d_p,
        next_delta_angle: 0,
        collision: collision
      };
    }
  }

  public draw(ctx: CanvasRenderingContext2D) {
      const self = this;
      this.objects
        .valueSeq()
        .forEach((o) => o.draw(ctx, self.camera.get_coordinates(self)));
  }

  public replace_element(element: PhysicalObject): GameSet {
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
