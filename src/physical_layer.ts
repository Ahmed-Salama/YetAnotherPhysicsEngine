import Ball from './ball'
import Car from './car'
import Ground from './ground'
import PhysicalObject from './physical_object'
import {Collision} from './collision'
import Utils from './utils';
import Pipeline from './pipeline';
import PipelineTransformer from './pipeline_transformer';
import Constants from './constants';
import Layer from './layer';
import Obstacle from './obstacle';
import Goal from './goal';
import { Intersection } from './line';
import Vector2D from './vector2d';

export default class PhysicalLayer extends Layer {
  public objects: Immutable.Map<number, PhysicalObject>;
  public frame_calculations: Immutable.List<number>;

  constructor(initialize: boolean, objects: Immutable.Map<number, PhysicalObject>) {
    super(initialize, objects);
  }

  protected initialize(objects: Immutable.Map<number, PhysicalObject>) {
    super.initialize();
    this.objects = objects;
    this.frame_calculations = Immutable.List();
    this.depth = 1;
  }

  public updated(time_unit: number): PhysicalLayer {
    const start_time = performance.now();

    const pipeline = new Pipeline<PhysicalLayer>(Immutable.List([
      new PipelineTransformer(this._updated_before_collision, [time_unit]),
      new PipelineTransformer(this._resolve_collisions, [time_unit]),
      new PipelineTransformer(this._check_if_finished, []),
      new PipelineTransformer(this._finish_frame_render_time_calculations, [start_time]),
    ]));

    return pipeline.execute(this);
  }

  private _check_if_finished(): PhysicalLayer {
    const cars_or_balls_cars_below_sea_level =
      this.filter_objects(o => o instanceof Car || o instanceof Ball).some(car => car.position.y > 110);

    const obstacles_hit =
      this.filter_objects(o => o instanceof Obstacle).map(o => o as Obstacle).some(o => o.hit);

    const goals_hit =
      this.filter_objects(o => o instanceof Goal).map(o => o as Goal).some(o => o.hit);

    if (goals_hit) {
      return this.copy({ won: true });
    }

    const bad_hit = cars_or_balls_cars_below_sea_level || obstacles_hit;

    if (bad_hit) {
        return this.copy({ lost: true });
    }
    
    return this;
  }

  private _updated_before_collision(time_unit: number): PhysicalLayer {
    return this._get_all_objects_except_ground().reduce(
      (reduced_physical_setup, object_id) => {
        const object = reduced_physical_setup.objects.get(object_id);
        const next_state = object.updated_before_collision(time_unit, reduced_physical_setup.filter_objects(o => o.id != object.id).toList()) as PhysicalObject;
        return reduced_physical_setup.replace_element(next_state);
      },
      this as PhysicalLayer
    ); 
  }

  private _resolve_collisions(time_unit: number): PhysicalLayer {
    return this._get_all_objects_except_ground().reduce(
      (reduced_physical_setup, object_id) =>
        reduced_physical_setup._resolve_collisions_per_object(time_unit, object_id),
      this as PhysicalLayer
    ); 
  }

  private _finish_frame_render_time_calculations(start_time: number): PhysicalLayer {
    const end_time = performance.now();

    var current_frame_calculations = this.frame_calculations.push(end_time - start_time);
    if (this.frame_calculations.size > 60) {
      current_frame_calculations = current_frame_calculations.shift();
    }

    return this.copy({ frame_calculations: current_frame_calculations});
  }

