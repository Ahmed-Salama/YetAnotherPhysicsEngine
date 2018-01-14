import Entity from './entity';

export default class GameElement extends Entity {
  constructor(initialize: boolean) {
    super(initialize);
  }

  public updated(time_unit: number): GameElement {
    throw new Error('Unsupported method');
  }
}
