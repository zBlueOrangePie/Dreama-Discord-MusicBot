const { createCanvas, loadImage } = require("@napi-rs/canvas");
const path = require("path");

const CARD_W = 900;
const CARD_H = 620;
const BG_PATH = path.join(__dirname, "../assets/background.jpeg");

function fitTextToWidth(ctx, text, maxWidth, startSize, minSize) {
    let size = startSize;
    ctx.font = `${size}px sans-serif`;
    while (ctx.measureText(text).width > maxWidth && size > minSize) {
        size -= 0.5;
        ctx.font = `${size}px sans-serif`;
    }
    return size;
}

function formatMs(ms) {
    if (!ms || isNaN(ms)) return "?:??";
    const totalSec = Math.floor(ms / 1000);
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    return `${min}:${String(sec).padStart(2, "0")}`;
}

async function buildSearchCard(tracks, query) {
    const canvas = createCanvas(CARD_W, CARD_H);
    const ctx = canvas.getContext("2d");

    const bg = await loadImage(BG_PATH);
    ctx.drawImage(bg, 0, 0, CARD_W, CARD_H);

    ctx.fillStyle = "rgba(5, 5, 20, 0.80)";
    ctx.fillRect(0, 0, CARD_W, CARD_H);

    const accentGrad = ctx.createLinearGradient(0, 0, 0, CARD_H);
    accentGrad.addColorStop(0, "#8b5cf6");
    accentGrad.addColorStop(1, "#3b82f6");
    ctx.fillStyle = accentGrad;
    ctx.fillRect(0, 0, 5, CARD_H);

    const padLeft = 44;
    const padRight = 36;
    const innerW = CARD_W - padLeft - padRight;

    ctx.fillStyle = "rgba(167, 139, 250, 0.85)";
    ctx.font = "bold 13px sans-serif";
    ctx.fillText("SEARCH RESULTS", padLeft, 44);

    const querySize = fitTextToWidth(ctx, `"${query}"`, innerW, 22, 12);
    ctx.font = `bold ${querySize}px sans-serif`;
    ctx.fillStyle = "#ffffff";
    ctx.fillText(`"${query}"`, padLeft, 76);

    ctx.strokeStyle = "rgba(139, 92, 246, 0.35)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padLeft, 92);
    ctx.lineTo(CARD_W - padRight, 92);
    ctx.stroke();

    const rowH = 96;
    const rowStartY = 100;
    const numColW = 44;
    const durColW = 90;
    const textColW = innerW - numColW - durColW - 16;

    for (let i = 0; i < Math.min(tracks.length, 5); i++) {
        const track = tracks[i];
        const rowY = rowStartY + i * rowH;
        const centerY = rowY + rowH / 2;

        if (i % 2 === 0) {
            ctx.fillStyle = "rgba(255, 255, 255, 0.03)";
            ctx.fillRect(padLeft - 8, rowY + 4, CARD_W - padLeft - padRight + 16, rowH - 8);
        }

        ctx.fillStyle = "rgba(139, 92, 246, 0.9)";
        ctx.font = "bold 20px sans-serif";
        ctx.fillText(`${i + 1}`, padLeft, centerY + 7);

        const titleX = padLeft + numColW;
        const titleMaxW = textColW;
        const titleSize = fitTextToWidth(ctx, track.info.title, titleMaxW, 17, 10);
        ctx.font = `bold ${titleSize}px sans-serif`;
        ctx.fillStyle = "#ffffff";
        ctx.fillText(track.info.title, titleX, centerY - 4);

        const authorSize  = fitTextToWidth(ctx, track.info.author, titleMaxW, 13, 9);
        ctx.font = `${authorSize}px sans-serif`;
        ctx.fillStyle = "rgba(148, 163, 184, 0.8)";
        ctx.fillText(track.info.author, titleX, centerY + 16);

        const duration = formatMs(track.info.duration);
        const durSize = fitTextToWidth(ctx, duration, durColW, 14, 10);
        ctx.font = `${durSize}px sans-serif`;
        ctx.fillStyle = "rgba(100, 116, 139, 0.9)";
        const durX = CARD_W - padRight - ctx.measureText(duration).width;
        ctx.fillText(duration, durX, centerY + 7);

        if (i < 4) {
            ctx.strokeStyle = "rgba(255, 255, 255, 0.06)";
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(padLeft, rowY + rowH);
            ctx.lineTo(CARD_W - padRight, rowY + rowH);
            ctx.stroke();
        }
    }

    ctx.fillStyle = "rgba(100, 116, 139, 0.8)";
    ctx.font = "13px sans-serif";
    ctx.fillText("Dreama Music", padLeft, CARD_H - 16);

    return canvas.toBuffer("image/png");
}

module.exports = { buildSearchCard };
