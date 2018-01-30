import GameElement from "./game_element";
import GameLevelManager from "./game_level_manager";
import GameLevel1 from "./game_level_1";
import GameLevel2 from "./game_level_2";
import GameLevel3 from "./game_level_3";
import GameLevel4 from "./game_level_4";
import GameLevel5 from "./game_level_5";
import GameLevel2s0 from "./game_level_2_0";
import Constants from "./constants";


export default class GameManager extends GameElement {
  public game_level_managers: Immutable.Map<number, GameLevelManager>;
  public current_game_level_manager_id: number;
  public max_game_level_id: number;
  public finished: boolean;
  public time_elapsed: number;

  constructor(initialize: boolean) {
    super(initialize);
    this.time_elapsed = 0;
  }

  protected initialize() {
    this.game_level_managers = Immutable.Map<number, GameLevelManager>([
      [1, new GameLevelManager(true, new GameLevel1(true))],
      [2, new GameLevelManager(true, new GameLevel2s0(true))],
      [3, new GameLevelManager(true, new GameLevel3(true))],
      [4, new GameLevelManager(true, new GameLevel2(true))],
      [5, new GameLevelManager(true, new GameLevel4(true))],
      [6, new GameLevelManager(true, new GameLevel5(true))],
    ]);
    this.current_game_level_manager_id = this.game_level_managers.keySeq().min();
    this.max_game_level_id = this.game_level_managers.keySeq().max();
  }

  public updated(time_unit: number): GameManager {
    if (this.finished) return this;

    const new_time_elapsed = this.time_elapsed + time_unit;

    const current_game_level_manager = this.game_level_managers.get(this.current_game_level_manager_id);
    const updated_current_game_level_manager = current_game_level_manager.updated(time_unit);

    if (updated_current_game_level_manager.finished) {
      if (this.current_game_level_manager_id + 1 > this.max_game_level_id) {
        return this.copy({ finished: true, time_elapsed: new_time_elapsed });
      } else {
        return this.copy({ current_game_level_manager_id: this.current_game_level_manager_id + 1, time_elapsed: new_time_elapsed });
      }
    } else {
      return this.copy({ game_level_managers: this.game_level_managers.set(this.current_game_level_manager_id, updated_current_game_level_manager), time_elapsed: new_time_elapsed });
    }
  }

  public draw(ctx: CanvasRenderingContext2D) {
    ctx.save();
    this.game_level_managers.get(this.current_game_level_manager_id).draw(ctx);

    const draw_text = (text: string, x: number, y: number) => {
      ctx.fillText(text, x, y);
      ctx.strokeText(text, x, y);
    }

    ctx.fillStyle = "white";
    ctx.font = "bold 14px verdana";
    ctx.fillText("CAR CONTROLS: ", 10, 20);    
    ctx.font = "14px verdana";
    ctx.fillText("[ UP / DOWN ] Ground movement", 10, 40);    
    ctx.fillText("[ LEFT / RIGHT ] Rotate in the air", 10, 60);    
    ctx.fillText("[ D ] Jump / Dodge", 10, 80);    
    ctx.fillText("[ F ] Nitro", 10, 100);    
    ctx.fillText("[ V ] Flip backwards", 10, 120);    
    ctx.fillText("[ C ] Flip", 10, 140);

    ctx.font = "bold 14px verdana";
    ctx.fillText("LEVEL CONTROLS: ", 10, 170);    
    ctx.font = "14px verdana";
    ctx.fillText("[ Q ] Reset level", 10, 190);

    ctx.font = "bold 20px verdana";
    ctx.fillText("Time elapsed: " + (this.time_elapsed / 1000 / Constants.time_scale).toFixed(2), 10, 230);

    ctx.font = "bold 30px verdana";
    ctx.fillStyle = "white";
    ctx.strokeStyle = "black";
    draw_text("LEVEL", 1200/2 - 40, 30);
    draw_text(this.current_game_level_manager_id + "", 1200/2, 60);
    ctx.restore();
  }
}