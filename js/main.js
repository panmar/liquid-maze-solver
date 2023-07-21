const WALL_CELL = 0;
const EMPTY_CELL = 1;
const CELL_RADIUS = 20;
const LIQUID_RADIUS = 6;
const MAX_SPAWN_COUNT = 2000;
const SPAWN_TIMER = 0.075;
const PATH_TIMER = 1.0;

const generate_maze = (width, height) => {
    let maze = [];
    for (let i = 0; i < width; ++i) {
        maze.push([]);
        for (let j = 0; j < height; ++j) {
            maze[i].push(EMPTY_CELL);
        }
    }

    for (let i = 0; i < width; ++i) {
        maze[i][0] = WALL_CELL;
        maze[i][height - 1] = WALL_CELL;
    }

    for (let i = 0; i < height; ++i) {
        maze[0][i] = WALL_CELL;
        maze[width - 1][i] = WALL_CELL;
    }

    maze[1][0] = EMPTY_CELL;
    maze[width - 2][height - 1] = EMPTY_CELL;

    const maxWallCells = 0.3 * width * height;
    let wallCells = 0;
    const maxTries = 1000;
    let tries = 0;
    while (wallCells < maxWallCells && tries++ < maxTries) {
        let x = Math.floor(Math.random() * (width - 2)) + 1;
        let y = Math.floor(Math.random() * (height - 2)) + 1;
        if (maze[x][y] !== EMPTY_CELL) {
            continue;
        }

        maze[x][y] = WALL_CELL;

        if (!exist_path(maze, 1, 0, width - 2, height - 1)) {
            maze[x][y] = EMPTY_CELL;
            continue;
        }

        ++wallCells;
    }

    return maze;
}

const exist_path = (maze, startX, startY, endX, endY) => {
    return dfs(maze, startX, startY, endX, endY, []);
}

const dfs = (maze, startX, startY, endX, endY, visited) => {
    if ((startX === endX) && (startY === endY)) {
        return true;
    }

    if (visited.find(p => (p.x === startX) && (p.y === startY))) {
        return false;
    }

    if (maze[startX][startY] === WALL_CELL) {
        return false;
    }

    visited.push(new Point(startX, startY));

    const points = [];
    if (maze[startX - 1][startY] === EMPTY_CELL) { points.push(new Point(startX - 1, startY)) }
    if (maze[startX][startY + 1] === EMPTY_CELL) { points.push(new Point(startX, startY + 1)) }
    if (maze[startX + 1][startY] === EMPTY_CELL) { points.push(new Point(startX + 1, startY)) }
    if (maze[startX][startY - 1] === EMPTY_CELL) { points.push(new Point(startX, startY - 1)) }

    for (const p of points) {
        if (dfs(maze, p.x, p.y, endX, endY, visited)) {
            return true;
        }
    }

    return false;
}

