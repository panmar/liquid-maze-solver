const CIRCLE_RADIUS = 5;
const WALL_CELL = 0;
const EMPTY_CELL = 1;

let timer = 0;
const SPAWN_TIMER = 0.30;

class WindowDataAggregator {
    constructor(widnowLength) {
        this.lastDataIndex = 0;
        this.window = new Array(widnowLength);
    }

    add(data) {
        this.lastDataIndex = (this.lastDataIndex + 1) % this.window.length;
        this.window[this.lastDataIndex] = data;
    }

    avg() {
        if (!this.window.length) {
            return 0;
        }
        return Math.floor(this.window.reduce((a, b) => a + b, 0) / this.window.length);
    }
}

class Maze {
    constructor(width, height) {
        this.width = width;
        this.height = height;

        const mazeCellsPerDim = 20;
        const wallRadius = 0.8 * (Math.min(width, height) / mazeCellsPerDim) / 2.0;

        this.maze = this.generateMaze(mazeCellsPerDim, mazeCellsPerDim);

        const gridCellsPerWidth = Math.floor(width / wallRadius) / 3;
        const gridCellsPerHeight = Math.floor(height / wallRadius) / 3;
        this.grid = this.generateGrid(gridCellsPerWidth, gridCellsPerHeight);
        this.gridCellWidth = this.width / this.grid.length;
        this.gridCellHeight = this.height / this.grid[0].length;
        this.startPosition = this.createMazeWalls(wallRadius);
    }

    mazeWidth() {
        return this.maze.length;
    }

    mazeHeight() {
        return this.maze[0].length;
    }

    generateGrid(cellsPerWidth, cellsPerHeight) {
        let grid = [];
        for (let i = 0; i < cellsPerWidth; ++i) {
            grid[i] = [];
            for (let j = 0; j < cellsPerHeight; ++j) {
                let cell = { items: [] };
                grid[i].push(cell);
            }
        }

        return grid;
    }

    generateMaze(widthCells, heightCells) {
        let maze = [];
        for (let i = 0; i < widthCells; ++i) {
            maze.push([]);
            for (let j = 0; j < heightCells; ++j) {
                maze[i].push(EMPTY_CELL);
            }
        }

        for (let i = 0; i < widthCells; ++i) {
            maze[i][0] = WALL_CELL;
            maze[i][widthCells - 1] = WALL_CELL;
        }

        for (let i = 0; i < heightCells; ++i) {
            maze[0][i] = WALL_CELL;
            maze[widthCells - 1][i] = WALL_CELL;
        }

        maze[1][0] = EMPTY_CELL;
        maze[widthCells - 2][heightCells - 1] = EMPTY_CELL;

        const maxWallCells = 0.3 * widthCells * heightCells;
        let wallCells = 0;
        const maxTries = 1000;
        let tries = 0;
        while (wallCells < maxWallCells && tries++ < maxTries) {
            let x = Math.floor(Math.random() * (widthCells - 2)) + 1;
            let y = Math.floor(Math.random() * (heightCells - 2)) + 1;
            if (maze[x][y] !== EMPTY_CELL) {
                continue;
            }

            maze[x][y] = WALL_CELL;

            if (!this.exist_path(maze, 1, 0, widthCells - 2, heightCells - 1)) {
                maze[x][y] = EMPTY_CELL;
                continue;
            }

            ++wallCells;
        }

        return maze;
    }

    exist_path(maze, startX, startY, endX, endY) {
        return this.dfs(maze, startX, startY, endX, endY, []);
    }

    dfs(maze, startX, startY, endX, endY, visited) {
        if ((startX === endX) && (startY === endY)) {
            return true;
        }

        if (visited.find(p => (p.x === startX) && (p.y === startY))) {
            return false;
        }

        if (maze[startX][startY] === WALL_CELL) {
            return false;
        }

        visited.push(new Vec2(startX, startY));

        const points = [];
        if (maze[startX - 1][startY] === EMPTY_CELL) { points.push(new Vec2(startX - 1, startY)) }
        if (maze[startX][startY + 1] === EMPTY_CELL) { points.push(new Vec2(startX, startY + 1)) }
        if (maze[startX + 1][startY] === EMPTY_CELL) { points.push(new Vec2(startX + 1, startY)) }
        if (maze[startX][startY - 1] === EMPTY_CELL) { points.push(new Vec2(startX, startY - 1)) }

        for (const p of points) {
            if (this.dfs(maze, p.x, p.y, endX, endY, visited)) {
                return true;
            }
        }

        return false;
    }

