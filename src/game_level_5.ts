import PhysicalSetup from "./physical_setup";
import Car from "./car";
import Ground from "./ground";
import Ball from "./ball";
import Camera from "./camera";
import Vector2D from "./vector2d";
import Obstacle from "./obstacle";
import Goal from "./goal";

export default class GameLevel5 extends PhysicalSetup {
    protected initialize() {
        super.initialize();

        const my_car = new Car(true);
        const ground_down = new Ground(true, new Vector2D(0, 0), [[0, 100], [200, 100], [200, 90], [0, 90]]);
        const goal = new Goal(true, new Vector2D(90, 0), [[0, 10], [10, 10], [10, 0], [0, 0]]);
        const ball = new Ball(true, new Vector2D(50, 60));

        this.objects = Immutable.Map([
            [my_car.id, my_car],
            [ground_down.id, ground_down],
            [goal.id, goal],
            [ball.id, ball],
        ]);

        this.camera = new Camera(true);
        this.camera = this.camera.attach(my_car);
    }
}