const app = () => {

    {
        const canvasElement = document.querySelector("#canvas");
        console.log(`W = ${canvasElement.offsetWidth}, H = ${canvasElement.offsetHeight}`);
        let canvas = document.querySelector("canvas");
        let ctx = canvas.getContext("2d");
        ctx.canvas.width = canvasElement.offsetWidth;
        ctx.canvas.height = canvasElement.offsetHeight;
    }

    const canvasElement = document.querySelector("#canvas");
    const width = canvasElement.offsetWidth;
    const height = canvasElement.offsetHeight;

    const static_diameter = 2 * CELL_RADIUS;
    const width_cells = Math.floor(width / static_diameter) - 2;
    const height_cells = Math.floor(height / static_diameter) - 2;
    const maze = generate_maze(width_cells, height_cells);

    let world = new World();

    {
        for (let x = 0; x < maze.length; ++x) {
            for (let y = 0; y < maze[0].length; ++y) {
                if (maze[x][y] === EMPTY_CELL) {
                    continue;
                }

                const x_offset = (width - width_cells * 2 * CELL_RADIUS + 2 * CELL_RADIUS) / 2.0;
                const y_offset = (height - height_cells * 2 * CELL_RADIUS + 2 * CELL_RADIUS) / 2.0;
                const center = new Point(x_offset + x * 2 * CELL_RADIUS, y_offset + y * 2 * CELL_RADIUS);
                let circle = Circle.createStatic(center, CELL_RADIUS);
                world.circles.push(circle);

                // We do not support squares, so lets simulate square with circles
                {
                    let t = 7.0 * CELL_RADIUS / 10;
                    let c1 = Circle.createStatic(center.add(new Point(t, t)), CELL_RADIUS / 2.5);
                    let c2 = Circle.createStatic(center.add(new Point(-t, t)), CELL_RADIUS / 2.5);
                    let c3 = Circle.createStatic(center.add(new Point(t, -t)), CELL_RADIUS / 2.5);
                    let c4 = Circle.createStatic(center.add(new Point(-t, -t)), CELL_RADIUS / 2.5);
                    world.circles.push(c1);
                    world.circles.push(c2);
                    world.circles.push(c3);
                    world.circles.push(c4);
                }
            }
        }
    }

    const fps = 30;
    let frameInfo = { spawnTimer: 0.0, spawnCount: 0, pathTimer: 0.0 };
    setInterval(() => {
        update(world, 1.0 / 30, frameInfo);
        render(world);
    }, 1000 * (1.0 / 30));
}

function update(world, elapsedSeconds, frameInfo) {
    let startTime = new Date();

    frameInfo.spawnTimer += elapsedSeconds;
    frameInfo.pathTimer += elapsedSeconds;

    if ((frameInfo.spawnTimer > SPAWN_TIMER) && (frameInfo.spawnCount < MAX_SPAWN_COUNT)) {
        world.circles.push(new Circle(new Point(6 * CELL_RADIUS, 2 * CELL_RADIUS), LIQUID_RADIUS));
        frameInfo.spawnTimer = 0.0;
        ++frameInfo.spawnCount;
    }

    if (frameInfo.pathTimer > PATH_TIMER) {
        for (c of world.circles) {
            if (c.static) {
                continue;
            }
            c.path.push(Point.from(c.center));
        }

        frameInfo.pathTimer = 0.0
    }

    for (c of world.circles) {
        c.acceleration = c.acceleration.add(new Point(0.0, 100.0));
    }

    const substeps = 2;
    for (let s = 0; s < substeps; ++s) {
        for (let i = 0; i < world.circles.length; ++i) {
            for (let j = i + 1; j < world.circles.length; ++j) {
                let c1 = world.circles[i];
                let c2 = world.circles[j];

                if (c1.static && c2.static) {
                    continue;
                }

                if (c2.static) {
                    [c1, c2] = [c2, c1];
                }

                const dist = c1.center.distance(c2.center)
                const delta = c1.radius + c2.radius - dist;
                if (delta > 0) {
                    if (c1.static) {
                        let t1 = new Point(
                            c2.center.x - c1.center.x,
                            c2.center.y - c1.center.y
                        );
                        t1 = t1.normalize().mul(delta / substeps);
                        c2.center = c2.center.add(t1);
                        continue;
                    }

                    let t1 = new Point(
                        c1.center.x - c2.center.x,
                        c1.center.y - c2.center.y
                    );
                    t1 = t1.normalize().mul(delta / (2.0 * substeps));
                    let noise = t1.orthogonal().normalize().mul(0.1);
                    if (Math.random() < 0.5) {
                        noise = noise.mul(-1.0);
                    }
                    t1 = t1.add(noise);
                    c1.center = c1.center.add(t1);
                    c2.center = c2.center.sub(t1);
                }
            }
        }
    }

    for (c of world.circles) {
        c.update(elapsedSeconds);
    }

    const canvasElement = document.querySelector("#canvas");
    const width = canvasElement.offsetWidth;
    const height = canvasElement.offsetHeight;
    let i = 0;
    while (i < world.circles.length) {
        if (world.circles[i].isOutOfBounds(width, height)) {
            bestPath = world.circles[i].path;
            let tmp = world.circles[i];
            world.circles[i] = world.circles[world.circles.length - 1];
            world.circles[world.circles.length - 1] = tmp;
            world.circles.length -= 1;
            continue;
        }
        ++i;
    }

    let endTime = new Date();
    world.frameDuration = endTime - startTime;
}

