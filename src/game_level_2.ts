import PhysicalLayer from "./physical_layer";
import Car from "./car";
import Ground from "./ground";
import Ball from "./ball";
import Camera from "./camera";
import Vector2D from "./vector2d";
import Obstacle from "./obstacle";
import Goal from "./goal";
import PhysicalObject from "./physical_object";
import CustomObject from "./custom_object";
import StaticLayer from "./static_layer";
import GameLevel from "./game_level";

export default class GameLevel2 extends GameLevel {
    protected initialize() {
        super.initialize();

        this.game_level_name = "2";

        const my_car = new Car(true, new Vector2D(90, 80));
        const ground_down = new Ground(true, new Vector2D(0, 0), [[0, 400], [200, 400], [200, 90], [0, 90]]);
        const obstacle = new Obstacle(true, new Vector2D(140, 80), [[0, 10], [10, 10], [10, 0], [0, 0]]);
        const goal = new Goal(true, new Vector2D(40, 80), [[0, 10], [10, 10], [10, 0], [0, 0]]);
        const ball = new Ball(true, new Vector2D(90, 40));

        const physical_layer = new PhysicalLayer(true, Immutable.Map<number, PhysicalObject>([
            [my_car.id, my_car],
            [ground_down.id, ground_down],
            [obstacle.id, obstacle],
            [goal.id, goal],
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
}