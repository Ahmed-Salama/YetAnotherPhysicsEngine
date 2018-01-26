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

export default class LayerManager extends GameElement {
  public layers: Immutable.Set<Layer>;
  public camera: Camera;
  public won: boolean
  public lost: boolean

  constructor(initialize: boolean) {
    super(initialize);
  }

  protected initialize() {
    super.initialize();
  }

  public updated(time_unit: number): LayerManager {
    if (this.won || this.lost) return this;

    const updated_layers = this.layers.map(layer => layer.updated(time_unit)).toSet();
    const won = updated_layers.some(layer => layer.won);
    const lost = updated_layers.some(layer => layer.lost);

    return this.copy({ layers: updated_layers, won: won, lost: lost });
  }

  public get_object(object_id: number) {
    return this.layers.map(layer => layer.get_object(object_id)).filter(o => o != null).first();
  }

  public draw(ctx: CanvasRenderingContext2D) {
    const self = this;
    ctx.save();

    this.layers.forEach((layer) => {
      ctx.save();
      const camera_coordinates = self.camera.get_coordinates(self);
      const camera_offset = 
        new Vector2D(
          Constants.drawing_scale * camera_coordinates.x / layer.depth,
          Constants.drawing_scale * camera_coordinates.y / layer.depth);
      ctx.translate(-camera_offset.x, -camera_offset.y - 0.45 * Constants.canvas_size);
      layer.draw(ctx);
      ctx.restore();
    });

    ctx.restore();
  }
}
