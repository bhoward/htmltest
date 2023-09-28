const BALL_RADIUS = 1;
const DEFAULT_FRICTION = 1; // TODO

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
            return [p1, v];
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

                return [vectorPlus(p, rrest), rv];
            }
        }

        return [p1, v];
    }
}

// Also check for distToSegment for each
// endpoint of wall being less than ball radius

// If collision, update p1 and v

// A point obstruction where the ball will collide if it
// comes within the ball's radius of the given point
class PointWall {
    constructor(p) {
        this.p = p;
    }

    collide(p0, p1, v) {
        // TODO
        return [p1, v];
    }
}

class Boundary {
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
}

class Obstacle {
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
}

class OneWay {
    constructor(p, q) {
        this.walls = [
            new PointWall(p),
            new LineWall(p, q),
            new PointWall(q),
        ];
    }

    wallsAt(t) {
        return this.walls;
    }
}

// TODO add rendering for obstacles

// TODO add moving obstacles

const hole1 = {
    "name": "Hole 1",
    "background": "hole1.png",
    "tee": [10, 10],
    "goal": [90, 90],
    "goalRadius": 2,
    "obstacles": [
        new Boundary([0, 0], [100, 0], [100, 100], [0, 100]),
    ],
    "surface": (p) => {
        return {
            "friction": DEFAULT_FRICTION,
            "gravity": [0, 0],
        };
    },
};

const course = [hole1];

class State {
    constructor(hole, clockt) {
        this.hole = hole;
        this.ball = hole.tee;
        this.velocity = [0, 0];
        this.shots = 0;
        this.done = false;
        this.tinit = clockt;
        this.t = 0;
    }

    render(canvas, clockt) {
        // TODO
        console.log(this);
    }

    hit(v) {
        this.velocity = v;
        this.shots++;
    }

    step(clockt) {
        if (this.done) return;
    
        const currt = clockt - this.tinit;
        const dt = currt - this.t;
        const p0 = this.ball;

        // compute properties of surface at ball position
        const surf = this.hole.surface(p0);
    
        const reducedSpeed = Math.max(0, vectorLen(this.velocity) - surf.friction * dt);
        const reducedV = scalarTimes(reducedSpeed, vectorUnit(this.velocity));
    
        // compute one time step of velocity and position
        let v = vectorPlus(reducedV, scalarTimes(dt, surf.gravity));
        let p1 = vectorPlus(p0, scalarTimes(dt, v));

        const d = vectorMinus(p1, p0);        
        const distTravelled = vectorLen(d);
    
        if (distTravelled > 0) {
            // check for collisions with walls
            for (const obstacle of this.hole.obstacles) {
                // allow for wall positions to depend on time
                const walls = obstacle.wallsAt(currt);
    
                for (const wall of walls) {
                    [p1, v] = wall.collide(p0, p1, v);
                }
            }
    
            // check for reaching goal
            const minGoalDist = distToSegment(this.hole.goal, p0, p1);
    
            if (minGoalDist < this.hole.goalRadius - BALL_RADIUS) {
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

// Based on https://stackoverflow.com/questions/849211/shortest-distance-between-a-point-and-a-line-segment
function distToSegment(p, v, w) {
    const d = vectorMinus(w, v);
    const len = vectorLen(d);

    if (len == 0) return vectorLen(vectorMinus(p, v));

    let t = vectorDot(vectorMinus(p, v), d) / (len * len);
    t = Math.max(0, Math.min(1, t));

    const q = vectorPlus(v, scalarTimes(t, d));
    return vectorLen(vectorMinus(p, q));
}

function intersect(p0, p1, q0, q1) {
    return -1; // TODO
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

function demo(hole, v = [10, 10]) {
    let state = new State(hole, clockTime());
    let canvas = {}; // TODO

    state.render(canvas, clockTime());

    state.hit(v);

    const id = setInterval(() => {
        state.step(clockTime());
        state.render(canvas, clockTime());
    }, 1000);

    setTimeout(() => {
        clearInterval(id);
        console.log("Done");
    }, 30000);
}