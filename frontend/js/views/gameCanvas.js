
// Global variables for game session management
let canvas;
let ctx;

export function setCanvasAndContext() {
	canvas = document.getElementById('gameCanvas');
	ctx = canvas.getContext('2d');
	ctx.font = '20px Arial';
	ctx.fillStyle = 'blue';
}

export function getCanvas() {
	return canvas;
}

export function getContext() {
	return ctx;
}

// Utility function for delays
export function sleep(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

// Drawing utilities
function roundRect(ctx, x, y, width, height, radius) {
	ctx.beginPath();
	ctx.moveTo(x + radius, y);
	ctx.lineTo(x + width - radius, y);
	ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
	ctx.lineTo(x + width, y + height - radius);
	ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
	ctx.lineTo(x + radius, y + height);
	ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
	ctx.lineTo(x, y + radius);
	ctx.quadraticCurveTo(x, y, x + radius, y);
	ctx.closePath();
	ctx.fill();
}

function fillCircle(ctx, x, y, r) {
	ctx.beginPath();
	ctx.arc(x, y, r, 0, Math.PI * 2);
	ctx.fillStyle = 'white';
	ctx.fill();
	ctx.closePath();
}

export function drawMap(ballPos, Racket1Pos, Racket2Pos) {
	const canvas = document.getElementById('gameCanvas');
	const ctx = canvas.getContext('2d');

	const fieldWidth = 1000;
	const fieldHeight = 600;
	const offsetX = (canvas.width - fieldWidth) / 2;
	const offsetY = (canvas.height - fieldHeight) / 2;

	ctx.clearRect(0, 0, canvas.width, canvas.height);

	const dx1 = Racket1Pos[1][0] - Racket1Pos[0][0];
	const dy1 = Racket1Pos[1][1] - Racket1Pos[0][1];
	const d1 = Math.sqrt(dx1 * dx1 + dy1 * dy1);
	ctx.fillStyle = 'white';
	roundRect(
		ctx,
		Racket1Pos[0][0] + offsetX,
		Racket1Pos[0][1] + offsetY,
		4,
		d1,
		3
	);

	const dx2 = Racket2Pos[1][0] - Racket2Pos[0][0];
	const dy2 = Racket2Pos[1][1] - Racket2Pos[0][1];
	const d2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);
	ctx.fillStyle = 'white';
	roundRect(
		ctx,
		Racket2Pos[0][0] + offsetX,
		Racket2Pos[0][1] + offsetY,
		4,
		d2,
		3
	);

	let ballX = Math.min(Math.max(ballPos[0], 10), fieldWidth - 10);
	let ballY = Math.min(Math.max(ballPos[1], 10), fieldHeight - 10);

	fillCircle(ctx, ballX + offsetX, ballY + offsetY, 10);
}