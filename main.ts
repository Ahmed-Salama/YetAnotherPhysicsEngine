///<reference path='./node_modules/immutable/dist/immutable.d.ts'/>

// constants
const keyDefs = new Map([
    [37, 'left'],
    [38, 'up'],
    [39, 'right'],
    [40, 'down'],
    [32, 'space'],
    [65, 'jump'],
]);
const canvas_size = 1200;
const canvas_offset_x = 50;
const canvas_offset_y = 90;
const block_size = 18;
const block_shade_offset = 0.25;
const field_width = 20;
const inner_field_width = field_width - 2;
const field_height = 30;
const drawing_scale = 6;
const eps = 0.0000001;
let debugging = false;
let paused = false;
const slow_down = 1;
const time_step = 22 * slow_down;

interface IntersectionResult {
    intersection_exists: boolean;
    intersection_point?: Vector2D;
}

function is_intersecting(l1: Line, l2: Line): Intersection {
    const l1_constants = get_line_constants(l1);
    const A1 = l1_constants[0];
    const B1 = l1_constants[1];
    const C1 = l1_constants[2];

    const l2_constants = get_line_constants(l2);
    const A2 = l2_constants[0];
    const B2 = l2_constants[1];
    const C2 = l2_constants[2];

    const det = A1 * B2 - A2 * B1;

    if (Math.abs(det) <= eps) {
        return new Intersection(l1, l2, false, null);
    }

    const x = (B2 * C1 - B1 * C2) / det;
    const y = (A1 * C2 - A2 * C1) / det;

    return new Intersection(l1, l2, on_segment(l1, x, y) && on_segment(l2, x, y), new Vector2D(x, y));
}

function on_segment(line: Line, x: number, y: number) {
    const X1 = line.startPosition.x;
    const X2 = line.endPosition.x;
    const Y1 = line.startPosition.y;
    const Y2 = line.endPosition.y;

    return Math.min(X1, X2) <= x && x <= Math.max(X1, X2) &&
           Math.min(Y1, Y2) <= y && y <= Math.max(Y1, Y2);
}

function get_line_constants(line: Line) {
    const X1 = line.startPosition.x;
    const X2 = line.endPosition.x;
    const Y1 = line.startPosition.y;
    const Y2 = line.endPosition.y;

    const A = Y2 - Y1;
    const B = X1 - X2;
    const C = A * X1 + B * Y1;
    return [A, B, C];
}

const key_pressed = new Map([
    ['left', 0],
    ['right', 0],
    ['up', 0],
    ['down', 0],
]);

$(document).ready(() => {
    const body = $('body');
    Rx.Observable.fromEvent(body, 'keydown')
        .map((e: KeyboardEvent) => keyDefs.get(e.keyCode))
        .subscribe(e => key_pressed.set(e, 1));

    Rx.Observable.fromEvent(body, 'keyup')
        .map((e: KeyboardEvent) => keyDefs.get(e.keyCode))
        .subscribe(e => key_pressed.set(e, 0));

    const canvas = document.getElementById("canvas") as HTMLCanvasElement;

    const ctx = canvas.getContext("2d");

    const $time = Rx.Observable.interval(10 * slow_down)
        .timeInterval();

    $time.scan((game_set, time_unit) => {
            if (paused) {
                return game_set;
            } else {
                return game_set.updated(time_step);
            }
        }, new GameSet(true))
        .subscribe((game_set: GameSet) => {
            ctx.clearRect(0, 0, canvas_size, canvas_size);
            game_set.draw(ctx);
        });
});

class Entity {
    public id: number;
    public name: string;

    constructor(initialize: boolean = false) {
        this.id = Math.random();
        if (initialize) {
            this.initialize();
        }
    }
    public copy<T extends Entity>(new_values: {}): T {
        return Object.assign(this.get_default(), this, new_values);
    }
    public get_default() {
        return eval("new " + this.constructor.name + "()");
    }
    public equals(e: Entity) {
        return this.id == e.id;
    }
    protected initialize() {
    }
}

class Vector2D extends Entity {
    public x: number;
    public y: number;

