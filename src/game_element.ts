import PhysicalObject from './physical_object'
import GameSet from './game_set'

export default class GameElement extends PhysicalObject {
  constructor(initialize: boolean) {
    super(initialize);
  }

  public updated(time_unit: number): GameElement {
    throw new Error('Unsupported method');
  }
}
