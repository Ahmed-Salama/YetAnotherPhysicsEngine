import Entity from './entity'
import GameSet from './game_set'
import PhysicalObject from './physical_object'
import Vector2D from './vector2d'

export default class Camera extends Entity {
  public attached_object_id: number;

  constructor(initialize: boolean) {
    super(initialize);
  }

  public attach(object: PhysicalObject): Camera {
    return this.copy({attached_object_id: object.id});
  }

  public get_coordinates(game_set: GameSet): Vector2D {
    const attached_object = game_set.objects.get(this.attached_object_id) as PhysicalObject;
    return attached_object.position;
  }
}
