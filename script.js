const canvas = document.getElementById('tetris');
const context = canvas.getContext('2d');
context.scale(30, 30);

const nextCanvas = document.getElementById('next-canvas');
const nextCtx = nextCanvas.getContext('2d');
nextCtx.scale(20, 20);

const holdCanvas = document.getElementById('hold-canvas');
const holdCtx = holdCanvas.getContext('2d');
holdCtx.scale(20, 20);

const startScreen = document.getElementById('start-screen');
const gameOverScreen = document.getElementById('game-over');
const startButton = document.getElementById('start-button');
const restartButton = document.getElementById('restart-button');
const scoreElement = document.getElementById('score');

let arena = createMatrix(10, 20);
let dropCounter = 0;
let dropInterval = 1000;
let lastTime = 0;
let score = 0;
let nextPieces = [];
let holdPiece = null;
let canHold = true;

const colors = [
    null,
    '#FF0D72', // T
    '#0DC2FF', // I
    '#0DFF72', // S
    '#F538FF', // Z
    '#FF8E0D', // L
    '#FFE138', // J
    '#3877FF'  // O
];

const PIECES = 'TILSZJO';

function createMatrix(w, h) {
    const matrix = [];
    while (h--) matrix.push(new Array(w).fill(0));
    return matrix;
}

function createPiece(type) {
    switch (type) {
        case 'T': return [[0,1,0],[1,1,1],[0,0,0]];
        case 'O': return [[2,2],[2,2]];
        case 'L': return [[0,0,3],[3,3,3],[0,0,0]];
        case 'J': return [[4,0,0],[4,4,4],[0,0,0]];
        case 'I': return [[0,0,0,0],[5,5,5,5],[0,0,0,0],[0,0,0,0]];
        case 'S': return [[0,6,6],[6,6,0],[0,0,0]];
        case 'Z': return [[7,7,0],[0,7,7],[0,0,0]];
    }
}

function drawMatrix(matrix, offset, ctx) {
    matrix.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) {
                ctx.fillStyle = colors[value];
                ctx.fillRect(x + offset.x, y + offset.y, 1, 1);
            }
        });
    });
}

function merge(arena, player) {
    player.matrix.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) {
                arena[y + player.pos.y][x + player.pos.x] = value;
            }
        });
    });
}

function collide(arena, player) {
    const m = player.matrix;
    const o = player.pos;
    for (let y = 0; y < m.length; ++y) {
        for (let x = 0; x < m[y].length; ++x) {
            if (m[y][x] !== 0 &&
                (arena[y + o.y] && arena[y + o.y][x + o.x]) !== 0) {
                return true;
            }
        }
    }
    return false;
}

function rotate(matrix, dir) {
    for (let y = 0; y < matrix.length; ++y) {
        for (let x = 0; x < y; ++x) {
            [matrix[x][y], matrix[y][x]] = [matrix[y][x], matrix[x][y]];
        }
    }
    if (dir > 0) {
        matrix.forEach(row => row.reverse());
    } else {
        matrix.reverse();
    }
}

function playerDrop() {
    player.pos.y++;
    if (collide(arena, player)) {
        player.pos.y--;
        merge(arena, player);
        playerReset();
        arenaSweep();
        updateScore();
    }
    dropCounter = 0;
}

function playerMove(dir) {
    player.pos.x += dir;
    if (collide(arena, player)) {
        player.pos.x -= dir;
    }
}

function playerRotate(dir) {
    const pos = player.pos.x;
    let offset = 1;
    rotate(player.matrix, dir);
    while (collide(arena, player)) {
        player.pos.x += offset;
        offset = -(offset + (offset > 0 ? 1 : -1));
        if (offset > player.matrix[0].length) {
            rotate(player.matrix, -dir);
            player.pos.x = pos;
            return;
        }
    }
}

function playerHold() {
    if (!canHold) return;
    canHold = false;
    const temp = holdPiece;
    holdPiece = player.matrix;
    if (temp) {
        player.matrix = temp;
    } else {
        player.matrix = nextPiece();
    }
    player.pos = {x: (arena[0].length / 2 | 0) - (player.matrix[0].length / 2 | 0), y: 0};
}

function arenaSweep() {
    outer: for (let y = arena.length - 1; y >= 0; --y) {
        for (let x = 0; x < arena[y].length; ++x) {
            if (arena[y][x] === 0) continue outer;
        }
        const row = arena.splice(y, 1)[0].fill(0);
        arena.unshift(row);
        ++y;
        score += 10;
        dropInterval *= 0.98;
    }
}

function draw() {
    context.fillStyle = '#000';
    context.fillRect(0, 0, canvas.width, canvas.height);
    drawMatrix(arena, {x: 0, y: 0}, context);
    drawMatrix(player.matrix, player.pos, context);
}

function drawHold() {
    holdCtx.fillStyle = '#111';
    holdCtx.fillRect(0, 0, holdCanvas.width, holdCanvas.height);
    if (holdPiece) {
        drawMatrix(holdPiece, {x: 1, y: 1}, holdCtx);
    }
}

function drawNext() {
    nextCtx.fillStyle = '#111';
    nextCtx.fillRect(0, 0, nextCanvas.width, nextCanvas.height);
    for (let i = 0; i < Math.min(3, nextPieces.length); i++) {
        drawMatrix(nextPieces[i], {x: 1, y: i * 3}, nextCtx);
    }
}

function update(time = 0) {
    const deltaTime = time - lastTime;
    lastTime = time;
    dropCounter += deltaTime;
    if (dropCounter > dropInterval) {
        playerDrop();
    }
    draw();
    drawHold();
    drawNext();
    requestAnimationFrame(update);
}

function updateScore() {
    scoreElement.innerText = `Score: ${score}`;
}

function nextPiece() {
    if (nextPieces.length < 7) {
        nextPieces.push(...shuffle(PIECES.split('')).map(createPiece));
    }
    return nextPieces.shift();
}

function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

function playerReset() {
    player.matrix = nextPiece();
    player.pos.y = 0;
    player.pos.x = (arena[0].length / 2 | 0) - (player.matrix[0].length / 2 | 0);
    canHold = true;
    if (collide(arena, player)) {
        gameOverScreen.style.display = 'flex';
        cancelAnimationFrame(update);
    }
}

const player = {
    pos: {x: 0, y: 0},
    matrix: null,
};

document.addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft') {
        playerMove(-1);
    } else if (event.key === 'ArrowRight') {
        playerMove(1);
    } else if (event.key === 'ArrowDown') {
        playerDrop();
    } else if (event.key === 'q') {
        playerRotate(-1);
    } else if (event.key === 'w') {
        playerRotate(1);
    } else if (event.key === ' ') {
        while (!collide(arena, player)) {
            player.pos.y++;
        }
        player.pos.y--;
        playerDrop();
    } else if (event.key === 'Shift') {
        playerHold();
    }
});

startButton.addEventListener('click', () => {
    startScreen.style.display = 'none';
    initGame();
});

restartButton.addEventListener('click', () => {
    gameOverScreen.style.display = 'none';
    initGame();
});

function initGame() {
    arena = createMatrix(10, 20);
    score = 0;
    dropInterval = 1000;
    nextPieces = [];
    holdPiece = null;
    canHold = true;
    playerReset();
    updateScore();
    update();
}
