export default class Entity {
  public id: number;

  constructor(initialize = false, ...rest: any[]) {
    this.id = Math.random();
    if (initialize) {
      this.initialize(...rest);
    }
  }

  public copy<T extends Entity>(new_values: {}): T {
    return Object.assign(this.get_default(), this, new_values);
  }

  public get_default() {
    return new (this.constructor as any)();
  }

  public equals(e: Entity) {
    return this.id == e.id;
  }

  protected initialize(...rest: any[]) {
  }
}
