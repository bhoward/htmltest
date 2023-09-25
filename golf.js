function Boundary(...vertices) {
    let n = vertices.length;
    let walls = vertices.map((v, i) => [v, vertices[(i + 1) % n]]);
    return {
        "wallsAt": (t) => {
            return walls;
        },
    };
}

const hole1 = {
    "name": "Hole 1",
    "background": "hole1.png",
    "tee": [10, 10],
    "ballRadius": 1,
    "goal": [90, 90],
    "goalRadius": 2,
    "obstacles": [
        Boundary([0, 0], [0, 100], [100, 100], [100, 0]),
    ],
    "surface": (x, y) => {
        return {
            "friction": 1,
            "gravity": [0, 0],
        };
    },
};

const course = [hole1];

function init(hole, t) {
    return {
        "hole": hole,
        "ball": hole.tee,
        "velocity": [0, 0],
        "shots": 0,
        "done": false,
        "t": t,
    };
};

function render(state, canvas) {
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

function step(state, t) {
    if (state.done) return state;

    const dt = t - state.t;
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
            const walls = obstacle.wallsAt(t);
            for (const wall of walls) {
                // TODO
                console.log(wall);
            }
        }

        // check for reaching goal
        const [xg, yg] = state.hole.goal;
        // TODO need distance from line _segment_, not from entire line
        const minGoalDist = Math.abs(dx * (yg - y0) - dy * (xg - x0)) / distTravelled;
        console.log(minGoalDist);
        if (minGoalDist < state.hole.goalRadius - state.hole.ballRadius) {
            return {
                ...state,
                "ball": [xg, yg],
                "velocity": [0, 0],
                "t": t,
                "done": true,
            };
        }
    }

    return {
        ...state,
        "ball": [x1, y1],
        "velocity": [vx, vy],
        "t": t,
    };
};

function demo(hole) {
    let state = init(hole, Date.now() / 1000);
    let canvas = {};

    render(state, canvas);

    state = hit(state, [10, 10]);

    const id = setInterval(() => {
        state = step(state, Date.now() / 1000);
        render(state, canvas);
    }, 1000);

    setTimeout(() => {
        clearInterval(id);
        console.log("Done");
    }, 30000);
}