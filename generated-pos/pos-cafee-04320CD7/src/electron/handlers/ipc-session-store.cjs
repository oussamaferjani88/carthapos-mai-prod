/**
 * Shared session store for IPC handlers.
 * Both auth and app handlers reference this to resolve the current user.
 */

const activeSessions = new Map();

module.exports = { activeSessions };