    createMazeWalls(radius) {
        const xOffset = (this.width - this.mazeWidth() * 2 * radius + 2 * radius) / 2.0;
        const yOffset = (this.height - this.mazeHeight() * 2 * radius + 2 * radius) / 2.0;

        for (let x = 0; x < this.maze.length; ++x) {
            for (let y = 0; y < this.maze[0].length; ++y) {
                if (this.maze[x][y] === EMPTY_CELL) {
                    continue;
                }

                const position = new Vec2(xOffset + x * 2 * radius, yOffset + y * 2 * radius);
                this.createStaticSquare(position, radius);
            }
        }

        const startPosition = new Vec2(xOffset + 2 * radius, yOffset);
        return startPosition;
    }

    createStaticSquare(position, radius) {
        this.addCircle(Circle.createStatic(position, radius));
        let t = 7.0 * radius / 10.0;
        this.addCircle(Circle.createStatic(Vec2.from(position).add(new Vec2(t, t)), radius / 2.5));
        this.addCircle(Circle.createStatic(Vec2.from(position).add(new Vec2(-t, t)), radius / 2.5));
        this.addCircle(Circle.createStatic(Vec2.from(position).add(new Vec2(t, -t)), radius / 2.5)),
            this.addCircle(Circle.createStatic(Vec2.from(position).add(new Vec2(-t, -t)), radius / 2.5));
    }

    update(elapsedSeconds) {
        timer += elapsedSeconds;
        if (timer > SPAWN_TIMER) {
            this.addCircle(new Circle(new Vec2(this.startPosition.x - 5, 10), CIRCLE_RADIUS));
            this.addCircle(new Circle(new Vec2(this.startPosition.x + 5, 12), CIRCLE_RADIUS));
            timer = 0;
        }

        const simulate = (c1, c2, substeps) => {
            if (c1.static && c2.static) {
                return;
            }

            if (c2.static) {
                [c1, c2] = [c2, c1];
            }

            const dist = c1.position.distance(c2.position);
            const delta = c1.radius + c2.radius - dist;
            if (delta > 0) {
                if (c1.static) {
                    let t1 = new Vec2(
                        c2.position.x - c1.position.x,
                        c2.position.y - c1.position.y
                    );
                    t1.normalize().mul(delta / substeps);
                    c2.position.add(t1);
                    // c2.lastPosition = Vec2.from(c2.position);
                    return;
                }

                let t1 = new Vec2(
                    c1.position.x - c2.position.x,
                    c1.position.y - c2.position.y
                );
                t1.normalize().mul(delta / (2.0 * substeps));
                let noise = Vec2.from(t1).orthogonal().normalize().mul(0.1);
                if (Math.random() < 0.5) {
                    noise.mul(-1.0);
                }
                t1.add(noise);
                c1.position.add(t1);
                c2.position.sub(t1);
            }
        }

        const substeps = 4;
        for (let s = 0; s < substeps; ++s) {
            for (let i = 0; i < this.grid.length; ++i) {
                for (let j = 0; j < this.grid[i].length; ++j) {
                    const items = this.grid[i][j].items;

                    for (let k = 0; k < items.length; ++k) {
                        for (let l = k + 1; l < items.length; ++l) {
                            simulate(items[k], items[l], substeps);
                        }
                    }

                    if (i + 1 < this.grid.length) {
                        for (let k = 0; k < items.length; ++k) {
                            const neighbours = this.grid[i + 1][j].items;
                            for (let l = 0; l < neighbours.length; ++l) {
                                simulate(items[k], neighbours[l], substeps);
                            }
                        }
                    }

                    if (i + 1 < this.grid.length && j + 1 < this.grid[i].length) {
                        for (let k = 0; k < items.length; ++k) {
                            const neighbours = this.grid[i + 1][j + 1].items;
                            for (let l = 0; l < neighbours.length; ++l) {
                                simulate(items[k], neighbours[l], substeps);
                            }
                        }
                    }

                    if (j + 1 < this.grid[i].length) {
                        for (let k = 0; k < items.length; ++k) {
                            const neighbours = this.grid[i][j + 1].items;
                            for (let l = 0; l < neighbours.length; ++l) {
                                simulate(items[k], neighbours[l], substeps);
                            }
                        }
                    }
                }
            }
        }

        for (let i = 0; i < this.grid.length; ++i) {
            for (let j = 0; j < this.grid[i].length; ++j) {
                const items = this.grid[i][j].items;
                for (let item of items) {
                    item.acceleration = new Vec2(0.0, 100.0);
                    item.update(elapsedSeconds);
                }
            }
        }

        this.updateBuckets();
    }

