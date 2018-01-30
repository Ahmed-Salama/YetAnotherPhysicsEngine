import GameElement from "./game_element";
import Constants from "./constants";
import GameLevel from "./game_level";


export default class GameLevelManager extends GameElement {
  public original_game_level: GameLevel;
  public current_game_level: GameLevel;
  public finished: boolean;

  constructor(initialize: boolean, game_level: GameLevel) {
    super(initialize, game_level);
  }

  protected initialize(game_level: GameLevel) {
    this.current_game_level = game_level;
    this.original_game_level = game_level;
  }

  public updated(time_unit: number): GameLevelManager {
    if (this.finished) return this;

    const updated_game_level = this.current_game_level.updated(time_unit);

    if (updated_game_level.won) {
      return this.copy({ finished: true, current_game_level: updated_game_level });
    }

    if (updated_game_level.lost || Constants.key_pressed.get("reset")) {
      return this.copy({ current_game_level: this.original_game_level });
    }

    return this.copy({ current_game_level: updated_game_level });
  }

  public draw(ctx: CanvasRenderingContext2D) {
    this.current_game_level.draw(ctx);
  }
}