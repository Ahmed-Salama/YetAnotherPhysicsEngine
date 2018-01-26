import Entity from './entity'
import PhysicalLayer from './physical_layer'
import PhysicalObject from './physical_object'
import Vector2D from './vector2d'
import LayerManager from './layer_manager';

export default class Camera extends Entity {
  public attached_object_id: number;
  public original_offset: Vector2D;

  constructor(initialize: boolean) {
    super(initialize);
  }

  public attach(object: PhysicalObject): Camera {
    return this.copy({ original_offset: object.position, attached_object_id: object.id });
  }

  public get_coordinates(layer_manager: LayerManager): Vector2D {
    const attached_object = layer_manager.get_object(this.attached_object_id) as PhysicalObject;
    return attached_object.position.subtract(this.original_offset.multiply(2));
  }
}