    updateBuckets() {
        const cellWidth = this.width / this.grid.length;
        const cellHeight = this.height / this.grid[0].length;

        let toRelocate = [];
        for (let i = 0; i < this.grid.length; ++i) {
            for (let j = 0; j < this.grid[i].length; ++j) {
                let items = this.grid[i][j].items;
                let boundaryMin = new Vec2(i * cellWidth, j * cellHeight);
                let boundaryMax = new Vec2(boundaryMin.x + cellWidth, boundaryMin.y + cellHeight);
                let k = 0;
                while (k < items.length) {
                    const item = items[k];
                    if (item.position.x < boundaryMin.x
                        || item.position.x > boundaryMax.x
                        || item.position.y < boundaryMin.y
                        || item.position.y > boundaryMax.y) {
                        toRelocate.push(item);
                        {
                            let tmp = item;
                            items[k] = items[items.length - 1];
                            items[items.length - 1] = tmp;
                        }
                        items.length -= 1;
                        continue;
                    }
                    ++k;
                }
            }
        }

        for (const item of toRelocate) {
            // const x = Math.floor(item.position.x / cellWidth);
            // const y = Math.floor(item.position.y / cellHeight);
            // this.grid[x][y].items.push(item);
            this.addCircle(item);
        }
    }

    addCircle(circle) {
        const x = Math.floor(circle.position.x / this.gridCellWidth);
        const y = Math.floor(circle.position.y / this.gridCellHeight);
        if (this.grid[x] === undefined || this.grid[x][y] === undefined) {
            return;
        }
        const maxGridCellCapacity = Math.floor(1.6 * (this.gridCellWidth / (2 * CIRCLE_RADIUS))
            * (this.gridCellHeight / (2 * CIRCLE_RADIUS)));
        let items = this.grid[x][y].items;
        if (items.length > maxGridCellCapacity) {
            return;
        }

        items.push(circle);
    }

    render(fpsAggregator) {
        {
            const canvasElement = document.querySelector("#canvas");
            let canvas = document.querySelector("canvas");
            let ctx = canvas.getContext("2d");

            ctx.clearRect(0, 0, canvas.width, canvas.height);

            this.renderMazeGrid(ctx, "#333333");
            this.renderCircles(ctx);
        }

        {
            const canvasElement = document.querySelector("#canvas");
            let canvas = document.querySelector("canvas");
            let ctx = canvas.getContext("2d");
            ctx.font = "30px Arial";
            ctx.fillStyle = "white";
            ctx.fillText(fpsAggregator.avg().toString(), this.width - 50, 50);
        }
    }

    renderMazeGrid(ctx, color) {
        const cellWidth = this.width / this.grid.length;
        const cellHeight = this.height / this.grid[0].length;

        ctx.strokeStyle = color;
        ctx.globalAlpha = 0.1;

        for (let x = 1; x < this.grid.length; ++x) {
            ctx.moveTo(x * cellWidth, 0.0);
            ctx.lineTo(x * cellWidth, this.height);
            ctx.stroke();
        }

        for (let y = 1; y < this.grid[0].length; ++y) {
            ctx.moveTo(0.0, y * cellHeight);
            ctx.lineTo(this.width, y * cellHeight);
            ctx.stroke();
        }

        ctx.globalAlpha = 1.0;
    }

    renderCircles(ctx, color) {
        for (let i = 0; i < this.grid.length; ++i) {
            for (let j = 0; j < this.grid[i].length; ++j) {
                const items = this.grid[i][j].items;
                for (const item of items) {
                    item.render(ctx, color);
                }
            }
        }
    }
}