  private _resolve_collisions_per_object(time_unit: number, object_id: number): PhysicalLayer {
      const all_objects_except_me = this.filter_objects(o => o.id != object_id).map(e => e.id);
      const { collided_objects_ids,
              reduced_physical_setup: after_collision_physical_setup } = 
                all_objects_except_me.reduce(
                  ({collided_objects_ids, reduced_physical_setup}, to_collide_object_id) => {
                    const { next_physical_setup,
                            collision } =
                              reduced_physical_setup._collide_object_with_another(
                                object_id,
                                to_collide_object_id,
                                time_unit);

                    return { collided_objects_ids: collision.collided() ? 
                              collided_objects_ids.push(to_collide_object_id) :
                              collided_objects_ids, 
                             reduced_physical_setup: next_physical_setup};
                  },
                  { collided_objects_ids: Immutable.List<number>(), 
                    reduced_physical_setup: this as PhysicalLayer });

      const collided_objects = collided_objects_ids.map(id => after_collision_physical_setup.objects.get(id)).toList();

      const object_after_collision = after_collision_physical_setup.objects.get(object_id);
      const object_after_collision_state_update = object_after_collision.updated_with_collisions(collided_objects);

      const physical_setup_after_collision_state_updates = collided_objects.reduce((r_ps, o) => r_ps.replace_element(o.updated_with_collisions(Immutable.List([object_after_collision_state_update]))), after_collision_physical_setup);

      // This is the place where object delta (in position and angle) is committed.
      const delta = object_after_collision_state_update.calculate_delta(time_unit);
      const updated_object_with_delta = object_after_collision_state_update
                                          .move(delta.position)
                                          .rotate(delta.angle);

      return physical_setup_after_collision_state_updates.replace_element(updated_object_with_delta);
  }

  public _collide_object_with_another(o_a_id: number, o_b_id: number, time_unit: number) {
    const collision = this._calculate_collisions(o_a_id, o_b_id, time_unit);
    if (!collision.collided()) {
      return {
        next_physical_setup: this as PhysicalLayer,
        collision: collision
      };
    }

    // Impulse-based collision handling.
    // Reference: https://www.myphysicslab.com/engine2D/collision-en.html#collision_physics
    const construct_collision_pipeline = () => {
      const o_b = this.objects.get(o_b_id);
      if (o_b instanceof Ground) {
        return new Pipeline<PhysicalLayer>(Immutable.List([
          new PipelineTransformer(this._apply_ground_impulse_velocity, [o_a_id, o_b_id, collision, time_unit]),
          new PipelineTransformer(this._apply_ground_contact_velocity, [o_a_id, o_b_id, collision, time_unit]),
        ]));
      } else {
        return new Pipeline<PhysicalLayer>(Immutable.List([
          new PipelineTransformer(this._apply_impulse_velocity, [o_a_id, o_b_id, collision, time_unit]),
          new PipelineTransformer(this._apply_contact_velocity, [o_a_id, o_b_id, time_unit]),
        ]));
      }
    }

    return {
      next_physical_setup: construct_collision_pipeline().execute(this),
      collision: collision
    };
  }

