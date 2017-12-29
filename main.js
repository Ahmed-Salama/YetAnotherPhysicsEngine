Array.prototype.random = function () {
  return this[Math.floor((Math.random() * this.length))];
}

const range = x => Array.from(Array(x).keys());

// constants
keyDefs = {
    "37": "left",
    "38": "up",
    "39": "right",
    "40": "down",
    "32": "space",
    "65": "jump"
};
time_step = 150;
canvas_size = 1200;
canvas_offset_x = 50;
canvas_offset_y = 90;
block_size = 18;
block_shade_offset = 0.25;
field_width = 20;
inner_field_width = field_width - 2;
field_height = 30;
drawing_scale = 6;
eps = 0.00001;
debugging = false;
//
// var test = new PhysicalObject();
// test.velocity = new Vector2D(2, );

var is_intersecting = (l1, l2) => {
    l1_constants = get_line_constants(l1);
    var A1 = l1_constants[0];
    var B1 = l1_constants[1];
    var C1 = l1_constants[2];

    l2_constants = get_line_constants(l2);
    var A2 = l2_constants[0];
    var B2 = l2_constants[1];
    var C2 = l2_constants[2];

    var det = A1 * B2 - A2 * B1;

    if (Math.abs(det) <= eps) return false;

    var x = (B2 * C1 - B1 * C2) / det;
    var y = (A1 * C2 - A2 * C1) / det;

    return {"intersection_exists": on_segment(l1, x, y) && on_segment(l2, x, y), "intersection_point": new Vector2D(x, y)};
}

var on_segment = (line, x, y) => {
    var X1 = line.startPosition.x;
    var X2 = line.endPosition.x;
    var Y1 = line.startPosition.y;
    var Y2 = line.endPosition.y;

    return Math.min(X1, X2) <= x && x <= Math.max(X1, X2) &&
           Math.min(Y1, Y2) <= y && y <= Math.max(Y1, Y2);
}

var get_line_constants = (line) => {
    var X1 = line.startPosition.x;
    var X2 = line.endPosition.x;
    var Y1 = line.startPosition.y;
    var Y2 = line.endPosition.y;

    var A = Y2 - Y1;
    var B = X1 - X2;
    var C = A * X1 + B * Y1;
    return [A, B, C];
}

key_pressed = {
    "left": 0,
    "right": 0,
    "up": 0,
    "down": 0
};

$(document).ready(function() {
    const input = $('body');
    Rx.Observable.fromEvent(input, 'keydown')
        .map(e => keyDefs[e.keyCode])
        .subscribe(e => key_pressed[e] = 1);

    Rx.Observable.fromEvent(input, 'keyup')
        .map(e => keyDefs[e.keyCode])
        .subscribe(e => key_pressed[e] = 0);

    const canvas = document.getElementById("canvas");

    const ctx = canvas.getContext("2d");

    const $time = Rx.Observable.interval(10)
        .timeInterval();

    $time.scan((game_set, time_unit) => {
            return game_set.updated(time_unit.interval);
        }, new GameSet(initialize = true))
        .subscribe(game_set => {
            ctx.clearRect(0, 0, canvas_size, canvas_size);
            game_set.draw(ctx);
        });
});

