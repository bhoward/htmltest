const BALL_RADIUS = 4;
const DEFAULT_FRICTION = 1;
const VIEW_WIDTH = 160;
const VIEW_HEIGHT = 90;

// TODO:
// * moving obstacles
// * move to next hole after completion
// * choose between 1st & 3rd person view

// A wall from p to q, where the ball will collide if it approaches
// from the clockwise side of the line
class LineWall {
    constructor(p, q) {
        // Compute actual boundary line for intersection
        const n = scalarTimes(BALL_RADIUS, vectorNormal(vectorMinus(q, p)));
        this.w0 = vectorPlus(p, n);
        this.w1 = vectorPlus(q, n);
    }

    collide(p0, p1, v) {
        // Check for parallel lines or crossing from counter-clockwise side
        const dp = vectorMinus(p1, p0);
        const dw = vectorMinus(this.w1, this.w0);
        if (vectorCross(dp, dw) <= 0) {
            return [p1, v, false];
        }

        // Find where ball path crosses wall line
        const t = intersect(p0, p1, this.w0, this.w1);
        if (0 <= t && t <= 1) {
            // Check whether ball path crosses between wall ends
            const u = intersect(this.w0, this.w1, p0, p1);
            if (0 <= u && u <= 1) {
                // Find actual intersection point
                const p = vectorPlus(p0, scalarTimes(t, dp));

                // Reflect rest of ball path and v
                const prest = vectorMinus(p1, p);
                const n = vectorNormal(dw);
                const rrest = vectorMinus(prest, scalarTimes(2 * vectorDot(prest, n), n));
                const rv = vectorMinus(v, scalarTimes(2 * vectorDot(v, n), n));

                return [vectorPlus(p, rrest), rv, true];
            }
        }

        return [p1, v, false];
    }
}

// A point obstruction where the ball will collide if it
// comes within the ball's radius of the given point
class PointWall {
    constructor(p) {
        this.p = p;
    }

    collide(p0, p1, v) {
        if (distToSegment(p0, p1, this.p) <= BALL_RADIUS) {
            const t = intersectCircle(p0, p1, this.p, BALL_RADIUS);
            const q = vectorPlus(p0, scalarTimes(t, vectorMinus(p1, p0)));

            // Reflect rest of ball path and v
            const prest = vectorMinus(p1, q);
            const n = vectorUnit(vectorMinus(q, this.p));
            const rrest = vectorMinus(prest, scalarTimes(2 * vectorDot(prest, n), n));
            const rv = vectorMinus(v, scalarTimes(2 * vectorDot(v, n), n));

            return [vectorPlus(q, rrest), rv, true];
       }

        return [p1, v, false];
    }
}

class Boundary {
    // List the vertices in clockwise order
    constructor(...vertices) {
        this.vertices = vertices;
        this.walls = [];
        const n = vertices.length;
        for (let i = 0; i < n; i++) {
            const j = (i + 1) % n;
            this.walls.push(new LineWall(vertices[i], vertices[j]));
            this.walls.push(new PointWall(vertices[i]));
        }
    }

    wallsAt(t) {
        return this.walls;
    }

    render(ctx) {
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(...this.vertices[0]);
        const n = this.vertices.length;
        for (let i = 1; i < n; i++) {
            ctx.lineTo(...this.vertices[i]);
        }
        ctx.closePath();
        ctx.clip();

        ctx.lineWidth = 3;
        ctx.lineJoin = "round";
        ctx.strokeStyle = "rgba(0, 255, 0, 0.5)";
        ctx.stroke();

        ctx.lineWidth = 1;
        ctx.strokeStyle = "black";
        ctx.stroke();

        ctx.restore();
    }
}

class Obstacle {
    // List the vertices in counter-clockwise order
    constructor(...vertices) {
        this.vertices = vertices;
        this.walls = [];
        const n = vertices.length;
        for (let i = 0; i < n; i++) {
            const j = (i + 1) % n;
            this.walls.push(new LineWall(vertices[i], vertices[j]));
            this.walls.push(new PointWall(vertices[i]));
        }
    }

    wallsAt(t) {
        return this.walls;
    }

    render(ctx, hole) {
        ctx.save();
        
        ctx.beginPath();
        ctx.moveTo(...this.vertices[0]);
        const n = this.vertices.length;
        for (let i = 1; i < n; i++) {
            ctx.lineTo(...this.vertices[i]);
        }
        ctx.closePath();

        ctx.lineWidth = 3;
        ctx.lineJoin = "round";
        ctx.strokeStyle = "rgba(0, 255, 0, 0.5)";
        ctx.stroke();

        ctx.lineWidth = 1;
        ctx.strokeStyle = "black";
        ctx.stroke();

        ctx.clip();
        ctx.drawImage(hole.background, 0, 0, VIEW_WIDTH, VIEW_HEIGHT);

        ctx.restore();
    }
}