  public _apply_impulse_velocity(o_a_id: number, o_b_id: number, collision: Collision, time_unit: number): PhysicalLayer {
    const o_a = this.objects.get(o_a_id);
    const o_b = this.objects.get(o_b_id);
    
    const intersection = collision.intersections.first();
    const intersection_point = intersection.intersection_point;

    const elasticity = Math.min(intersection.self_line.elasticity, intersection.other_line.elasticity);

    const v_a1 = o_a.velocity;
    const v_b1 = o_b.velocity;

    const c_a = o_a.position;
    const r_ap = c_a.to(intersection_point);

    const c_b = o_b.position;
    const r_bp = c_b.to(intersection_point);

    const normal = collision.use_self_lines_normal ? intersection.self_line.normal.reverse() : intersection.other_line.normal;

    const w_a1 = o_a.angular_velocity;
    const w_b1 = o_b.angular_velocity;

    const v_ap1 = v_a1.add_vector(r_ap.crossW_inverted(w_a1));
    const v_bp1 = v_b1.add_vector(r_bp.crossW_inverted(w_b1));

    const v_ab1 = v_ap1.subtract(v_bp1);

    const m_a = o_a.mass;
    const m_b = o_b.mass;

    const i_a = o_a.moment_of_inertia;
    const i_b = o_b.moment_of_inertia;

    const impulse = (1 + elasticity) * v_ab1.dot(normal) /
                    (1.0/m_a + 1.0/m_b + Math.pow(r_ap.cross(normal), 2)/i_a + Math.pow(r_bp.cross(normal), 2)/i_b);

    const a_impulse_velocity = normal.multiply(-impulse / m_a)
    const b_impulse_velocity = normal.multiply(impulse / m_b)

    const a_impulse_angular_velocity = r_ap.cross(normal.multiply(-impulse)) / i_a;
    const b_impulse_angular_velocity = r_bp.cross(normal.multiply(impulse)) / i_b;

    const o_a_updated_with_impulse_velocity = o_a.copy<PhysicalObject>({
        velocity: o_a.velocity.add_vector(a_impulse_velocity),
        angular_velocity: o_a.angular_velocity + a_impulse_angular_velocity
    });
    const o_b_updated_with_impulse_velocity = o_b.copy<PhysicalObject>({
        velocity: o_b.velocity.add_vector(b_impulse_velocity),
        angular_velocity: o_b.angular_velocity + b_impulse_angular_velocity
    });

    const after_impulse_physical_setup = 
      this
        .replace_element(o_a_updated_with_impulse_velocity)
        .replace_element(o_b_updated_with_impulse_velocity);

    return after_impulse_physical_setup;
  }

  // private _calculate_contact_multiplier(o_a: PhysicalObject, o_b: PhysicalObject, )

  public _apply_ground_impulse_velocity(o_a_id: number, ground_id: number, collision: Collision, time_unit: number): PhysicalLayer {
    const o_a = this.objects.get(o_a_id);
    const ground = this.objects.get(ground_id);
    
    const m_a = o_a.mass;
    const i_a = o_a.moment_of_inertia;
    const c_a = o_a.position;

    const calculate_contact_multiplier = (intersection: Intersection, normal: Vector2D) => {
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

      const multiplier = Utils.binary_search_yn(0, 50, Constants.binary_search_iterations, can);
      return multiplier;
    };

    const chosen_path = collision.intersections
      .flatMap(intersection => { return Immutable.List([{ intersection: intersection, normal: intersection.self_line.normal.reverse() }, { intersection: intersection, normal: intersection.other_line.normal }])})
      .map(({intersection, normal}) => { return { multiplier: calculate_contact_multiplier(intersection, normal), intersection: intersection, normal: normal } })
      .minBy(g => g.multiplier);
    const intersection = chosen_path.intersection;
    const intersection_point = intersection.intersection_point;
    const elasticity = Math.min(intersection.self_line.elasticity, intersection.other_line.elasticity);
    const normal = chosen_path.normal;
    const r_ap = c_a.to(intersection_point);
    const v_a1 = o_a.velocity;
    const w_a1 = o_a.angular_velocity;

    const v_ap1 = v_a1.add_vector(r_ap.crossW_inverted(w_a1));

    const impulse = (1 + elasticity) * v_ap1.dot(normal) / (1.0/m_a + Math.pow(r_ap.cross(normal), 2)/i_a);

    const impulse_velocity = normal.multiply(-impulse / m_a);
    const impulse_angular_velocity = r_ap.cross(normal.multiply(-impulse)) / i_a;

    const o_a_updated_with_impulse_velocity = o_a.copy<PhysicalObject>({
        velocity: o_a.velocity.add_vector(impulse_velocity),
        angular_velocity: o_a.angular_velocity + impulse_angular_velocity
    });

    const after_impulse_physical_setup = this.replace_element(o_a_updated_with_impulse_velocity);
    return after_impulse_physical_setup;
  }

