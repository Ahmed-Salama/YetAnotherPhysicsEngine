import GameElement from "./game_element";
import LayerManager from "./layer_manager";


export default class GameLevelManager extends GameElement {
  public original_layer_manager: LayerManager;
  public current_layer_manager: LayerManager;
  public finished: boolean;

  constructor(initialize: boolean, layer_manager: LayerManager) {
    super(initialize, layer_manager);
  }

  protected initialize(layer_manager: LayerManager) {
    this.current_layer_manager = layer_manager;
    this.original_layer_manager = layer_manager;
  }

  public updated(time_unit: number): GameLevelManager {
    if (this.finished) return this;

    const updated_layer_manager = this.current_layer_manager.updated(time_unit);

    if (updated_layer_manager.won) {
      return this.copy({ finished: true, current_layer_manager: updated_layer_manager });
    }

    if (updated_layer_manager.lost) {
      return this.copy({ current_layer_manager: this.original_layer_manager });
    }

    return this.copy({ current_layer_manager: updated_layer_manager });
  }

  public draw(ctx: CanvasRenderingContext2D) {
    this.current_layer_manager.draw(ctx);
  }
}