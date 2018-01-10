import Ball from './ball'
import Camera from './camera'
import Car from './car'
import Entity from './entity'
import GameElement from './game_element'
import Ground from './ground'
import PhysicalObject from './physical_object'
import Vector2D from './vector2d';

export default class GameSet extends Entity {
  public contents: Immutable.Map<number, Entity>;
  public camera: Camera;

  constructor(initialize: boolean) {
    super(initialize);
  }

  protected initialize() {
    super.initialize();

    const my_car = new Car(true);
    const ground = new Ground(true);
    const ball = new Ball(true);

    this.contents = Immutable.Map([
        [my_car.id, my_car],
        [ground.id, ground],
        [ball.id, ball],
    ]);

    this.camera = new Camera(true);
    this.camera = this.camera.attach(my_car);
  }

  public updated(time_unit: number) {
    const all_objects_except_ground = 
        this.contents
            .entrySeq()
            .filter(([k, v]) => !v.is_ground)
            .map(([k, v]) => k)
            .toList();

    return all_objects_except_ground.reduce(
      (current_game_set, object_id) => current_game_set._updated_per_object(time_unit, current_game_set.contents.get(object_id) as GameElement),
      this as GameSet
    ); 
  }

  private _updated_per_object(time_unit: number, object: GameElement): GameSet {
    const next_state = object.updated(time_unit);
    const next_state_resetted_translation = next_state.copy({ position: object.position, angle: object.angle });

    const delta_position = next_state.position.subtract(object.position);
    const delta_angle = next_state.angle - object.angle;

    class DeltaState {
      public position: Vector2D;
      public angle: number;
      public game_set: GameSet;
      constructor(position: Vector2D, angle: number, game_set: GameSet) {
        this.position = position;
        this.angle = angle;
        this.game_set = game_set;
      }
    };

    const all_objects_except_me = this.get_objects_except(object).map(e => e.id);

    const final_delta = all_objects_except_me.reduce(
      (delta, to_collide) => {
        const updated_self = delta.game_set.contents.get(object.id) as PhysicalObject;
        const updated_to_collide = delta.game_set.contents.get(to_collide) as PhysicalObject;
        
        const collision_result = updated_self.collide(
          delta.position,
          delta.angle,
          updated_to_collide,
          delta.game_set);

        const new_game_set = collision_result.game_set as GameSet;
        const new_delta_position = collision_result.delta_position;
        const new_delta_angle = collision_result.delta_angle;

        return new DeltaState(new_delta_position, new_delta_angle, new_game_set);
      },
      new DeltaState(delta_position, delta_angle, this.replace_element(next_state_resetted_translation)));
    
      const updated_self = final_delta.game_set.contents.get(object.id) as PhysicalObject;
      const updated_self_with_delta = updated_self.move(final_delta.position).rotate(final_delta.angle);
      const must_reset = final_delta.game_set.get_objects_except(object).some(other =>
          updated_self_with_delta.calculate_collision(other as PhysicalObject).collided());
      
      return must_reset ? final_delta.game_set : final_delta.game_set.replace_element(updated_self_with_delta);
  }

  public draw(ctx: CanvasRenderingContext2D) {
      const self = this;
      this.contents
        .valueSeq()
        .forEach((o: GameElement) => o.draw(ctx, self.camera.get_coordinates(self)));
  }

  public replace_element(element: Entity): GameSet {
    //   const physical = element as PhysicalObject;
      // assert_not(physical.lines.some(line => {let d = line.rotate(physical.angle).offset(physical.position); return d.start_position.y > 100 || d.end_position.y > 100;}), "object overlap bottom ground");
      return this.copy({ contents: this.contents.set(element.id, element) });
  }

  public get_objects_except(element: Entity): Immutable.List<Entity> {
      return this.contents
        .entrySeq()
        .filter(([k, v]) => k != element.id)
        .map(([k, v]) => v)
        .toList();
  } 
}
