import GameElement from "./game_element";
import GameLevelManager from "./game_level_manager";
import GameLevel1 from "./game_level_1";
import GameLevel2 from "./game_level_2";
import GameLevel3 from "./game_level_3";
import GameLevel4 from "./game_level_4";
import GameLevel5 from "./game_level_5";


export default class GameManager extends GameElement {
  public game_level_managers: Immutable.Map<number, GameLevelManager>;
  public current_game_level_manager_id: number;
  public finished: boolean;

  constructor(initialize: boolean) {
    super(initialize);
  }

  protected initialize() {
    this.game_level_managers = Immutable.Map<number, GameLevelManager>([
      [0, new GameLevelManager(true, new GameLevel1(true))],
      [1, new GameLevelManager(true, new GameLevel2(true))],
      [2, new GameLevelManager(true, new GameLevel3(true))],
      [3, new GameLevelManager(true, new GameLevel4(true))],
      [4, new GameLevelManager(true, new GameLevel5(true))],
    ]);
    this.current_game_level_manager_id = this.game_level_managers.keySeq().min();
  }

  public updated(time_unit: number): GameManager {
    if (this.finished) return this;

    const current_game_level_manager = this.game_level_managers.get(this.current_game_level_manager_id);
    const updated_current_game_level_manager = current_game_level_manager.updated(time_unit);

    if (updated_current_game_level_manager.finished) {
      if (this.current_game_level_manager_id + 1 >= this.game_level_managers.size) {
        return this.copy({ finished: true });
      } else {
        return this.copy({ current_game_level_manager_id: this.current_game_level_manager_id + 1 });
      }
    } else {
      return this.copy({ game_level_managers: this.game_level_managers.set(this.current_game_level_manager_id, updated_current_game_level_manager)});
    }
  }

  public draw(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.fillStyle = "white";
    ctx.font = "14px Arial";
    ctx.fillText("[ UP / DOWN ] Ground movement", 10, 20);    
    ctx.fillText("[ LEFT / RIGHT ] Rotate in the air", 10, 40);    
    ctx.fillText("[ A ] Jump / Dodge", 10, 60);    
    ctx.fillText("[ F ] Nitro", 10, 80);    
    ctx.fillText("[ S ] Flip backwards", 10, 100);    
    ctx.fillText("[ D ] Flip", 10, 120);    
    this.game_level_managers.get(this.current_game_level_manager_id).draw(ctx);
    ctx.restore();
  }
}