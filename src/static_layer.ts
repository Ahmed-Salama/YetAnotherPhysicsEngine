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
import Layer from './layer';
import Obstacle from './obstacle';
import Goal from './goal';

export default class StaticLayer extends Layer {
  public objects: Immutable.Set<PhysicalObject>;

  constructor(initialize: boolean, objects: Immutable.Set<PhysicalObject>) {
    super(initialize, objects);
  }

  protected initialize(objects: Immutable.Set<PhysicalObject>) {
    super.initialize();
    this.objects = objects;
    this.depth = 4;
  }

  public updated(time_unit: number): StaticLayer {
    return this;
  }

  public get_object(object_id: number): PhysicalObject {
    return null;
  }

  public draw(ctx: CanvasRenderingContext2D) {
    const self = this;

    ctx.save();

    this.objects.forEach((o) => o.draw(ctx));

    ctx.restore();
  }
}
