const { createCanvas, loadImage } = require("@napi-rs/canvas");
const path = require("path");

const CARD_W = 900;
const CARD_H = 640;
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
    accentGrad.addColorStop(0, "#FF7F50");
    accentGrad.addColorStop(1, "#FF5F1F");
    ctx.fillStyle = accentGrad;
    ctx.fillRect(0, 0, 5, CARD_H);

    const padLeft = 24;
    const padRight = 36;
    const innerW = CARD_W - padLeft - padRight;

    ctx.fillStyle = "rgba(255, 0, 56)";
    ctx.font = "bold 15px oswald";
    ctx.fillText("SEARCH RESULTS", padLeft, 44);

    const querySize = fitTextToWidth(ctx, `"${query}"`, innerW, 22, 12);
    ctx.font = `bold ${querySize}px sans-serif`;
    ctx.fillStyle = "#ffffff";
    ctx.fillText(`"${query}"`, padLeft, 76);

    ctx.strokeStyle = "rgba(255, 0, 56)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padLeft, 92);
    ctx.lineTo(CARD_W - padRight, 92);
    ctx.stroke();

    const artworks = await Promise.allSettled(
        tracks.slice(0, 5).map(t =>
            typeof t.info.artworkUrl === "string" && t.info.artworkUrl.startsWith("http")
                ? loadImage(t.info.artworkUrl).catch(() => null)
                : Promise.resolve(null)
        )
    );

    const rowH = 100;
    const rowStartY = 100;
    const numColW = 36;
    const thumbSize = 72;
    const thumbGap = 14;
    const durColW = 90;
    const textX = padLeft + numColW + thumbSize + thumbGap;
    const textColW = CARD_W - textX - durColW - padRight - 8;

    for (let i = 0; i < Math.min(tracks.length, 5); i++) {
        const track = tracks[i];
        const rowY = rowStartY + i * rowH;
        const centerY = rowY + rowH / 2;

        if (i % 2 === 0) {
            ctx.fillStyle = "rgba(255, 255, 255, 0.03)";
            ctx.fillRect(padLeft - 8, rowY + 4, CARD_W - padLeft - padRight + 16, rowH - 8);
        }

        ctx.fillStyle = "rgba(255, 0, 56)";
        ctx.font = "bold 20px sans-serif";
        ctx.fillText(`${i + 1}`, padLeft, centerY + 7);

        const thumbX = padLeft + numColW;
        const thumbY = centerY - thumbSize / 2;
        const artwork = artworks[i]?.status === "fulfilled" ? artworks[i].value : null;

        if (artwork) {
            ctx.save();
            ctx.beginPath();
            ctx.roundRect(thumbX, thumbY, thumbSize, thumbSize, 8);
            ctx.closePath();
            ctx.clip();
            ctx.drawImage(artwork, thumbX, thumbY, thumbSize, thumbSize);
            ctx.restore();
        } else {
            ctx.fillStyle = "rgba(139, 92, 246, 0.15)";
            ctx.beginPath();
            ctx.roundRect(thumbX, thumbY, thumbSize, thumbSize, 8);
            ctx.fill();

            ctx.fillStyle = "rgba(139, 92, 246, 0.50)";
            ctx.font = "bold 30px sans-serif";
            const noteW = ctx.measureText("♪").width;
            ctx.fillText("♪", thumbX + (thumbSize - noteW) / 2, thumbY + thumbSize / 2 + 11);
        }

        const titleSize = fitTextToWidth(ctx, track.info.title, textColW, 17, 10);
        ctx.font = `bold ${titleSize}px sans-serif`;
        ctx.fillStyle = "#ffffff";
        ctx.fillText(track.info.title, textX, centerY - 4);

        const authorSize = fitTextToWidth(ctx, track.info.author, textColW, 13, 9);
        ctx.font = `${authorSize}px sans-serif`;
        ctx.fillStyle = "rgba(148, 163, 184, 0.8)";
        ctx.fillText(track.info.author, textX, centerY + 16);

        const duration = formatMs(track.info.duration);
        const durSize  = fitTextToWidth(ctx, duration, durColW, 14, 10);
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
