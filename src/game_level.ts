import PhysicalLayer from "./physical_layer";
import Car from "./car";
import Ground from "./ground";
import Ball from "./ball";
import Camera from "./camera";
import Vector2D from "./vector2d";
import Goal from "./goal";
import LayerManager from "./layer_manager";
import PhysicalObject from "./physical_object";
import StaticLayer from "./static_layer";
import CustomObject from "./custom_object";
import Constants from "./constants";

export default class GameLevel extends LayerManager {
    public game_level_name: string;

    public draw(ctx: CanvasRenderingContext2D) {
      super.draw(ctx);
      this.draw_level_tracker(ctx);
    }

    protected draw_level_tracker(ctx: CanvasRenderingContext2D) {
      ctx.save();

      const draw_text = (text: string, x: number, y: number) => {
        ctx.fillText(text, x, y);
        ctx.strokeText(text, x, y);
      }

      ctx.font = "bold 30px verdana";
      ctx.fillStyle = "white";
      ctx.strokeStyle = "black";
      draw_text("LEVEL", Constants.canvas_width/2 - 40, 30);
      ctx.font = "bold 24px verdana";
      draw_text(this.game_level_name, Constants.canvas_width/2, 60);

      ctx.restore();
    }
}