function render(world) {
    let canvas = document.querySelector("canvas");
    let ctx = canvas.getContext("2d");

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (c of world.circles) {
        c.draw(ctx);
    }

    if (bestPath) {
        renderPath(ctx, bestPath);
    }

    {
        ctx.font = "20px Arial";
        ctx.fillStyle = "white";
        ctx.fillText(world.frameDuration.toString(), ctx.canvas.width - 40, 40);
    }
}

function renderPath(ctx, path) {
    ctx.strokeStyle = "#ffa500";
    ctx.globalAlpha = 0.1;
    ctx.lineWidth = 5;
    for (let i = 1; i < path.length; ++i) {
        ctx.moveTo(path[i - 1].x, path[i - 1].y);
        ctx.lineTo(path[i].x, path[i].y);
        ctx.stroke();
    }
    ctx.globalAlpha = 1.0;
}

class World {
    constructor() {
        this.circles = [];
    }
}

class Point {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }

    static from(other) {
        return new Point(other.x, other.y);
    }

    distance(other) {
        const a = this.x - other.x;
        const b = this.y - other.y;
        return Math.sqrt(a * a + b * b);
    }

    add(other) {
        return new Point(this.x + other.x, this.y + other.y);
    }

    sub(other) {
        return new Point(this.x - other.x, this.y - other.y);
    }

    mul(value) {
        return new Point(this.x * value, this.y * value);
    }

    normalize() {
        const length = this.distance(new Point(0.0, 0.0));
        return new Point(this.x / length, this.y / length);
    }

    orthogonal() {
        return new Point(-this.y, this.x);
    }

    toString() {
        return "[" + this.x + ", " + this.y + "]";
    }
}

let bestPath = [];

class Circle {
    constructor(center, radius) {
        this.center = center;
        this.radius = radius;
        this.last_center = Point.from(this.center).sub(new Point(0, 5));
        this.acceleration = new Point(0.0, 0.0);
        this.static = false;
        this.path = [Point.from(this.center)];
    }

    static createStatic(center, radius) {
        let c = new Circle(center, radius);
        c.static = true;
        return c;
    }

    draw(ctx) {
        if (this.static) {
            ctx.fillStyle = "#DDDDDD";
        } else {
            ctx.fillStyle = "#3370d4";
        }

        ctx.strokeStyle = "black";
        ctx.lineWidth = 1;

        ctx.beginPath();
        ctx.arc(this.center.x, this.center.y, this.radius, 0, 2 * Math.PI, true);
        ctx.closePath();
        ctx.fill();

        ctx.beginPath();
        ctx.arc(this.center.x, this.center.y, this.radius, 0, 2 * Math.PI);
        ctx.stroke();
    }

    update(elapsedSeconds) {
        if (this.static) {
            return;
        }

        const velocity = this.center.sub(this.last_center);
        this.last_center = Point.from(this.center);
        this.center = this.center.add(velocity).add(this.acceleration.mul(elapsedSeconds * elapsedSeconds));
        this.acceleration = new Point(0.0, 0.0);
    }

    isOutOfBounds(width, height) {
        if (this.center.x < 0 || this.center.x > width) {
            return true;
        }

        if (this.center.y < 0 || this.center.y > height) {
            return true;
        }

        return false;
    }
}

document.addEventListener("DOMContentLoaded", app);