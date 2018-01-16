import PhysicalObject from "./physical_object";
import PhysicalSetup from "./physical_setup";

type ConditionChecker = (object: PhysicalObject) => boolean;

export class Level {
  public _currentSetup: PhysicalSetup;
  public _winConditions: Map<number, ConditionChecker[]>;

  constructor(objects: Immutable.Map<number, PhysicalObject>,
              cameraObject: PhysicalObject,
              winConditions: Map<number, ConditionChecker[]>) {
    this._winConditions = winConditions;

    this._currentSetup = new PhysicalSetup(objects, cameraObject, true);
  }

  public updated(time_unit: number) {
    return this._currentSetup.updated(time_unit);
  }

  public draw(ctx: CanvasRenderingContext2D) {
    return this._currentSetup.draw(ctx);
  }
}
