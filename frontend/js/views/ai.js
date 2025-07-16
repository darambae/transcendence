import { handleGame2Players } from "./multiplayerGameSession.js";

export function aiController(key) {
    return handleGame2Players(key, 1, 1, -1);
}