    constructor(ox: number, oy: number) {
        super();
        this.x = ox;
        this.y = oy
    }
    public addDelta(dx: number, dy: number): Vector2D {
        return this.copy({ x: this.x + dx, y: this.y + dy });
    }
    public addVector(vector: Vector2D): Vector2D {
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
    public reverseDirection(vector: Vector2D) {
        const angle2 = Math.atan2(vector.y, vector.x);
        return this.rotate(-angle2).flipX().rotate(angle2);
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
class Line extends Entity {
    public startPosition: Vector2D;
    public endPosition: Vector2D;
    public collision_direction: Vector2D;
    public is_ground: boolean;
    public is_tire: boolean;

    constructor(startPosition: Vector2D, endPosition: Vector2D, collision_direction?: Vector2D,
                               is_ground?: boolean, is_tire?: boolean) {
        super();
        this.startPosition = startPosition;
        this.endPosition = endPosition;
        this.collision_direction = collision_direction;
        this.is_ground = is_ground;
        this.is_tire = is_tire;
    }
    public offset(vector: Vector2D): Line {
        return this.copy({ startPosition: this.startPosition.addVector(vector), endPosition: this.endPosition.addVector(vector) });
    }
    public rotate(angle: number): Line {
        return this.copy({ startPosition: this.startPosition.rotate(angle), endPosition: this.endPosition.rotate(angle) });
    }
    public normal(): Vector2D {
        return this.startPosition.to(this.endPosition).rotate(Math.PI / 2).normalize();
    }
}
interface CollisionResult {
    game_set: Entity;
    collision?: Collision;
    delta_position: Vector2D;
    delta_angle: number;
}
class PhysicalObject extends Entity {
    public position: Vector2D;
    public velocity: Vector2D;
    public angle: number;
    public angularVelocity: number;
    public mass: number;
    public moment_of_inertia: number;
    public center_of_mass: Vector2D;
    public lines: Immutable.List<Line>;

    constructor(initialize: boolean) {
        super(initialize);
    }
    protected initialize() {
        this.define_attributes();
        this.build_lines();
        
        const contribution_ratio = 1.0 / (2 * this.lines.size);
        this.moment_of_inertia = this.mass * this.lines.reduce((acc, line) => acc + contribution_ratio * (Math.pow(line.startPosition.length(), 2) + Math.pow(line.endPosition.length(), 2)), 0);
        this.center_of_mass = this.lines.reduce((com, line) => com.addVector(line.startPosition.multiply(contribution_ratio)).addVector(line.endPosition.multiply(contribution_ratio)), new Vector2D(0, 0));
    }
    protected define_attributes() {
        this.position = new Vector2D(10, 20);
        this.velocity = new Vector2D(2, 0);
        this.angle = 0;
        this.angularVelocity = 0;
        this.mass = 1;
    }
    protected build_lines() {
        this.lines = Immutable.List();
    }
    public updated(time_unit: number): PhysicalObject {
        const gravityVector = new Vector2D(0, 9.8);
        const velocity_air_drag_vector = this.velocity.multiply(0.3 * time_unit / 1000).reverse();
        const angular_velocity_air_drag = this.angularVelocity * -0.4 * time_unit / 1000;

        return this.copy({
            position: this.position.addVector(this.velocity.multiply(time_unit * 1.0 / 1000)),
            velocity: this.velocity.addVector(gravityVector.multiply(time_unit * 1.0 / 1000)).addVector(velocity_air_drag_vector),
            angle: this.angle + this.angularVelocity * time_unit * 1.0 / 1000,
            angularVelocity: this.angularVelocity + angular_velocity_air_drag});
    }
    public draw(ctx: CanvasRenderingContext2D) {
        ctx.save();
        
        const self = this;
        this.lines.forEach(line => {
            ctx.save();
            ctx.beginPath();
            const toDrawStartPosition = self.position.addVector(line.startPosition.rotate(self.angle));
            const toDrawEndPosition = self.position.addVector(line.endPosition.rotate(self.angle));
            ctx.moveTo(drawing_scale * toDrawStartPosition.x, drawing_scale * toDrawStartPosition.y);
            ctx.lineTo(drawing_scale * toDrawEndPosition.x, drawing_scale * toDrawEndPosition.y);
            ctx.stroke();

            ctx.beginPath();
            var start_to_end_vector = line.startPosition.to(line.endPosition);
            var mid_point = start_to_end_vector.normalize().multiply(start_to_end_vector.length() / 2);
            var normal_start_position = self.position.addVector(line.startPosition.addVector(mid_point).rotate(self.angle));
            var normal_end_position = self.position.addVector(line.startPosition.addVector(mid_point).addVector(line.normal()).rotate(self.angle));
            ctx.moveTo(drawing_scale * normal_start_position.x, drawing_scale * normal_start_position.y);
            ctx.lineTo(drawing_scale * normal_end_position.x, drawing_scale * normal_end_position.y);
            ctx.stroke();
            ctx.restore();
        });

        if (this.name != "ground") {
            var toDrawCenterOfMass = self.position.addVector(self.center_of_mass.rotate(self.angle));
            ctx.beginPath();
            ctx.strokeStyle = "black";
            ctx.arc(drawing_scale * toDrawCenterOfMass.x, drawing_scale * toDrawCenterOfMass.y, 2, 0, 2 * Math.PI);
            ctx.stroke();
        }

        ctx.beginPath();
        ctx.strokeStyle = "green";
        ctx.moveTo(drawing_scale * (self.position.x), drawing_scale * (self.position.y));
        ctx.lineTo(drawing_scale * (self.position.x + self.velocity.x), drawing_scale * (self.position.y + self.velocity.y));
        ctx.stroke();

        ctx.beginPath();
        ctx.strokeStyle = "orange";
        ctx.moveTo(drawing_scale * (self.position.x), drawing_scale * (self.position.y));
        ctx.lineTo(drawing_scale * (self.position.x + 8 * self.angularVelocity), drawing_scale * (self.position.y));
        ctx.stroke();
        ctx.restore();
    }
    public calculate_collision(other: PhysicalObject) {
        var intersections = Immutable.List<Intersection>();
        const self = this;
        this.lines.forEach(l1 => {
            other.lines.forEach(l2 => {
                const projected_l1 = l1.rotate(self.angle).offset(self.position);
                const projected_l2 = l2.rotate(other.angle).offset(other.position);
                const intersection_result = is_intersecting(projected_l1, projected_l2);
                if (intersection_result.intersection_exists) {
                    intersections = intersections.push(intersection_result);
                }
            });
        });
    
        return new Collision(intersections);
    }
    public collideAll(delta_position: Vector2D, delta_angle: number, game_set: GameSet): GameSet {
        const self = this;
        const collidedRec = (delta_position_rec: Vector2D, delta_angle_rec: number,
                             game_set_rec: GameSet, remaining: Immutable.List<number>): GameSet => {
            if (remaining.size == 0) {
                const updated_self = game_set_rec.contents.get(self.id) as PhysicalObject;
                return game_set_rec.replace_element(updated_self.move(delta_position_rec).rotate(delta_angle_rec));
            }

            const first_key = remaining.first();
            const first_object = game_set_rec.contents.get(first_key) as PhysicalObject;
            const updated_self = game_set_rec.contents.get(self.id) as PhysicalObject;

            const collision_result = updated_self.collide(delta_position_rec, delta_angle_rec, first_object, game_set_rec);
            const new_game_set = collision_result.game_set as GameSet;
            const new_delta_position = collision_result.delta_position;
            const new_delta_angle = collision_result.delta_angle;

            return collidedRec(new_delta_position, new_delta_angle, new_game_set, remaining.shift());
        }

        return collidedRec(delta_position, delta_angle, game_set.replace_element(this), game_set.contents.keySeq().filter(o => o != this.id).toList());
    }
    public collide(delta_position: Vector2D, delta_angle: number, other: PhysicalObject,
                   game_set: GameSet): CollisionResult {
        const advanced_self = this.move(delta_position).rotate(delta_angle);

        const collision = advanced_self.calculate_collision(other);
        if (!collision.collided())
            return {
                game_set: game_set.replace_element(this),
                delta_position: delta_position,
                delta_angle: delta_angle
            };

        // Impulse-based collision handling. Reference: https://www.myphysicslab.com/engine2D/collision-en.html#collision_physics
        const elasticity = 0.7;
        const impulse_weight = 1.0 / collision.intersections.size;

        if (other.name == "ground") {
            const collide_rec = (delta_v_a: Vector2D, delta_w_a: number, remaining_intersections: Immutable.List<Intersection>): any => {
                if (remaining_intersections.size == 0) return {"d_v_a": delta_v_a, "d_w_a": delta_w_a};
    
                const first_intersection = remaining_intersections.first();
                const intersection_point = first_intersection.intersection_point;
        
                const normal = first_intersection.other_line.normal(); 
                const r_ap = advanced_self.position.addVector(advanced_self.center_of_mass).to(intersection_point);

                const v_a1 = advanced_self.velocity;
                const w_a1 = advanced_self.angularVelocity;

                var v_ap1 = v_a1.addVector(r_ap.crossW(w_a1));

                var m_a = advanced_self.mass;
                var i_a = advanced_self.moment_of_inertia;

                var impulse = - impulse_weight * (1 + elasticity) * v_ap1.dot(normal) / (1.0/m_a + Math.pow(r_ap.cross(normal), 2)/i_a);

                var d_v_a = normal.multiply(impulse / m_a);
                var d_w_a = r_ap.cross(normal.multiply(impulse)) / i_a;

                return collide_rec(delta_v_a.addVector(d_v_a), delta_w_a + d_w_a, remaining_intersections.shift());
            }

            var delta = collide_rec(new Vector2D(0, 0), 0, collision.intersections);

            return {"game_set": game_set.replace_element(this.copy({velocity: this.velocity.addVector(delta.d_v_a), angularVelocity: this.angularVelocity + delta.d_w_a})),
                    "delta_position": new Vector2D(0, 0),
                    "delta_angle": 0};
        } else {
            var collide_rec = (delta_v_a: Vector2D, delta_w_a: number, delta_v_b: Vector2D, delta_w_b: number, remaining_intersections: Immutable.List<Intersection>): any => {
                if (remaining_intersections.size == 0) return {"d_v_a": delta_v_a, "d_w_a": delta_w_a, "d_v_b": delta_v_b, "d_w_b": delta_w_b};
    
                var first_intersection = remaining_intersections.first();
                var intersection_point = first_intersection.intersection_point;

                var normal = first_intersection.self_line.normal();

                var v_a1 = advanced_self.velocity;
                var v_b1 = other.velocity;

                var r_ap = advanced_self.position.addVector(advanced_self.center_of_mass).to(intersection_point);
                var r_bp = other.position.addVector(advanced_self.center_of_mass).to(intersection_point);

                var w_a1 = advanced_self.angularVelocity;
                var w_b1 = other.angularVelocity;

                var v_ap1 = v_a1.addVector(r_ap.crossW(w_a1));
                var v_bp1 = v_b1.addVector(r_bp.crossW(w_b1));

                var v_ab1 = v_ap1.subtract(v_bp1);

                var m_a = advanced_self.mass;
                var m_b = other.mass;

                var i_a = advanced_self.moment_of_inertia;
                var i_b = other.moment_of_inertia;

                var impulse = - impulse_weight * (1 + elasticity) * v_ab1.dot(normal) / (1.0/m_a + 1.0/m_b + Math.pow(r_ap.cross(normal), 2)/i_a + Math.pow(r_bp.cross(normal), 2)/i_b);

                // alert("Self: " + advanced_self.position +
                    // "\nOther: " + other.position + 
                    // "\nIntersection: " + intersection_point + 
                    // "\nImpulse: " + impulse +
                    // "\nVelocity: " + v_ab1.dot(normal) +
                    // "\nTerm: " + (1.0/m_a + 1.0/m_b));

                var d_v_a = normal.multiply(impulse / m_a);
                var d_v_b = normal.multiply(-impulse / m_b);

                var d_w_a = r_ap.cross(normal.multiply(impulse)) / i_a;
                var d_w_b = -r_bp.cross(normal.multiply(impulse)) / i_b;

                return collide_rec(delta_v_a.addVector(d_v_a), delta_w_a + d_w_a, delta_v_b.addVector(d_v_b), delta_w_b + d_w_b, remaining_intersections.shift());
            }

            var delta = collide_rec(new Vector2D(0, 0), 0, new Vector2D(0, 0), 0, collision.intersections);

            var updated_self = this.copy({velocity: this.velocity.addVector(delta.d_v_a), angularVelocity: this.angularVelocity + delta.d_w_a});
            var updated_other = other.copy({velocity: other.velocity.addVector(delta.d_v_b), angularVelocity: other.angularVelocity + delta.d_w_b});

            return {"game_set": game_set.replace_element(updated_self).replace_element(updated_other),
                    "delta_position": new Vector2D(0, 0),
                    "delta_angle": 0};
        }
    }
    public move(vector: Vector2D): PhysicalObject {
        return this.copy({ position: this.position.addVector(vector) });
    }
    public rotate(delta_angle: number): PhysicalObject {
        return this.copy({ angle: this.angle + delta_angle });
    }
}
class GameElement extends PhysicalObject {
    constructor(initialize: boolean) {
        super(initialize);
    }
    public update_game_set(time_unit: number, game_set: GameSet): GameSet {
        throw new Error('Unsupported method');
    }
}
class Intersection extends Entity {
    public self_line: Line;
    public other_line: Line;
    public intersection_exists: boolean;
    public intersection_point: Vector2D;
    
    constructor(sl: Line, ol: Line, intersection_exists: boolean, intersection_point: Vector2D) {
        super();
        this.self_line = sl;
        this.other_line = ol;
        this.intersection_exists = intersection_exists;
        this.intersection_point = intersection_point;
    }
}
class Collision extends Entity {
    public intersections: Immutable.List<Intersection>;

    constructor(intersections: Immutable.List<Intersection>) {
        super();
        this.intersections = intersections;
    }
    collided() {
        return this.intersections.size > 0;
    }
}
class Ball extends GameElement {
    public radius: number;

    constructor(initialize: boolean) {
        super(initialize);
    }
    protected define_attributes() {
        super.define_attributes();
        this.radius = 10;
        this.position = new Vector2D(60, 20);
        this.velocity = new Vector2D(10, 0);
        this.mass = 4;
        this.name = "ball";
    }
    protected build_lines() {
        super.build_lines();
        const samples = 24;
        for (var s = 0; s < samples; s++) {
            var angle1 = -s * 2 * Math.PI / samples;
            var angle2 = -(s + 1) * 2 * Math.PI / samples;

            var startPosition = new Vector2D(this.radius * Math.cos(angle1), this.radius * Math.sin(angle1));
            var endPosition = new Vector2D(this.radius * Math.cos(angle2), this.radius * Math.sin(angle2));
            this.lines = this.lines.push(new Line(startPosition, endPosition));
        }
    }
    public update_game_set(time_unit: number, game_set: GameSet): GameSet {
        const advanced_ball: Ball = super.updated(time_unit) as Ball;

        const advanced_ball_original_position: Ball = advanced_ball.copy({ position: this.position, angle: this.angle }) as Ball;
        return advanced_ball_original_position.collideAll(advanced_ball.position.subtract(this.position), advanced_ball.angle - this.angle, game_set);
    }
    public draw(ctx: CanvasRenderingContext2D) {
        ctx.save();
        if (debugging) {
            ctx.strokeStyle = "blue";
            super.draw(ctx);
        } else {
            const draw_circle = (radius_scale: number, color: string) => {
                ctx.fillStyle = color;
                let first = true;
                const self = this;

                ctx.beginPath();
                this.lines.forEach(line => {
                    const toDrawStartPosition = self.position.addVector(line.startPosition.multiply(radius_scale).rotate(self.angle));
                    const toDrawEndPosition = self.position.addVector(line.endPosition.multiply(radius_scale).rotate(self.angle));
                    if (first) {
                        first = false;
                        ctx.moveTo(drawing_scale * toDrawStartPosition.x, drawing_scale * toDrawStartPosition.y);
                    }
                    ctx.lineTo(drawing_scale * toDrawEndPosition.x, drawing_scale * toDrawEndPosition.y);
                });
                ctx.fill();
            }
            draw_circle(1, "#21618C");
            draw_circle(0.9, "#3498DB");
            draw_circle(0.8, "#5DADE2");
            draw_circle(0.6, "#85C1E9");
            draw_circle(0.2, "#AED6F1");
        }
        ctx.restore();
    }
}

class Car extends GameElement {
    public flying_state: string;
    public jump_state: string;
    public nitro: Vector2D;
    public jumper: Vector2D;

    constructor(initialize: boolean) {
        super(initialize);
    }
    protected define_attributes() {
        super.define_attributes();
        this.position = new Vector2D(60, 65);
        this.velocity = new Vector2D(0, -10);
        this.angularVelocity = 0;
        this.mass = 40;
        this.flying_state = "flying";
        this.jump_state = "station";
        this.name = "car";
    }
    protected build_lines() {
        super.build_lines();

        const f = 3;

        const points = [[20, 14], [20, 4], [-2, -7], [-20, -10], [-20, 14]];
        const tire = [false, false, false, false, false];

        for (let i = 0; i < points.length; i++) {
            const j = (i + 1) % points.length;
            const p1 = points[i];
            const p2 = points[j];
            this.lines = this.lines.push(new Line(new Vector2D(p1[0] / f, p1[1] / f), new Vector2D(p2[0] / f, p2[1] / f), null, false, tire[i]));
        }

        this.nitro = new Vector2D(-20 / f, 0);
        this.jumper = new Vector2D(0, 14 / f);
    }
    public update_game_set(time_unit: number, game_set: GameSet): GameSet{
        const advanced_car_gravity: Car = super.updated(time_unit) as Car;

        const jumped_car: Car = key_pressed.get("jump") ?
            (this.jump_state == "station" ?
                advanced_car_gravity.copy({ flying_state: "flying", jump_state: "jumping" }) :
                advanced_car_gravity) :
            (this.jump_state == "station" ?
                advanced_car_gravity :
                advanced_car_gravity.copy({ jump_state: "station" }));

        const car_jumping = this.jump_state == "station" && jumped_car.jump_state == "jumping";
        const car_flying = this.flying_state == "flying";

        const nitroVector = this.nitro.normalize().multiply(key_pressed.get("up")).rotate(this.angle).reverse().multiply(20);
        const jumpVector = this.jumper.normalize().multiply(car_jumping ? 1 : 0).rotate(this.angle).reverse().multiply(10);
        const angularForce = (key_pressed.get("left") * -1 + key_pressed.get("right")) * (car_flying ? 4 : 0);

        const advanced_car: Car = jumped_car.copy({
            velocity: jumped_car.velocity.addVector(nitroVector.multiply(time_unit * 1.0 / 1000)).addVector(jumpVector),
            angularVelocity: jumped_car.angularVelocity + angularForce * time_unit * 1.0 / 1000
        });

        const advanced_car_original_position = advanced_car.copy<Car>({ position: this.position, angle: this.angle });
        return advanced_car_original_position.collideAll(advanced_car.position.subtract(this.position), advanced_car.angle - this.angle, game_set);
    }
    public draw(ctx: CanvasRenderingContext2D) {
        const f = 3;
        ctx.save();
        if (debugging) {
            ctx.strokeStyle = "red";
            super.draw(ctx);

            ctx.fillStyle = "violet";
            const rotatedNitroPosition = this.position.addVector(this.nitro.rotate(this.angle));
            ctx.beginPath();
            ctx.arc(drawing_scale * rotatedNitroPosition.x, drawing_scale * rotatedNitroPosition.y, 6, 0, 2 * Math.PI);
            ctx.fill();


            ctx.fillStyle = this.jump_state == "station" ? "yellow" : "orange";
            const rotatedJumperPosition = this.position.addVector(this.jumper.rotate(this.angle));
            ctx.beginPath();
            ctx.arc(drawing_scale * rotatedJumperPosition.x, drawing_scale * rotatedJumperPosition.y, 6, 0, 2 * Math.PI);
            ctx.fill();
        } else {
            const line_to = (x: number, y: number) => {
                const vector = this.position.addVector((new Vector2D(x / f, y / f)).rotate(this.angle));
                return ctx.lineTo(drawing_scale * vector.x, drawing_scale * vector.y);
            }
            const move_to = (x: number, y: number) => {
                const vector = this.position.addVector((new Vector2D(x / f, y / f)).rotate(this.angle));
                return ctx.moveTo(drawing_scale * vector.x, drawing_scale * vector.y);
            }

            ctx.fillStyle = "black";
            ctx.beginPath();
            move_to(20, 7);
            line_to(-16, -4);
            line_to(-16, 6);
            line_to(12, 8);
            ctx.fill();

            ctx.fillStyle = "#E67E22";
            ctx.beginPath();
            move_to(20, 7);
            line_to(20, 3);
            line_to(12, 0);
            line_to(7, -4);
            line_to(-2, -7);
            line_to(-5, -3);
            line_to(-18, -3);
            line_to(-18, 1);
            line_to(-8, 3);
            line_to(-2, 9);
            line_to(2, 9);
            line_to(8, 5);
            line_to(12, 4);
            ctx.fill();

            ctx.fillStyle = "#E67E22";
            ctx.beginPath();
            move_to(-12, -8);
            line_to(-20, -10);
            line_to(-20, -7);
            line_to(-12, -7);
            ctx.fill();

            ctx.fillStyle = "gray";
            ctx.beginPath();
            move_to(-15, -7);
            line_to(-17, -7);
            line_to(-16, -4);
            line_to(-14, -4);
            ctx.fill();

            ctx.fillStyle = "black";
            ctx.beginPath();
            move_to(-1, -5.5);
            line_to(-3, -3.5);
            line_to(5, -0.5);
            line_to(9, -0.5);
            line_to(6, -3.5);
            ctx.fill();

            ctx.fillStyle = "gray";
            ctx.beginPath();
            move_to(-2, -7);
            line_to(-12, -6);
            line_to(-14, -3);
            line_to(-5, -3);
            ctx.fill();


            ctx.fillStyle = "#922B21";
            ctx.beginPath();
            move_to(-4, -6);
            line_to(-10, -5);
            line_to(-14, -4);
            line_to(-5, -4);
            ctx.fill();

            const draw_tire = (x: number, y: number) => {
                ctx.fillStyle = "gray";
                let w1 = this.position.addVector((new Vector2D(x / f, y / f)).rotate(this.angle));
                ctx.beginPath();
                ctx.arc(drawing_scale * w1.x, drawing_scale * w1.y, 11, 0, 2 * Math.PI);
                ctx.fill();

                ctx.fillStyle = "lightgray";
                w1 = this.position.addVector((new Vector2D(x / f, y / f)).rotate(this.angle));
                ctx.beginPath();
                ctx.arc(drawing_scale * w1.x, drawing_scale * w1.y, 7, 0, 2 * Math.PI);
                ctx.fill();

                ctx.fillStyle = "black";
                w1 = this.position.addVector((new Vector2D(x / f, y / f)).rotate(this.angle));
                ctx.beginPath();
                ctx.arc(drawing_scale * w1.x, drawing_scale * w1.y, 5, 0, 2 * Math.PI);
                ctx.fill();
            }
            draw_tire(-12, 8);
            draw_tire(12, 8);
        }

        ctx.restore();
    }
}

class Ground extends GameElement {
    public lines: Immutable.List<Line>;

    constructor(initialize: boolean) {
        super(initialize);
    }
    protected define_attributes() {
        super.define_attributes();
        this.name = "ground";
        this.position = new Vector2D(0, 0);
    }
    protected build_lines() {
        super.build_lines()
        this.lines = Immutable.List([
            new Line(new Vector2D(200, 100), new Vector2D(0, 100), new Vector2D(0, -1), true),
            new Line(new Vector2D(0, 100), new Vector2D(0, 0), new Vector2D(1, 0), true),
            new Line(new Vector2D(200, 0), new Vector2D(200, 100), new Vector2D(-1, 0), true)]);
    }
    public collisionDirection() {
        return new Vector2D(0, -1);
    }
    public update_game_set(_: number, game_set: GameSet) {
        return game_set;
    }
}

class GameSet extends Entity {
    public contents: Immutable.Map<number, Entity>;
    public ground_id: number;

    constructor(initialize: boolean) {
        super(initialize);
    }
    protected initialize() {
        super.initialize();

        const my_car = new Car(true);
        const ground = new Ground(true);
        const ball = new Ball(true);

        this.contents = Immutable.Map([
            [my_car.id, my_car],
            [ground.id, ground],
            [ball.id, ball],
        ]);
        this.ground_id = ground.id;
    }
    public updated(time_unit: number) {
        const updatedRec = (game_set: GameSet, remaining: Immutable.List<number>): GameSet => {
            if (remaining.size == 0)
                return game_set;

            const first_key = remaining.first();
            const first_object = game_set.contents.get(first_key) as GameElement;

            const new_game_set = first_object.update_game_set(time_unit, game_set) as GameSet;
            return updatedRec(new_game_set, remaining.shift());
        }

        return updatedRec(this, this.contents.keySeq().filter(o => o != this.ground_id).toList());
    }
    public draw(ctx: CanvasRenderingContext2D) {
        this.contents.valueSeq().forEach((o: GameElement) => o.draw(ctx));
    }
    public replace_element(element: Entity): GameSet {
        return this.copy({ "contents": this.contents.set(element.id, element) });
    }
}
