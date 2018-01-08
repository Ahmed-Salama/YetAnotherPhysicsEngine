import Entity from './entity'

export default class Vector2D extends Entity {
  public x: number;
  public y: number;

  static empty: Vector2D = new Vector2D(0, 0);

  constructor(ox: number, oy: number) {
    super();
    this.x = ox;
    this.y = oy
  }

  public add_delta(dx: number, dy: number): Vector2D {
    return this.copy({ x: this.x + dx, y: this.y + dy });
  }

  public add_vector(vector: Vector2D): Vector2D {
    return this.copy({ x: this.x + vector.x, y: this.y + vector.y });
  }

  public multiply(value: number): Vector2D {
    return this.copy({ x: this.x * value, y: this.y * value });
  }

  public multiplyX(value: number): Vector2D {
    return this.copy({ x: this.x * value });
  }

  public normalize() {
    const angle = Math.atan2(this.y, this.x);
    return new Vector2D(Math.cos(angle), Math.sin(angle));
  }

  public reverse(): Vector2D {
    return this.copy({ x: -this.x, y: -this.y });
  }

  public flipX(): Vector2D {
    return this.copy({ x: -this.x });
  }

  public flipY(): Vector2D {
    return this.copy({ y: -this.y });
  }

  public resetX(): Vector2D {
    return this.copy({ x: 0 });
  }

  public angle() {
    return Math.atan2(this.y, this.x);
  }

  public length() {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }

  public rotate(deltaAngle: number) {
    const angle = this.angle();
    const length = this.length();

    const newAngle = angle + deltaAngle;

    return new Vector2D(length * Math.cos(newAngle), length * Math.sin(newAngle));
  }

  public to(vector: Vector2D) {
    return new Vector2D(vector.x - this.x, vector.y - this.y);
  }

  public subtract(vector: Vector2D) {
    return new Vector2D(this.x - vector.x, this.y - vector.y);
  }

  public cross(vector: Vector2D) {
    return this.x * vector.y - this.y * vector.x;
  }

  public crossW(w: number) {
    return new Vector2D(this.y * -w, this.x * w);
  }

  public dot(vector: Vector2D) {
    return this.x * vector.x + this.y * vector.y;
  }

  public toString() {
    return "{x: " + this.x + ", y:" + this.y + "}";
  }
}