  public _apply_ground_contact_velocity(o_a_id: number, ground_id: number, collision: Collision, time_unit: number) {
    const o_a = this.objects.get(o_a_id);
    const ground = this.objects.get(ground_id);

    const calculate_contact_multiplier = (intersection: Intersection, normal: Vector2D) => {
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

      const multiplier = Utils.binary_search_yn(0, 50, Constants.binary_search_iterations, can);
      return multiplier;
    };

    const chosen_path = collision.intersections
      .flatMap(intersection => { return Immutable.List([{ intersection: intersection, normal: intersection.self_line.normal.reverse() }, { intersection: intersection, normal: intersection.other_line.normal }])})
      .map(({intersection, normal}) => { return { multiplier: calculate_contact_multiplier(intersection, normal), intersection: intersection, normal: normal } })
      .minBy(g => g.multiplier);
    const intersection = chosen_path.intersection;
    const multiplier = chosen_path.multiplier;
    // console.log(multiplier);

    const normal = chosen_path.normal;
    const contact_velocity = normal;
    const amplifier = 1;

    const o_a_updated = o_a.copy<PhysicalObject>({ velocity: o_a.velocity.add_vector(contact_velocity.multiply(multiplier * amplifier) )});

    return this.replace_element(o_a_updated);
  }

  public _apply_contact_velocity(o_a_id: number, o_b_id: number, time_unit: number) {
    const o_a = this.objects.get(o_a_id);
    const o_b = this.objects.get(o_b_id);

    const m_a = o_a.mass;
    const m_b = o_b.mass;
    
    const c_a = o_a.position;
    const c_b = o_b.position;

    const contact_normal = c_a.to(c_b).normalize();

    const contact_velocity_a = contact_normal.reverse().multiply(m_b / (m_a + m_b));
    const contact_velocity_b = contact_normal.multiply(m_a / (m_a + m_b));

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

    const multiplier = Utils.binary_search_yn(0, 50, Constants.binary_search_iterations, can);
    const amplifier = 1.6;
    const o_a_updated = o_a.copy<PhysicalObject>({ velocity: o_a.velocity.add_vector(contact_velocity_a.multiply(multiplier * amplifier) )});
    const o_b_updated = o_b.copy<PhysicalObject>({ velocity: o_b.velocity.add_vector(contact_velocity_b.multiply(multiplier * amplifier) )});

    return this.replace_element(o_a_updated).replace_element(o_b_updated);
  }

  public draw(ctx: CanvasRenderingContext2D) {
    ctx.save();

    // const average_frame_duration = this.frame_calculations.reduce((s, x) => s + x, 0) / this.frame_calculations.size;
    // ctx.strokeText(average_frame_duration.toPrecision(1), 10, 10);    

    this.objects
        .valueSeq()
        .forEach((o) => o.draw(ctx));

    ctx.restore();
  }

  public replace_element(element: PhysicalObject): PhysicalLayer {
    return this.copy({ objects: this.objects.set(element.id, element) });
  }

  public get_object(object_id: number): PhysicalObject {
    return this.objects.get(object_id);
  }

  public filter_objects(predicate: (_: PhysicalObject) => boolean): Immutable.List<PhysicalObject> {
    return this.objects
               .entrySeq()
               .filter(([_, v]) => predicate(v))
               .map(([_, v]) => v)
               .toList();
  } 

  private _get_all_objects_except_ground() {
    return this.filter_objects(o => !(o instanceof Ground))
               .map(o => o.id)
               .toList();
  }

  private _calculate_collisions(o_a_id: number, o_b_id: number, time_unit: number): Collision {
    const o_a = this.objects.get(o_a_id);
    const o_b = this.objects.get(o_b_id);

    const o_a_delta = o_a.calculate_delta(time_unit);
    const o_b_delta = o_b.calculate_delta(time_unit);

    const o_a_translated = o_a.move(o_a_delta.position).rotate(o_a_delta.angle);
    const o_b_translated = o_b.move(o_b_delta.position).rotate(o_b_delta.angle);

    return o_a_translated.calculate_collision(o_b_translated);
  }
}
