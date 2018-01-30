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
import GameLevel from "./game_level";
import Constants from "./constants";
import GameElement from "./game_element";

export default class GameLevelP extends GameLevel {
    protected initialize() {
        super.initialize();

        this.game_level_name = "Warm up";

        const my_car = new Car(true, new Vector2D(60, 80));
        const ground_down = new Ground(true, new Vector2D(0, 0), [[0, 110], [150, 110], [150, 90], [0, 90]]);
        const ground_top = new Ground(true, new Vector2D(0, 0), [[0, 0], [150, 0], [150, -20], [0, -20]]);
        const ground_left = new Ground(true, new Vector2D(0, 0), [[-20, 110], [0, 110], [0, -20], [-20, -20]]);
        const ground_right = new Ground(true, new Vector2D(0, 0), [[150, 110], [170, 110], [170, -20], [150, -20]]);
        const ball = new Ball(true, new Vector2D(80, 40));

        const physical_layer = new PhysicalLayer(true, Immutable.Map<number, PhysicalObject>([
          [my_car.id, my_car],
          [ground_down.id, ground_down],
          [ground_top.id, ground_top],
          [ground_left.id, ground_left],
          [ground_right.id, ground_right],
          [ball.id, ball],
        ]));

        const cloud1 = new CustomObject(true, new Vector2D(0, -40), [[0, 30], [5, 35], [15, 35], [20, 30], [18, 22], [16, 24], [14, 26], [10, 24], [8, 22], [6, 25]], "white");
        const cloud2 = new CustomObject(true, new Vector2D(80, -60), Immutable.List([[0, 30], [5, 35], [15, 35], [20, 30], [16, 22], [14, 22], [12, 24], [6, 22], [4, 22], [2, 25]]).map(p => [p[0] * 2, p[1] * 2]).toArray(), "white");
        const background_layer = new StaticLayer(true, Immutable.Set<PhysicalObject>([
          cloud1,
          cloud2
        ]));

        this.layers = Immutable.Set([background_layer, physical_layer]);

        this.camera = new Camera(true);
        this.camera = this.camera.attach(my_car);
    }

    public draw_level_tracker(ctx: CanvasRenderingContext2D) {
      ctx.save();

      const draw_text = (text: string, x: number, y: number) => {
        ctx.fillText(text, x, y);
        ctx.strokeText(text, x, y);
      }

      ctx.font = "bold 30px verdana";
      ctx.fillStyle = "white";
      ctx.strokeStyle = "black";
      draw_text("LEVEL", 1200/2 - 40, 30);
      ctx.font = "bold 24px verdana";
      draw_text(this.game_level_name, 1200/2 - 50, 60);

      ctx.font = "bold 20px verdana";
      draw_text("Press [ W ] to start the game!", 1200/2 - 150, 110);
      ctx.restore();
    }

    public updated(time_unit: number): GameLevel {
      const updated_game_level = super.updated(time_unit) as GameLevel;

      if (Constants.key_pressed.get("start")) {
        return updated_game_level.copy({ won: true });
      } else {
        return updated_game_level;
      }
    }
}