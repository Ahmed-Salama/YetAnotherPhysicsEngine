import Utils from './utils';
import Vector2D from './vector2d'
import Constants from './constants'
import PhysicalSetup from './physical_setup'

$(document).ready(() => {
  const body = $('body');
  $('#toggleDebuggerBtn').click(() => Constants.debugging = !Constants.debugging);
  $('#togglePauseBtn').click(() => Constants.paused = !Constants.paused);
  Rx.Observable.fromEvent(body, 'keydown')
    .filter((e: KeyboardEvent) => Constants.keyDefs.has(e.keyCode))
    .map((e: KeyboardEvent) => {e.preventDefault(); return Constants.keyDefs.get(e.keyCode)})
    .subscribe(e => Constants.key_pressed.set(e, 1));

  Rx.Observable.fromEvent(body, 'keyup')
    .filter((e: KeyboardEvent) => Constants.keyDefs.has(e.keyCode))
    .map((e: KeyboardEvent) => {e.preventDefault(); return Constants.keyDefs.get(e.keyCode)})
    .subscribe(e => Constants.key_pressed.set(e, 0));

  const canvas = document.getElementById("canvas") as HTMLCanvasElement;
  const ctx = canvas.getContext("2d");

  const $time = Rx.Observable.interval(Constants.time_step)
    .timeInterval();

  $time.scan((physical_setup, time_unit) => {
      if (Constants.paused) {
        return physical_setup;
      } else {
        return physical_setup.updated(Constants.time_step * Constants.time_scale);
      }
    }, new PhysicalSetup(true))
    .subscribe((physical_setup: PhysicalSetup) => {
      ctx.save();
      ctx.fillStyle = Constants.clear_rect_color;
      ctx.fillRect(0, 0, Constants.canvas_size, Constants.canvas_size);
      ctx.restore();

      physical_setup.draw(ctx);
    });
});




