const fs   = require("fs");
const path = require("path");

const LOG_FILE = path.join(__dirname, "../logs.txt");

function getTimestamp() {
    return new Date().toISOString().replace("T", " ").slice(0, 19);
}

function writeToFile(level, message) {
    const line = `[${getTimestamp()}] [${level}] ${message}\n`;
    fs.appendFileSync(LOG_FILE, line, "utf8");
}

const logger = {
    info(message) {
        console.log(`[INFO] ${message}`);
        writeToFile("INFO", message);
    },

    warn(message) {
        console.warn(`[WARN] ${message}`);
        writeToFile("WARN", message);
    },

    error(message, error) {
        const detail = error instanceof Error
            ? `${error.message}\n${error.stack}`
            : String(error ?? "");

        const full = detail ? `${message} — ${detail}` : message;

        console.error(`[ERROR] ${full}`);
        writeToFile("ERROR", full);
    },
};

module.exports = { logger };