const adjustCanvasDimensions = () => {
    const canvasElement = document.querySelector("#canvas");
    let canvas = document.querySelector("canvas");
    let ctx = canvas.getContext("2d");
    ctx.canvas.width = canvasElement.offsetWidth;
    ctx.canvas.height = canvasElement.offsetHeight;
    return [canvasElement.offsetWidth, canvasElement.offsetHeight];
}

const app = () => {
    const [width, height] = adjustCanvasDimensions();
    let maze = new Maze(width, height);
    let fpsAggregator = new WindowDataAggregator(10);

    const fps = 30;
    const frameTimeMs = 1000 * (1.0 / fps);
    setInterval(() => {
        updateAndRender(maze, 1.0 / fps, fpsAggregator);
    }, frameTimeMs);


    const resizeEnd = () => {
        const [width, height] = adjustCanvasDimensions();
        maze = new Maze(width, height);
        fpsAggregator = new WindowDataAggregator(10);
    }
    let doIt;

    window.addEventListener("resize", function (event) {
        this.clearTimeout(doIt);
        doIt = this.setTimeout(resizeEnd, 100);
        // console.log(`resize: ${event}`);
        // console.log(event);
    }, true);
}

const updateAndRender = (maze, elapsedSeconds, fpsAggregator) => {
    const updateStart = new Date();
    maze.update(elapsedSeconds);
    maze.render(fpsAggregator);
    fpsAggregator.add(new Date() - updateStart);
}

class Vec2 {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }

    static from(other) {
        return new Vec2(other.x, other.y);
    }

    distance(other) {
        const a = this.x - other.x;
        const b = this.y - other.y;
        return Math.sqrt(a * a + b * b);
    }

    add(other) {
        // return new Vec2(this.x + other.x, this.y + other.y);
        this.x += other.x;
        this.y += other.y;
        return this;
    }

    sub(other) {
        // return new Vec2(this.x - other.x, this.y - other.y);
        this.x -= other.x;
        this.y -= other.y;
        return this;
    }

    mul(value) {
        // return new Vec2(this.x * value, this.y * value);
        this.x *= value;
        this.y *= value;
        return this;
    }

    normalize() {
        const length = this.distance(new Vec2(0.0, 0.0));
        // return new Vec2(this.x / length, this.y / length);
        this.x /= length;
        this.y /= length;
        return this;
    }

    orthogonal() {
        return new Vec2(-this.y, this.x);
    }

    toString() {
        return `(${this.x}, ${this.y})`
    }
}

class Circle {
    constructor(position, radius) {
        this.radius = radius;
        this.position = position;
        this.lastPosition = Vec2.from(position).add(new Vec2(0.0, -1.0));
        this.acceleration = new Vec2(0.0, 0.0);
        this.static = false;
    }

    static createStatic(position, radius) {
        let c = new Circle(position, radius);
        c.static = true;
        return c;
    }

    render(ctx) {
        if (this.static) {
            ctx.fillStyle = "#DDDDDD";
        } else {
            ctx.fillStyle = "#3370d4";
        }

        ctx.strokeStyle = "black";
        ctx.lineWidth = 1;

        ctx.beginPath();
        ctx.arc(this.position.x, this.position.y, this.radius, 0, 2 * Math.PI, true);
        ctx.closePath();
        ctx.fill();

        ctx.beginPath();
        ctx.arc(this.position.x, this.position.y, this.radius, 0, 2 * Math.PI);
        ctx.stroke();
    }

    update(elapsedSeconds) {
        if (this.static) {
            return;
        }
        let velocity = Vec2.from(this.position).sub(this.lastPosition);
        velocity.x = Math.max(-10.0, Math.min(velocity.x, 10.0));
        velocity.y = Math.max(-10.0, Math.min(velocity.y, 10.0));

        this.lastPosition = Vec2.from(this.position);
        this.position.add(velocity).add(this.acceleration.mul(elapsedSeconds * elapsedSeconds));
        this.acceleration = new Vec2(0.0, 0.0);
    }
}

document.addEventListener("DOMContentLoaded", app);
