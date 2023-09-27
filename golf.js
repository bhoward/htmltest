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
        // const [px, py] = p;
        // const [qx, qy] = q;
        // const dx = qx - px;
        // const dy = qy - py;
        // const len = Math.hypot(dx, dy);
        // const nx = -BALL_RADIUS * dy / len;
        // const ny = BALL_RADIUS * dx / len;

        // this.w0 = [px + nx, py + ny];
        // this.w1 = [qx + nx, qy + ny];
    }

    collide(p0, p1, v) {
        // Check for parallel lines or crossing from counter-clockwise side
        const dp = vectorMinus(p1, p0);
        const dw = vectorMinus(w1, w0);
        if (vectorCross(dp, dw) <= 0) {
            return [p1, v];
        }

        // Find where ball path crosses wall line
        const t = intersect(p0, p1, w0, w1);
        if (0 <= t && t <= 1) {
            // Check whether ball path crosses between wall ends
            const u = intersect(w0, w1, p0, p1);
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
// Check for intersection of p0--p1 with
// wall shifted out by ball radius; is p0
// on far side?

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
        new Boundary([0, 0], [0, 100], [100, 100], [100, 0]),
    ],
    "surface": (x, y) => {
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
        const [x0, y0] = this.ball;
        const [vx0, vy0] = this.velocity;
        const theta = Math.atan2(vy0, vx0);
        const speed = Math.hypot(vy0, vx0);
    
        // compute properties of surface at ball position
        const surf = this.hole.surface(x0, y0);
        const friction = surf.friction;
        const [gx, gy] = surf.gravity;
    
        let reducedSpeed = speed - friction * dt;
        if (reducedSpeed < 0) reducedSpeed = 0;
    
        // compute one time step of velocity and position
        let vx = reducedSpeed * Math.cos(theta) + gx * dt;
        let vy = reducedSpeed * Math.sin(theta) + gy * dt;
        let [x1, y1] = [x0 + vx * dt, y0 + vy * dt];
        
        const dx = x1 - x0;
        const dy = y1 - y0;
        const distTravelled = Math.hypot(dx, dy);
    
        if (distTravelled > 0) {
            // check for collisions with walls
            for (const obstacle of this.hole.obstacles) {
                // allow for wall positions to depend on time
                const walls = obstacle.wallsAt(currt);
    
                for (const wall of walls) {
                    [[x1, y1], [vx, vy]] = wall.collide([x0, y0], [x1, y1], [vx, vy]);
                }
            }
    
            // check for reaching goal
            const minGoalDist = distToSegment(this.hole.goal, [x0, y0], [x1, y1]);
    
            if (minGoalDist < this.hole.goalRadius - BALL_RADIUS) {
                this.ball = this.hole.goal;
                this.velocity = [0, 0];
                this.t = currt;
                this.done = true;
                return;
            }
        }
    
        this.ball = [x1, y1];
        this.velocity = [vx, vy];
        this.t = currt;
    }
}

// Based on https://stackoverflow.com/questions/849211/shortest-distance-between-a-point-and-a-line-segment
function distToSegment([px, py], [vx, vy], [wx, wy]) {
    const dx = wx - vx;
    const dy = wy - vy;
    const len = Math.hypot(dx, dy);
    
    if (len == 0) return Math.hypot(px - vx, py - vy);

    let t = ((px - vx) * dx + (py - vy) * dy) / (len * len);
    t = Math.max(0, Math.min(1, t));

    const qx = vx + t * dx;
    const qy = vy + t * dy;
    return Math.hypot(px - qx, py - qy);
}

function intersect(p0, p1, q0, q1) {
    return 0; // TODO
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