// const patter_canvas = createPinstripeCanvas();

import Constants from './constants'

export default class Utils {

  public static createPinstripeCanvas() {
    const patternCanvas = document.createElement("canvas");
    const pctx = patternCanvas.getContext('2d', { antialias: true });
    const colour = Constants.ground_pattern_color;

    const CANVAS_SIDE_LENGTH = 15;
    const WIDTH = CANVAS_SIDE_LENGTH;
    const HEIGHT = CANVAS_SIDE_LENGTH;
    const DIVISIONS = 4;

    patternCanvas.width = WIDTH;
    patternCanvas.height = HEIGHT;
    pctx.fillStyle = colour;

    // Top line
    pctx.beginPath();
    pctx.moveTo(0, HEIGHT * (1 / DIVISIONS));
    pctx.lineTo(WIDTH * (1 / DIVISIONS), 0);
    pctx.lineTo(0, 0);
    pctx.lineTo(0, HEIGHT * (1 / DIVISIONS));
    pctx.fill();

    // Middle line
    pctx.beginPath();
    pctx.moveTo(WIDTH, HEIGHT * (1 / DIVISIONS));
    pctx.lineTo(WIDTH * (1 / DIVISIONS), HEIGHT);
    pctx.lineTo(0, HEIGHT);
    pctx.lineTo(0, HEIGHT * ((DIVISIONS - 1) / DIVISIONS));
    pctx.lineTo(WIDTH * ((DIVISIONS - 1) / DIVISIONS), 0);
    pctx.lineTo(WIDTH, 0);
    pctx.lineTo(WIDTH, HEIGHT * (1 / DIVISIONS));
    pctx.fill();

    // Bottom line
    pctx.beginPath();
    pctx.moveTo(WIDTH, HEIGHT * ((DIVISIONS - 1) / DIVISIONS));
    pctx.lineTo(WIDTH * ((DIVISIONS - 1) / DIVISIONS), HEIGHT);
    pctx.lineTo(WIDTH, HEIGHT);
    pctx.lineTo(WIDTH, HEIGHT * ((DIVISIONS - 1) / DIVISIONS));
    pctx.fill();

    return patternCanvas;
  }

  public static fillWithPattern(targetCanvas: HTMLCanvasElement,
                                patternCanvas: HTMLCanvasElement){
    const ctx = targetCanvas.getContext('2d', { antialias: false, depth: false });
    const width = targetCanvas.width;
    const height = targetCanvas.height;
    if (!width || !height) {
      throw new Error("progressCanvas's width/height falsy.");
    }

    ctx.fillRect(0, 0, width, height);

    return targetCanvas;
  }

  public static assert_not(expression: boolean, message: string) {
    if (expression) {
      alert(message);
    }
  }

  public static binary_search(lo: number, hi: number, iterations: number, can: (_: number) => boolean): number {
    if (iterations == 0) return hi;

    const md = (lo + hi) / 2;

    if (can(md)) return Utils.binary_search(lo, md, iterations - 1, can);
    else return Utils.binary_search(md, hi, iterations - 1, can);
  }
}
