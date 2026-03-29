const { createCanvas, loadImage } = require("@napi-rs/canvas");
const path = require("path");

const CARD_W = 900;
const CARD_H = 280;
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

async function buildVolumeCard(volume, trackTitle) {
    const canvas = createCanvas(CARD_W, CARD_H);
    const ctx = canvas.getContext("2d");

    const bg = await loadImage(BG_PATH);
    ctx.drawImage(bg, 0, 0, CARD_W, CARD_H);

    ctx.fillStyle = "rgba(5, 5, 20, 0.75)";
    ctx.fillRect(0, 0, CARD_W, CARD_H);

    const accentGrad = ctx.createLinearGradient(0, 0, 0, CARD_H);
    accentGrad.addColorStop(0, "#8b5cf6");
    accentGrad.addColorStop(1, "#3b82f6");
    ctx.fillStyle = accentGrad;
    ctx.fillRect(0, 0, 5, CARD_H);

    const textStart = 44;
    const maxTextWidth = CARD_W - textStart - 36;

    ctx.fillStyle = "rgba(167, 139, 250, 0.85)";
    ctx.font = "bold 13px sans-serif";
    ctx.fillText("VOLUME UPDATED", textStart, 68);

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 72px sans-serif";
    ctx.fillText(`${volume}%`, textStart, 150);

    const barX = textStart;
    const barY = 168;
    const barW = maxTextWidth;
    const barH = 14;
    const fillW = Math.max(Math.round(barW * (volume / 100)), 14);

    ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
    ctx.beginPath();
    ctx.roundRect(barX, barY, barW, barH, 7);
    ctx.fill();

    const barGrad = ctx.createLinearGradient(barX, 0, barX + barW, 0);
    barGrad.addColorStop(0, "#8b5cf6");
    barGrad.addColorStop(1, "#3b82f6");
    ctx.fillStyle = barGrad;
    ctx.beginPath();
    ctx.roundRect(barX, barY, fillW, barH, 7);
    ctx.fill();

    if (trackTitle) {
        ctx.strokeStyle = "rgba(139, 92, 246, 0.4)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(textStart, 204);
        ctx.lineTo(CARD_W - 36, 204);
        ctx.stroke();

        const titleSize = fitTextToWidth(ctx, trackTitle, maxTextWidth, 15, 10);
        ctx.font = `${titleSize}px sans-serif`;
        ctx.fillStyle = "rgba(148, 163, 184, 0.75)";
        ctx.fillText(trackTitle, textStart, 230);
    }

    ctx.fillStyle = "rgba(100, 116, 139, 0.8)";
    ctx.font = "13px sans-serif";
    ctx.fillText("Dreama Music", textStart, 258);

    return canvas.toBuffer("image/png");
}

module.exports = { buildVolumeCard };
          
