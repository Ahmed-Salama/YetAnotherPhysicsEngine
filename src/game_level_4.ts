import PhysicalLayer from "./physical_layer";
import Car from "./car";
import Ground from "./ground";
import Ball from "./ball";
import Camera from "./camera";
import Vector2D from "./vector2d";
import Goal from "./goal";
import LayerManager from "./layer_manager";
import PhysicalObject from "./physical_object";
import CustomObject from "./custom_object";
import StaticLayer from "./static_layer";

export default class GameLevel4 extends LayerManager {
    protected initialize() {
        super.initialize();

        const my_car = new Car(true);
        const ground_down = new Ground(true, new Vector2D(0, 0), [[0, 400], [200, 400], [200, 90], [0, 90]]);
        const ground_left = new Ground(true, new Vector2D(60, -20), [[0, 60], [10, 60], [10, 0], [0, 0]]);
        const ground_right = new Ground(true, new Vector2D(120, -20), [[0, 60], [10, 60], [10, 0], [0, 0]]);
        const goal = new Goal(true, new Vector2D(90, 0), [[0, 10], [10, 10], [10, 0], [0, 0]]);
        const ball = new Ball(true, new Vector2D(50, 60));

        const physical_layer = new PhysicalLayer(true, Immutable.Map<number, PhysicalObject>([
            [my_car.id, my_car],
            [ground_down.id, ground_down],
            [ground_left.id, ground_left],
            [ground_right.id, ground_right],
            [goal.id, goal],
            [ball.id, ball],
        ]));

        const cloud1 = new CustomObject(true, new Vector2D(40, 60), [[0, 30], [5, 35], [15, 35], [20, 30], [18, 22], [16, 24], [14, 26], [10, 24], [8, 22], [6, 25]], "white");
        const cloud2 = new CustomObject(true, new Vector2D(120, 20), Immutable.List([[0, 30], [5, 35], [15, 35], [20, 30], [16, 22], [14, 22], [12, 24], [6, 22], [4, 22], [2, 25]]).map(p => [p[0] * 2, p[1] * 2]).toArray(), "white");
        const background_layer = new StaticLayer(true, Immutable.Set<PhysicalObject>([
          cloud1,
          cloud2
        ]));

        this.layers = Immutable.Set([background_layer, physical_layer]);

        this.camera = new Camera(true);
        this.camera = this.camera.attach(my_car);
    }
}