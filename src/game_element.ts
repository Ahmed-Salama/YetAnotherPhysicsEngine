import Entity from './entity';

export default class GameElement extends Entity {
  constructor(initialize: boolean, ...rest: any[]) {
    super(initialize, ...rest);
  }

  public updated(time_unit: number): GameElement {
    throw new Error('Unsupported method');
  }

  public draw(ctx: CanvasRenderingContext2D) {
    throw new Error('Unsupported method');
  }
}
