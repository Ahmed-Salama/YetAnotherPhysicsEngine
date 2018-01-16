import Ball from './ball';
import Car from './car'
import Ground from './ground';
import PhysicalObject from './physical_object';
import Vector2D from './vector2d';
import {Level} from './level'

export default class Game {

  private _levels: Level[] = [];
  private _currentLevelIdx = 0;

  constructor() {
    const car = new Car(true);
    car.position = new Vector2D(60, 85);
    const ground = new Ground(true);
    const ball = new Ball(true);
    ball.position = new Vector2D(80, 50);
    const objects = Immutable.Map<number, PhysicalObject>([
      [car.id, car],
      [ground.id, ground],
      [ball.id, ball],
    ]);

    const winConditions = new Map([
      [
        car.id, [
          (object: PhysicalObject) => object.position.x > 100 && object.position.x < 120,
        ]
      ]
    ]);

    // For now, hard code the levels here, we can later
    // read them from a levels.config file.
    const level1 = new Level(objects, car, winConditions);
    this._levels.push(level1);
  }

  public updated(time_unit: number) {
    return this._levels[this._currentLevelIdx].updated(time_unit);
  }

  public draw(ctx: CanvasRenderingContext2D) {
    return this._levels[this._currentLevelIdx].draw(ctx);
  }
}
