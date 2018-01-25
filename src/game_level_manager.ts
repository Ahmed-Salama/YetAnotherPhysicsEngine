import GameElement from "./game_element";
import PhysicalSetup from "./physical_setup";
import Car from "./car";
import Constants from "./constants";
import Obstacle from "./obstacle";
import Goal from "./goal";
import Ball from "./ball";


export default class GameLevelManager extends GameElement {
  public original_physical_setup: PhysicalSetup;
  public current_physical_setup: PhysicalSetup;
  public finished: boolean;

  constructor(initialize: boolean, physical_setup: PhysicalSetup) {
    super(initialize, physical_setup);
  }

  protected initialize(physical_setup: PhysicalSetup) {
    this.current_physical_setup = physical_setup;
    this.original_physical_setup = physical_setup;
  }

  public updated(time_unit: number): GameLevelManager {
    if (this.finished) return this;

    const updated_physical_setup = this.current_physical_setup.updated(time_unit);

    const cars_or_balls_cars_below_sea_level = 
      updated_physical_setup.filter_objects(o => o instanceof Car || o instanceof Ball).some(car => car.position.y > 110);
    
    const obstacles_hit =
      updated_physical_setup.filter_objects(o => o instanceof Obstacle).map(o => o as Obstacle).some(o => o.hit);
    
    const goals_hit =
      updated_physical_setup.filter_objects(o => o instanceof Goal).map(o => o as Goal).some(o => o.hit);

    if (goals_hit) {
      return this.copy({ finished: true });
    }

    const hit = cars_or_balls_cars_below_sea_level ||
      obstacles_hit;
    
    if (hit) {
        return this.copy({ current_physical_setup: this.original_physical_setup });
    } else {
        return this.copy({ current_physical_setup: updated_physical_setup }); 
    }
  }

  public draw(ctx: CanvasRenderingContext2D) {
    this.current_physical_setup.draw(ctx);
  }
}