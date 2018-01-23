import PhysicalSetup from "./physical_setup";
import Car from "./car";
import Ground from "./ground";
import Ball from "./ball";
import Camera from "./camera";
import Vector2D from "./vector2d";

export default class GameLevel3 extends PhysicalSetup {
    protected initialize() {
        super.initialize();

        const my_car = new Car(true);
        // const ground_top = new Ground(true, [[0, 20], [200, 20], [200, 10], [0, 10]]);
        // const ground_down = new Ground(true, [[0, 100], [200, 100], [200, 90], [0, 90]]);
        // const ground_left = new Ground(true, [[0, 100], [10, 100], [10, 10], [0, 10]]);
        // const ground_right = new Ground(true, [[200, 100], [200, 10], [190, 10], [190, 100]]);
        const ball = new Ball(true, new Vector2D(60, 40));

        this.objects = Immutable.Map([
            [my_car.id, my_car],
            // [ground_top.id, ground_top],
            // [ground_down.id, ground_down],
            // [ground_left.id, ground_left],
            // [ground_right.id, ground_right],
            [ball.id, ball],
        ]);

        this.camera = new Camera(true);
        this.camera = this.camera.attach(my_car);
    }
}