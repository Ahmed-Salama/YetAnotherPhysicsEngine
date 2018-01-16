export default class Constants {
  public static readonly keyDefs = new Map([
    [37, 'left'],
    [38, 'up'],
    [39, 'right'],
    [40, 'down'],
    [32, 'space'],
    [65, 'A'],
    [83, 'S'],
    [68, 'D'],
    [70, 'nitro']
  ]);

  public static readonly key_pressed = new Map([
    ['left', 0],
    ['right', 0],
    ['up', 0],
    ['down', 0],
  ]);

  public static readonly block_shade_offset = 0.25;
  public static readonly block_size = 18;
  public static readonly canvas_offset_x = 50;
  public static readonly canvas_offset_y = 90;
  public static readonly canvas_size = 1200;
  public static readonly drawing_scale = 6;
  public static readonly eps = 0.0000001;
  public static readonly field_height = 30;
  public static readonly field_width = 20;
  public static readonly frames_per_second = 10;
  public static readonly general_elasticity = 0.7;
  public static readonly inner_field_width = Constants.field_width - 2;
  public static readonly jump_timer_duration = 8;
  public static readonly time_scale = 2.2;
  public static readonly time_step = 1000 / Constants.frames_per_second;
  public static readonly tire_elasticity = 0.1;

  public static debugging = false;
  public static paused = false;

  // colors
  public static readonly clear_rect_color = "#EAECEE";
  public static readonly ground_pattern_color = "#212F3D";
  public static readonly ground_stroke_color = "#17202A";
}
