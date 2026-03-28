const timers = new Map();

const INACTIVITY_MS = 5 * 60 * 1000;

function startTimer(guildId, callback) {
    clearTimer(guildId);
    const timeout = setTimeout(() => {
        timers.delete(guildId);
      callback();
    }, INACTIVITY_MS);
    timers.set(guildId, timeout);
}

function clearTimer(guildId) {
    if (timers.has(guildId)) {
        clearTimeout(timers.get(guildId));
        timers.delete(guildId);
    }
}

function hasTimer(guildId) {
    return timers.has(guildId);
}

module.exports = { startTimer, clearTimer, hasTimer, INACTIVITY_MS };
