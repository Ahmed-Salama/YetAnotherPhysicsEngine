import Camera from './camera'
import GameElement from './game_element'
import PhysicalObject from './physical_object'

export default class Layer extends GameElement {
  public camera: Camera;
  public depth: number;
  public won: boolean;
  public lost: boolean;

  constructor(initialize: boolean, ...rest: any[]) {
    super(initialize, ...rest);
  }

  protected initialize(...rest: any[]) {
    super.initialize(...rest);
  }

  public updated(time_unit: number): Layer {
    return this;
  }

  public get_object(object_id: number): PhysicalObject {
    throw new Error("Unsupported method");
  }

  public draw(ctx: CanvasRenderingContext2D) {
    throw new Error("Unsupported method");
  }
}
