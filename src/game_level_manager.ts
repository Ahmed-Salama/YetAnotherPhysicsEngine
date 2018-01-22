import GameElement from "./game_element";
import PhysicalSetup from "./physical_setup";
import Car from "./car";
import Constants from "./constants";


export default class GameLevelManager extends GameElement {
  public original_physical_setup: PhysicalSetup;
  public current_physical_setup: PhysicalSetup;

  constructor(initialize: boolean, physical_setup: PhysicalSetup) {
    super(initialize, physical_setup);
  }

  protected initialize(physical_setup: PhysicalSetup) {
    this.current_physical_setup = physical_setup;
    this.original_physical_setup = physical_setup;
  }

  public updated(time_unit: number): GameLevelManager {
    const updated_physical_setup = this.current_physical_setup.updated(time_unit);

    const some_cars_below_sea_level = 
      updated_physical_setup.filter_objects(o => o instanceof Car).some(car => car.position.y > 110);
    
    if (some_cars_below_sea_level) {
        return this.copy({ current_physical_setup: this.original_physical_setup });
    } else {
        return this.copy({ current_physical_setup: updated_physical_setup }); 
    }
  }

  public draw(ctx: CanvasRenderingContext2D) {
    this.current_physical_setup.draw(ctx);
  }
}