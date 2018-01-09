import Utils from './utils';
import Vector2D from './vector2d'
import Constants from './constants'
import GameSet from './game_set'

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

  $time.scan((game_set, time_unit) => {
      if (Constants.paused) {
        return game_set;
      } else {
        return game_set.updated(Constants.time_step * Constants.time_scale);
      }
    }, new GameSet(true))
    .subscribe((game_set: GameSet) => {
      ctx.save();
      ctx.fillStyle = Constants.clear_rect_color;
      ctx.fillRect(0, 0, Constants.canvas_size, Constants.canvas_size);
      ctx.restore();

      game_set.draw(ctx);
    });
});