class OneWay {
    constructor(p, q) {
        this.p = p;
        this.q = q;
        this.walls = [
            new PointWall(p),
            new LineWall(p, q),
            new PointWall(q),
        ];
    }

    wallsAt(t) {
        return this.walls;
    }

    render(ctx) {
        ctx.save();

        const n = scalarTimes(10, vectorNormal(vectorMinus(this.q, this.p)));
        const p2 = vectorPlus(this.p, n);
        const q2 = vectorPlus(this.q, n);

        ctx.beginPath();
        ctx.moveTo(...this.p);
        ctx.lineTo(...this.q);
        ctx.lineTo(...q2);
        ctx.lineTo(...p2);
        ctx.closePath();
        ctx.clip();

        ctx.beginPath();
        ctx.moveTo(...this.p);
        ctx.lineTo(...this.q);
        
        ctx.lineWidth = 3;
        ctx.lineCap = "round";
        ctx.strokeStyle = "rgba(0, 255, 0, 0.5)";
        ctx.stroke();

        ctx.lineWidth = 1;
        ctx.strokeStyle = "black";
        ctx.stroke();

        ctx.restore();
    }
}

const hole1Img = new Image();
hole1Img.src = "hole1.png";
const ballImg = new Image();
ballImg.src = "ball.png";

const puttSound = new Audio("putt.mp3");
const sinkSound = new Audio("sink.mp3");

const hole1 = {
    "name": "Hole 1",
    "background": hole1Img,
    "tee": [10, 10],
    "goal": [150, 80],
    "goalRadius": 5,
    "obstacles": [
        new Boundary([0, 0], [160, 0], [160, 90], [0, 90]),
    ],
    "surface": (p) => {
        return {
            "friction": DEFAULT_FRICTION,
            "gravity": [0.5, 0],
        };
    },
};

const hole2 = {
    "name": "Hole 2",
    "background": hole1Img,
    "tee": [10, 10],
    "goal": [150, 80],
    "goalRadius": 5,
    "obstacles": [
        new Boundary([0, 0], [160, 0], [160, 90], [0, 90]),
        new OneWay([50, 0], [50, 100]),
    ],
    "surface": (p) => {
        return {
            "friction": DEFAULT_FRICTION,
            "gravity": [0, 0],
        };
    },
};

const hole3 = {
    "name": "Hole 3",
    "background": hole1Img,
    "tee": [10, 10],
    "goal": [150, 80],
    "goalRadius": 5,
    "obstacles": [
        new Boundary([0, 0], [160, 0], [160, 90], [0, 90]),
        new OneWay([50, 100], [50, 0]),
    ],
    "surface": (p) => {
        return {
            "friction": DEFAULT_FRICTION,
            "gravity": [0, 0],
        };
    },
};

const hole4 = {
    "name": "Hole 4",
    "background": hole1Img,
    "tee": [10, 10],
    "goal": [150, 80],
    "goalRadius": 5,
    "obstacles": [
        new Boundary([0, 0], [160, 0], [160, 90], [0, 90]),
        new Obstacle([50, 50], [50, 75], [75, 75], [75, 50]),
    ],
    "surface": (p) => {
        return {
            "friction": DEFAULT_FRICTION,
            "gravity": [0, 0],
        };
    },
};

const course = [hole1, hole2, hole3, hole4];

class State {
    constructor(hole) {
        this.hole = hole;
        this.ball = hole.tee;
        this.velocity = [0, 0];
        this.shots = 0;
        this.done = false;
        this.tinit = clockTime();
        this.t = 0;
    }

    render(canvas) {
        const currt = clockTime() - this.tinit;

        const ctx = canvas.getContext("2d");
        ctx.reset();
        ctx.scale(canvas.width / VIEW_WIDTH, canvas.height / VIEW_HEIGHT);

        ctx.clearRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
        ctx.drawImage(this.hole.background, 0, 0, VIEW_WIDTH, VIEW_HEIGHT);

        const [tx, ty] = this.hole.tee;
        const tr = BALL_RADIUS / 2;
        ctx.fillStyle = "white";
        ctx.beginPath();
        ctx.ellipse(tx, ty, tr, tr, 0, 0, 2 * Math.PI);
        ctx.fill();

        const [gx, gy] = this.hole.goal;
        const gr = this.hole.goalRadius;
        ctx.fillStyle = "black";
        ctx.beginPath();
        ctx.ellipse(gx, gy, gr, gr, 0, 0, 2 * Math.PI);
        ctx.fill();

        for (const obstacle of this.hole.obstacles) {
            obstacle.render(ctx, this.hole, currt);
        }

        const status = this.hole.name + " -- Shots: " + this.shots;
        ctx.font = "8px sans-serif";
        const metrics = ctx.measureText(status);
        const textLeft = 20;
        const textBase = 10;

        ctx.fillStyle = "rgba(128, 128, 128, 0.8)";
        ctx.fillRect(textLeft - 1, textBase - metrics.fontBoundingBoxAscent - 1,
            metrics.width + 2, metrics.fontBoundingBoxAscent + metrics.fontBoundingBoxDescent + 2);

        ctx.fillStyle = "orange";
        ctx.fillText(status, textLeft, textBase);
        // TODO show hole name, number of shots, completion

        const [bx, by] = this.ball;
        ctx.drawImage(ballImg, bx - BALL_RADIUS, by - BALL_RADIUS, BALL_RADIUS * 2, BALL_RADIUS * 2);
    }

