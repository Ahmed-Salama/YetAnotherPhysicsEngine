import PhysicalObject from './physical_object'
import GameSet from './game_set'

export default class GameElement extends PhysicalObject {
  constructor(initialize: boolean) {
    super(initialize);
  }

  public update_game_set(time_unit: number, game_set: GameSet): GameSet {
    throw new Error('Unsupported method');
  }
}
