import PhysicalSetup from './physical_setup'
import Entity from './entity';

export default class GameElement extends Entity {
  constructor(initialize: boolean, ...rest: any[]) {
    super(initialize, ...rest);
  }

  public updated(time_unit: number): GameElement {
    throw new Error('Unsupported method');
  }
}
