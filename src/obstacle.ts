import Constants from './constants'
import PhysicalSetup from './physical_setup'
import Vector2D from './vector2d'
import {Line} from './line'
import PhysicalObject from './physical_object';
import Utils from './utils';
import Ground from './ground';
import Car from './car';
import Ball from './ball';

export default class Obstacle extends Ground {
  public hit: boolean;


  constructor(initialize: boolean, position: Vector2D, points: Array<Array<number>>) {
    super(initialize, position, points);
    this.hit = false;
  }

  protected initialize(position: Vector2D, points: Array<Array<number>>) {
    super.initialize(position, points);
  }

  protected _define_attributes() {
    super._define_attributes();
    this.color = "#E74C3C";
    this.border_color = "#943126";
  }

  public updated_with_collisions(collided_objects: Immutable.List<PhysicalObject>): PhysicalObject {
    return this.copy({ hit: this.hit || collided_objects.some(o => o instanceof Car || o instanceof Ball) });
  }
}
