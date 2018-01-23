import Entity from './entity'
import PhysicalSetup from './physical_setup'
import PhysicalObject from './physical_object'
import Vector2D from './vector2d'

export default class Camera extends Entity {
  public attached_object_id: number;
  public original_offset: Vector2D;

  constructor(initialize: boolean) {
    super(initialize);
  }

  public attach(object: PhysicalObject): Camera {
    return this.copy({ original_offset: object.position, attached_object_id: object.id });
  }

  public get_coordinates(physical_setup: PhysicalSetup): Vector2D {
    const attached_object = physical_setup.objects.get(this.attached_object_id) as PhysicalObject;
    return attached_object.position.subtract(this.original_offset.multiply(2));
  }
}
