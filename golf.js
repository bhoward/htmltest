const BALL_RADIUS = 1;
const DEFAULT_FRICTION = 1; // TODO

// A wall from p to q, where the ball will collide if it approaches
// from the clockwise side of the line
class LineWall {
    constructor(p, q) {
        // Compute actual boundary line for intersection
        const [px, py] = p;
        const [qx, qy] = q;
        const dx = qx - px;
        const dy = qy - py;
        const len = Math.hypot(dx, dy);
        const nx = -BALL_RADIUS * dy / len;
        const ny = BALL_RADIUS * dx / len;

        this.w0 = [px + nx, py + ny];
        this.w1 = [qx + nx, qy + ny];
    }

    collide(p0, p1, v) {
        // TODO
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

// TODO add rendering for obstacles

// TODO add polygonal obstacles -- same as Boundary, but points
// are given counter-clockwise and they render as filled-in

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

function init(hole, clockt) {
    return {
        "hole": hole,
        "ball": hole.tee,
        "velocity": [0, 0],
        "shots": 0,
        "done": false,
        "tinit": clockt,
        "t": 0
    };
};

function render(state, canvas, clockt) {
    // do stuff with state.hole, state.ball, etc., on the canvas
    console.log(state);
};

function hit(state, v) {
    return {
        ...state,
        "velocity": v,
        "shots": state.shots + 1,
    };
};

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

function step(state, clockt) {
    if (state.done) return state;

    const currt = clockt - state.tinit;
    const dt = currt - state.t;
    const [x0, y0] = state.ball;
    const [vx0, vy0] = state.velocity;
    const theta = Math.atan2(vy0, vx0);
    const speed = Math.hypot(vy0, vx0);

    // compute properties of surface at ball position
    const surf = state.hole.surface(x0, y0);
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
        for (const obstacle of state.hole.obstacles) {
            // allow for wall positions to depend on time
            const walls = obstacle.wallsAt(currt);

            for (const wall of walls) {
                [[x1, y1], [vx, vy]] = wall.collide([x0, y0], [x1, y1], [vx, vy]);
            }
        }

        // check for reaching goal
        const minGoalDist = distToSegment(state.hole.goal, [x0, y0], [x1, y1]);

        if (minGoalDist < state.hole.goalRadius - BALL_RADIUS) {
            return {
                ...state,
                "ball": state.hole.goal,
                "velocity": [0, 0],
                "t": currt,
                "done": true,
            };
        }
    }

    return {
        ...state,
        "ball": [x1, y1],
        "velocity": [vx, vy],
        "t": currt,
    };
};

function demo(hole, v = [10, 10]) {
    let state = init(hole, Date.now() / 1000);
    let canvas = {};

    render(state, canvas);

    state = hit(state, v);

    const id = setInterval(() => {
        state = step(state, Date.now() / 1000);
        render(state, canvas);
    }, 1000);

    setTimeout(() => {
        clearInterval(id);
        console.log("Done");
    }, 30000);
}