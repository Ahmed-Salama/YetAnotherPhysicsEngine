import Ball from './ball'
import Camera from './camera'
import Car from './car'
import GameElement from './game_element'
import Ground from './ground'
import PhysicalObject from './physical_object'
import {Collision} from './collision'
import Utils from './utils';
import Pipeline from './pipeline';
import PipelineTransformer from './pipeline_transformer';
import Vector2D from './vector2d';
import Constants from './constants';

export default class Layer extends GameElement {
  public camera: Camera;
  public depth: number;
  public won: boolean;
  public lost: boolean;

  constructor(initialize: boolean, ...rest: any[]) {
    super(initialize, ...rest);
  }

  protected initialize(...rest: any[]) {
    super.initialize(...rest);
  }

  public updated(time_unit: number): Layer {
    return this;
  }

  public get_object(object_id: number): PhysicalObject {
    throw new Error("Unsupported method");
  }

  public draw(ctx: CanvasRenderingContext2D) {
    throw new Error("Unsupported method");
  }
}
