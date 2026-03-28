const { createCanvas, loadImage, GlobalFonts } = require("@napi-rs/canvas");
const path = require("path");

const CARD_W = 900;
const CARD_H = 280;

const BG_PATH = path.join(__dirname, "../assets/background.jpeg");

function truncateText(ctx, text, maxWidth) {
    if (ctx.measureText(text).width <= maxWidth) return text;
    let result = text;
    while (ctx.measureText(result + "...").width > maxWidth && result.length > 0) {
        result = result.slice(0, -1);
    }
    return result + "...";
}

async function buildNpImageCard(track) {
    const canvas = createCanvas(CARD_W, CARD_H);
    const ctx = canvas.getContext("2d");

    const bg = await loadImage(BG_PATH);
    ctx.drawImage(bg, 0, 0, CARD_W, CARD_H);

    ctx.fillStyle = "rgba(5, 5, 20, 0.72)";
    ctx.fillRect(0, 0, CARD_W, CARD_H);

    const accentGrad = ctx.createLinearGradient(0, 0, 0, CARD_H);
    accentGrad.addColorStop(0, "#8b5cf6");
    accentGrad.addColorStop(1, "#3b82f6");

    ctx.fillStyle = accentGrad;
    ctx.fillRect(0, 0, 5, CARD_H);

    let artworkX = 0;
    let textStart = 44;

    try {
        const artworkUrl = typeof track.info.artworkUrl === "string" && track.info.artworkUrl.startsWith("http")
            ? track.info.artworkUrl
            : null;

        if (artworkUrl) {
            const art = await loadImage(artworkUrl);

            const artSize = 180;
            const artX = 36;
            const artY = (CARD_H - artSize) / 2;

            ctx.save();
            ctx.beginPath();
            ctx.roundRect(artX, artY, artSize, artSize, 14);
            ctx.closePath();
            ctx.clip();
            ctx.drawImage(art, artX, artY, artSize, artSize);
            ctx.restore();

            artworkX = artX + artSize;
            textStart = artworkX + 36;
        }
    } catch {
        textStart = 44;
    }

    const maxTextWidth = CARD_W - textStart - 36;

    ctx.fillStyle = "rgba(167, 139, 250, 0.85)";
    ctx.font = "bold 13px sans-serif";
    ctx.fillText("NOW PLAYING", textStart, 68);

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 32px sans-serif";
    const titleText = truncateText(ctx, track.info.title, maxTextWidth);
    ctx.fillText(titleText, textStart, 116);

    ctx.fillStyle = "rgba(209, 213, 219, 0.9)";
    ctx.font = "18px sans-serif";
    const authorText = truncateText(ctx, track.info.author, maxTextWidth);
    ctx.fillText(authorText, textStart, 153);

    ctx.fillStyle = "rgba(148, 163, 184, 0.75)";
    ctx.font = "15px sans-serif";

    const requester = track.requester?.username ?? "Unknown";
    ctx.fillText(`Requested by ${requester}`, textStart, 190);

    ctx.strokeStyle = "rgba(139, 92, 246, 0.4)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(textStart, 215);
    ctx.lineTo(CARD_W - 36, 215);
    ctx.stroke();

    ctx.fillStyle = "rgba(100, 116, 139, 0.8)";
    ctx.font = "13px sans-serif";
    ctx.fillText("Dreama Music", textStart, 240);

    return canvas.toBuffer("image/png");
}

module.exports = { buildNpImageCard };