    hit(v) {
        this.velocity = v;
        this.shots++;
        puttSound.play();
    }

    step() {
        if (this.done) return;
    
        const currt = clockTime() - this.tinit;
        const dt = currt - this.t;
        const p0 = this.ball;

        // compute properties of surface at ball position
        const surf = this.hole.surface(p0);
    
        // compute one time step of acceleration due to gravity
        let v = vectorPlus(this.velocity, scalarTimes(dt, surf.gravity));
        
        // modify velocity due to friction
        const reducedSpeed = Math.max(0, vectorLen(v) - surf.friction * dt);
        v = scalarTimes(reducedSpeed, vectorUnit(v));
    
        // compute one time step of velocity and position
        let p1 = vectorPlus(p0, scalarTimes(dt, v));

        const d = vectorMinus(p1, p0);        
        const distTravelled = vectorLen(d);
    
        if (distTravelled > 0) {
            // check for collisions with walls
            for (const obstacle of this.hole.obstacles) {
                // allow for wall positions to depend on time
                const walls = obstacle.wallsAt(currt);
    
                for (const wall of walls) {
                    let collision = false;
                    [p1, v, collision] = wall.collide(p0, p1, v);
                    if (collision) {
                        puttSound.play();
                    }
                }
            }
    
            // check for reaching goal
            const minGoalDist = distToSegment(p0, p1, this.hole.goal);
    
            if (minGoalDist < this.hole.goalRadius) {
                sinkSound.play();
                this.ball = this.hole.goal;
                this.velocity = [0, 0];
                this.t = currt;
                this.done = true;
                return;
            }
        }
    
        this.ball = p1;
        this.velocity = v;
        this.t = currt;
    }
}

// Based on https://stackoverflow.com/questions/849211/
function distToSegment(p0, p1, q) {
    const d = vectorMinus(p1, p0);
    const len = vectorLen(d);

    if (len == 0) return vectorLen(vectorMinus(q, p0));

    let t = vectorDot(vectorMinus(q, p0), d) / (len * len);
    t = Math.max(0, Math.min(1, t));

    const v = vectorPlus(p0, scalarTimes(t, d));
    return vectorLen(vectorMinus(q, v));
}

// Based on https://stackoverflow.com/questions/563198/
// Returns t such that p0 + t * p1 is a point on the line through q0 and q1
// Precondition: have already checked that the lines intersect (p x q != 0)
function intersect(p0, p1, q0, q1) {
    const r = vectorMinus(p1, p0);
    const s = vectorMinus(q1, q0);
    return vectorCross(vectorMinus(q0, p0), s) / vectorCross(r, s);
}

// Based on https://math.stackexchange.com/questions/311921/
// Returns t such that p0 + t * p1 is the first intersection point on the
// circle with center q and radius r
// Precondition: there actually is an intersection point
function intersectCircle(p0, p1, q, r) {
    const d = vectorMinus(p1, p0);
    const v = vectorMinus(p0, q);

    // Equation: at^2 + 2bt + c = 0
    const a = vectorDot(d, d);
    const b = vectorDot(v, d);
    const c = vectorDot(v, v) - r * r;

    return (-b - Math.sqrt(b * b - a * c)) / a;
}

function vectorPlus([vx, vy], [wx, wy]) {
    return [vx + wx, vy + wy];
}

function vectorMinus([vx, vy], [wx, wy]) {
    return [vx - wx, vy - wy];
}

function vectorLen([vx, vy]) {
    return Math.hypot(vx, vy);
}

function vectorAngle([vx, vy]) {
    return Math.atan2(vy, vx);
}

function vectorUnit(v) {
    // Using theta avoids singularity when v is zero
    const theta = vectorAngle(v);
    return [Math.cos(theta), Math.sin(theta)];
}

function vectorNormal([vx, vy]) {
    const len = vectorLen([vx, vy]);
    return [-vy / len, vx / len];
}

function vectorDot([vx, vy], [wx, wy]) {
    return vx * wx + vy * wy;
}

function vectorCross([vx, vy], [wx, wy]) {
    return vx * wy - vy * wx;
}

function scalarTimes(s, [vx, vy]) {
    return [s * vx, s * vy];
}

function clockTime() {
    return Date.now() / 1000;
}
