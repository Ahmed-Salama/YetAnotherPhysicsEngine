import Ball from './ball'
import Camera from './camera'
import Car from './car'
import Entity from './entity'
import GameElement from './game_element'
import Ground from './ground'
import PhysicalObject from './physical_object'

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
    const updatedRec = (game_set: GameSet, remaining: Immutable.List<number>): GameSet => {
      if (remaining.size == 0)
          return game_set;

      const first_key = remaining.first();
      const first_object = game_set.contents.get(first_key) as GameElement;

      const new_game_set = first_object.update_game_set(time_unit, game_set) as GameSet;
      return updatedRec(new_game_set, remaining.shift());
    }

    const updated_game_set = updatedRec(this,
        this.contents.entrySeq().filter(([k, v]) => !v.is_ground).map(([k, v]) => k).toList());

    return updated_game_set;
  }
  public draw(ctx: CanvasRenderingContext2D) {
      const self = this;
      this.contents.valueSeq().forEach((o: GameElement) =>
          o.draw(ctx, self.camera.get_coordinates(self)));
  }
  public replace_element(element: Entity): GameSet {
      const physical = element as PhysicalObject;
      // assert_not(physical.lines.some(line => {let d = line.rotate(physical.angle).offset(physical.position); return d.start_position.y > 100 || d.end_position.y > 100;}), "object overlap bottom ground");
      return this.copy({ contents: this.contents.set(element.id, element) });
  }
  public get_objects_except(element: Entity): Immutable.List<Entity> {
      return this.contents.entrySeq().filter(([k, v]) =>
          k != element.id).map(([k, v]) => v).toList();
  } 
}
