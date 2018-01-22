import Constants from './constants'
import PhysicalSetup from './physical_setup'
import GameLevel1 from './game_level_1';
import GameLevel2 from './game_level_2';
import GameLevelManager from './game_level_manager';

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

  $time.scan((game_level_manager, time_unit) => {
      if (Constants.paused) {
        return game_level_manager;
      } else {
        return game_level_manager.updated(Constants.time_step * Constants.time_scale);
      }
    }, new GameLevelManager(true, new GameLevel2(true)))
    .subscribe((game_level_manager: GameLevelManager) => {
      ctx.save();
      ctx.fillStyle = Constants.clear_rect_color;
      ctx.fillRect(0, 0, Constants.canvas_size, Constants.canvas_size);
      ctx.restore();

      game_level_manager.draw(ctx);
    });
});