class Entity {
    constructor(initialize) {
        this.id = Math.random();
        if (initialize) this.initialize();
    }
    copy(new_values) {
        return Object.assign(this.get_default(), this, new_values);
    }
    get_default() {
        return eval("new " + this.constructor.name + "()");
    }
    equals(e) {
        return this.id == e.id;
    }
}
class Vector2D extends Entity {
    constructor(ox, oy) {
        super();
        this.x = ox;
        this.y = oy
    }
    addDelta(dx, dy) {
        return this.copy({x: this.x + dx, y: this.y + dy});
    }
    addVector(vector) {
        return this.copy({x: this.x + vector.x, y: this.y + vector.y});
    }
    multiply(value) {
        return this.copy({x: this.x * value, y: this.y * value});
    }
    multiplyX(value) {
        return this.copy({x: this.x * value});
    }
    normalize() {
        var angle = Math.atan2(this.y, this.x);
        return new Vector2D(Math.cos(angle), Math.sin(angle));
    }
    reverse() {
        return this.copy({x: -this.x, y: -this.y});
    }
    flipX() {
        return this.copy({x: -this.x});
    }
    resetX() {
        return this.copy({x: 0});
    }
    angle() {
        return Math.atan2(this.y, this.x);
    }
    length() {
        return Math.sqrt(this.x * this.x + this.y * this.y);
    }
    rotate(deltaAngle) {
        var angle = this.angle();
        var length = this.length();

        var newAngle = angle + deltaAngle;

        return new Vector2D(length * Math.cos(newAngle), length * Math.sin(newAngle));
    }
    reverseDirection(vector) {
        var angle2 = Math.atan2(vector.y, vector.x);
        return this.rotate(-angle2).flipX().rotate(angle2);
    }
    to(vector) {
        return new Vector2D(vector.x - this.x, vector.y - this.y);
    }
    subtract(vector) {
        return new Vector2D(this.x - vector.x, this.y - vector.y);
    }
}
class Line extends Entity {
    constructor(startPosition, endPosition, collision_direction, is_ground, is_tire) {
        super();
        this.startPosition = startPosition;
        this.endPosition = endPosition;
        this.collision_direction = collision_direction;
        this.is_ground = is_ground;
        this.is_tire = is_tire;
    }
    offset(vector) {
        return this.copy({startPosition: this.startPosition.addVector(vector), endPosition: this.endPosition.addVector(vector)});
    }
    rotate(angle) {
        return this.copy({startPosition: this.startPosition.rotate(angle), endPosition: this.endPosition.rotate(angle)});
    }
}
class PhysicalObject extends Entity {
    constructor(initialize) {
        super(initialize);
    }
    initialize() {
        this.position = new Vector2D(10, 20);
        this.velocity = new Vector2D(2, 0);
        this.angle = 0;
        this.angularVelocity = 0;
        this.mass = 1;
        this.lines = Immutable.List();
    }
    updated(time_unit) {
        var gravityVector = new Vector2D(0, 9.8);
        var air_drag_vector = this.velocity.multiply(0.3 * time_unit / 1000).reverse();
        return this.copy({
            position: this.position.addVector(this.velocity.multiply(time_unit * 1.0 / 1000)),
            velocity: this.velocity.addVector(gravityVector.multiply(time_unit * 1.0 / 1000)).addVector(air_drag_vector),
            angle: this.angle + this.angularVelocity});
    }
    draw(ctx) {
        var self = this;
        this.lines.forEach(line => {
            ctx.save();
            ctx.beginPath();
            if (line.is_tire) {
                ctx.strokeStyle = "gray";
            }
            var toDrawStartPosition = self.position.addVector(line.startPosition.rotate(self.angle));
            var toDrawEndPosition = self.position.addVector(line.endPosition.rotate(self.angle));
            ctx.moveTo(drawing_scale * toDrawStartPosition.x, drawing_scale * toDrawStartPosition.y);
            ctx.lineTo(drawing_scale * toDrawEndPosition.x, drawing_scale * toDrawEndPosition.y);
            ctx.stroke();

            ctx.beginPath();
            ctx.strokeStyle = "black";
            ctx.arc(drawing_scale * (self.position.x), drawing_scale * (self.position.y), 2, 0, 2 * Math.PI);
            ctx.stroke();

            ctx.beginPath();
            ctx.strokeStyle = "green";
            ctx.moveTo(drawing_scale * (self.position.x), drawing_scale * (self.position.y));
            ctx.lineTo(drawing_scale * (self.position.x + self.velocity.x), drawing_scale * (self.position.y + self.velocity.y));
            ctx.stroke();

            ctx.beginPath();
            ctx.strokeStyle = "orange";
            ctx.moveTo(drawing_scale * (self.position.x), drawing_scale * (self.position.y));
            ctx.lineTo(drawing_scale * (self.position.x + 200 * self.angularVelocity), drawing_scale * (self.position.y));
            ctx.stroke();
            ctx.restore();
        });
    }
    calculate_collision(other) {
        var intersection_exists = false;
        var intersection_result = null
        var selfLine = null;
        var otherLine = null;
        var self = this;
        this.lines.forEach(l1 => {
            other.lines.forEach(l2 => {
                intersection_result = is_intersecting(l1.rotate(self.angle).offset(self.position), l2.rotate(other.angle).offset(other.position));
                if (intersection_result["intersection_exists"]) {
                    intersection_exists = true;
                    selfLine = l1;
                    otherLine = l2;
                }
            })
        });

        if (intersection_exists) {
            return new Collision(selfLine, otherLine, intersection_result);
        } else return null;
    }
    collideAll(delta_position, delta_angle, game_set) {
        var self = this;
        var collidedRec = (delta_position_rec, delta_angle_rec, game_set_rec, remaining) => {
            if (remaining.size == 0) {
                var updated_self = game_set_rec.contents.get(self.id);
                return game_set_rec.replace_element(updated_self.move(delta_position_rec).rotate(delta_angle_rec));
            }

            var first_key = remaining.first();
            var first_object = game_set_rec.contents.get(first_key);
            var updated_self = game_set_rec.contents.get(self.id);

            var collision_result = updated_self.collide(delta_position_rec, delta_angle_rec, first_object, game_set_rec);
            var new_game_set = collision_result["game_set"];
            var new_delta_position = collision_result["delta_position"];
            var new_delta_angle = collision_result["delta_angle"];

            return collidedRec(new_delta_position, new_delta_angle, new_game_set, remaining.shift());
        }

        return collidedRec(delta_position, delta_angle, game_set.replace_element(this), game_set.contents.keySeq().filter(o => o != this.id).toList());
    }
    collide(delta_position, delta_angle, other, game_set) {
        var advanced_self = this.move(delta_position).rotate(delta_angle);

        var collision = advanced_self.calculate_collision(other);
        if (collision == null) return {"game_set": game_set.replace_element(this),
                                        "delta_position": delta_position,
                                        "delta_angle": delta_angle};

        if (collision.otherLine.is_ground) {
            return this.collide_ground(collision, game_set);
        }
        else {
            var directionAngle = advanced_self.position.to(other.position).angle();

            var self_velocity_rotated = advanced_self.velocity.rotate(-directionAngle);
            var other_velocity_rotated = other.velocity.rotate(-directionAngle);

            var new_self_velocity = (new Vector2D((self_velocity_rotated.x * (this.mass - other.mass) + 2 * other.mass * other_velocity_rotated.x) / (this.mass + other.mass), self_velocity_rotated.y)).rotate(directionAngle);
            var new_other_velocity = (new Vector2D((other_velocity_rotated.x * (other.mass - this.mass) + 2 * this.mass * self_velocity_rotated.x) / (this.mass + other.mass), other_velocity_rotated.y)).rotate(directionAngle);

            var new_self = this.copy({
                velocity: new_self_velocity,
                angularVelocity: 0
            });

            var new_other = other.copy({
                velocity: new_other_velocity,
                angularVelocity: 0
            });

            return {"game_set": game_set.replace_element(new_self).replace_element(new_other),
                    "collision": collision,
                    "delta_position": new Vector2D(0, 0),
                    "delta_angle": 0};
        }
    }
    move(vector) {
        return this.copy({position: this.position.addVector(vector)});
    }
    rotate(delta_angle) {
        return this.copy({angle: this.angle + delta_angle});
    }
}
class Collision extends Entity {
    constructor(selfLine, otherLine, intersection_result) {
        super();
        this.selfLine = selfLine;
        this.otherLine = otherLine;
        this.intersection_result = intersection_result;
    }
}
class Ball extends PhysicalObject {
    constructor(initialize) {
        super(initialize);
    }
    initialize() {
        super.initialize();
        this.position = new Vector2D(60, 70);
        this.velocity = new Vector2D(10, 0);
        this.radius = 10;
        this.mass = 1;
    }
    build_lines() {
        this.lines = [];
        var samples = 16;
        for (var s = 0; s < samples; s++) {
            var angle1 = s * 2 * Math.PI / samples;
            var angle2 = (s + 1) * 2 * Math.PI / samples;

            var startPosition = new Vector2D(this.radius * Math.cos(angle1), this.radius * Math.sin(angle1));
            var endPosition = new Vector2D(this.radius * Math.cos(angle2), this.radius * Math.sin(angle2));
            this.lines.push(new Line(startPosition, endPosition));
        }
    }
    updated(time_unit, game_set) {
        var advanced_ball = super.updated(time_unit);

        var advanced_ball_original_position = advanced_ball.copy({position: this.position, angle: this.angle});
        return advanced_ball_original_position.collideAll(advanced_ball.position.subtract(this.position), advanced_ball.angle - this.angle, game_set);
    }
    collide_ground(collision, game_set) {
        var elasticity = 0.8;
        var collided_self = this.copy({
            velocity: this.velocity.reverseDirection(collision.otherLine.collision_direction).multiply(elasticity),
            angularVelocity: 0});

        return {"game_set": game_set.replace_element(collided_self),
                "collision": collision,
                "delta_position": new Vector2D(0, 0),
                "delta_angle": 0};
    }
    draw(ctx) {
        ctx.save();
        if (debugging) {
            ctx.strokeStyle = "blue";
            super.draw(ctx);
        } else {
            var draw_circle = (radius_scale, color) => {
                ctx.fillStyle = color;
                var first = true;
                var self = this;

                ctx.beginPath();
                this.lines.forEach(line => {
                    var toDrawStartPosition = self.position.addVector(line.startPosition.multiply(radius_scale).rotate(self.angle));
                    var toDrawEndPosition = self.position.addVector(line.endPosition.multiply(radius_scale).rotate(self.angle));
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
class Car extends PhysicalObject {
    constructor(initialize) {
        super(initialize);
    }
    initialize() {
        super.initialize();
        this.position = new Vector2D(50, 90);
        this.mass = 10;
        this.flying_state = "flying";
        this.jump_state = "station";
    }
    build_lines() {
        var f = 3;
        // var points = [[20, 10], [20, 4], [-2, -7], [-20, -10], [-20, 10], [-19, 12], [-11, 12], [-10, 10], [10, 10], [11, 12], [19, 12]];
        // var tire =    [false,   false,   false,    false,      true,      true,      true,      false,     true,     true,     true];

        var points = [[20, 14], [20, 4], [-2, -7], [-20, -10], [-20, 14]];
        var tire =    [false,   false,   false,    false,      false];

        this.lines = [];
        for (var i = 0; i < points.length; i++) {
            var j = (i + 1) % points.length;
            var p1 = points[i];
            var p2 = points[j];
            this.lines.push(new Line(new Vector2D(p1[0]/f, p1[1]/f), new Vector2D(p2[0]/f, p2[1]/f), null, false, tire[i]));
        }

        this.nitro = new Vector2D(-20/f, 0);
        this.jumper = new Vector2D(0, 14/f);
    }
    updated(time_unit, game_set) {
        var advanced_car_gravity = super.updated(time_unit);

        var jumped_car = key_pressed["jump"] ?
                            (this.jump_state == "station" ?
                                advanced_car_gravity.copy({flying_state: "flying", jump_state: "jumping"}) :
                                advanced_car_gravity) :
                            (this.jump_state == "station" ?
                                advanced_car_gravity :
                                advanced_car_gravity.copy({jump_state: "station"}));

        var car_jumping = this.jump_state == "station" && jumped_car.jump_state == "jumping";
        var car_flying = this.flying_state == "flying";

        var nitroVector = this.nitro.normalize().multiply(key_pressed["up"]).rotate(this.angle).reverse().multiply(30);
        var jumpVector = this.jumper.normalize().multiply(car_jumping ? 1 : 0).rotate(this.angle).reverse().multiply(10);
        var angularForce = (key_pressed["left"] * -1 + key_pressed["right"]) * (car_flying ? 1 : 0);

        var advanced_car = jumped_car.copy({
            velocity: jumped_car.velocity.addVector(nitroVector.multiply(time_unit * 1.0 / 1000)).addVector(jumpVector),
            angularVelocity: jumped_car.angularVelocity + angularForce * 0.0006});

        var advanced_car_original_position = advanced_car.copy({position: this.position, angle: this.angle});
        return advanced_car_original_position.collideAll(advanced_car.position.subtract(this.position), advanced_car.angle - this.angle, game_set);
    }
    collide_ground(collision, game_set) {
        var elasticity = 0.6;
        var collision_angle = collision.otherLine.collision_direction.angle();
        var collided_self = null;
        if (collision.selfLine.is_tire && false) {
            collided_self = this.copy({
                velocity: this.velocity.rotate(collision_angle).resetX().rotate(-collision_angle),
                angle: collision_angle + Math.PI / 2,
                flying_state: "on_ground",
                angularVelocity: 0});
        } else {
            collided_self = this.copy({
                velocity: this.velocity.rotate(-collision_angle).multiplyX(-elasticity).rotate(collision_angle),
                angularVelocity: 0});
        }

        return {"game_set": game_set.replace_element(collided_self),
                "collision": collision,
                "delta_position": new Vector2D(0, 0),
                "delta_angle": 0};
    }
    draw(ctx) {
        var f = 3;
        ctx.save();
        if (debugging) {
            ctx.strokeStyle = "red";
            super.draw(ctx);

            ctx.fillStyle = "violet";
            var rotatedNitroPosition = this.position.addVector(this.nitro.rotate(this.angle));
            ctx.beginPath();
            ctx.arc(drawing_scale * rotatedNitroPosition.x, drawing_scale * rotatedNitroPosition.y, 6, 0, 2 * Math.PI);
            ctx.fill();


            ctx.fillStyle = this.jump_state == "station" ? "yellow" : "orange";
            var rotatedJumperPosition = this.position.addVector(this.jumper.rotate(this.angle));
            ctx.beginPath();
            ctx.arc(drawing_scale * rotatedJumperPosition.x, drawing_scale * rotatedJumperPosition.y, 6, 0, 2 * Math.PI);
            ctx.fill();
        } else {
            var line_to = (x, y) => {
                var vector = this.position.addVector((new Vector2D(x/f, y/f)).rotate(this.angle));
                return ctx.lineTo(drawing_scale * vector.x, drawing_scale * vector.y);
            }
            var move_to = (x, y) => {
                var vector = this.position.addVector((new Vector2D(x/f, y/f)).rotate(this.angle));
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

            var draw_tire = (x, y) => {
                ctx.fillStyle = "gray";
                var w1 = this.position.addVector((new Vector2D(x/f, y/f)).rotate(this.angle));
                ctx.beginPath();
                ctx.arc(drawing_scale * w1.x, drawing_scale * w1.y, 11, 0, 2 * Math.PI);
                ctx.fill();

                ctx.fillStyle = "lightgray";
                var w1 = this.position.addVector((new Vector2D(x/f, y/f)).rotate(this.angle));
                ctx.beginPath();
                ctx.arc(drawing_scale * w1.x, drawing_scale * w1.y, 7, 0, 2 * Math.PI);
                ctx.fill();

                ctx.fillStyle = "black";
                var w1 = this.position.addVector((new Vector2D(x/f, y/f)).rotate(this.angle));
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
class Ground extends PhysicalObject {
    constructor(initialize) {
        super(initialize);
        this.position = new Vector2D(0, 0);
        this.lines = [
            new Line(new Vector2D(0, 100), new Vector2D(200, 100), new Vector2D(0, -1), true),
            new Line(new Vector2D(0, 0), new Vector2D(0, 100), new Vector2D(1, 0), true),
            new Line(new Vector2D(200, 0), new Vector2D(200, 100), new Vector2D(-1, 0), true)];
    }
    collisionDirection() {
        return new Vector2D(0, -1);
    }
    updated(time_unit, game_set) {
        return game_set;
    }
}
class GameSet extends Entity {
    constructor(initialize) {
        super(initialize);
    }
    initialize() {
        var my_car = new Car(initialize = true);
        var ground = new Ground(initialize = true);
        var ball = new Ball(initialize = true);

        my_car.build_lines();
        ball.build_lines();

        this.contents = Immutable.Map();
        this.contents = this.contents.set(my_car.id, my_car);
        this.contents = this.contents.set(ground.id, ground);
        this.contents = this.contents.set(ball.id, ball);

        this.ground_id = ground.id;
    }
    updated(time_unit) {
        var updatedRec = (game_set, remaining) => {
            if (remaining.size == 0) return game_set;

            var first_key = remaining.first();
            var first_object = game_set.contents.get(first_key);

            var new_game_set = first_object.updated(time_unit, game_set);
            return updatedRec(new_game_set, remaining.shift());
        }

        return updatedRec(this, this.contents.keySeq().filter(o => o != this.ground_id).toList());
        // return this.copy({my_car: this.my_car.updated(time_unit, this), ball: this.ball.updated(time_unit, this)});
    }
    draw(ctx) {
        this.contents.valueSeq().forEach(o => o.draw(ctx));
        // this.my_car.draw(ctx);
        // this.ball.draw(ctx);
        // this.ground.draw(ctx);
    }
    replace_element(element) {
        return this.copy({"contents": this.contents.set(element.id, element)});
    }
}
