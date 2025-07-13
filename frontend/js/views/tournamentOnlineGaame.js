import { actualizeIndexPage, fetchWithRefresh, getCookie } from "../utils.js";
import { drawCenterTextP, guideTouch } from "./localGame.js";
import { drawCenterText } from "./multiplayer.js";
import { routesTr } from "./tournament.js";
import { getSSE, handleGame2Players, setCanvasAndContext } from "./utils/commonFunctions.js";

export async function onlineGameTr(key, playerID, isAiGame, JWTid, tkey, round) {
  let sseTournament = getSSE();

  sseTournament.onmessage = function(event) {
    try {
      const data = JSON.parse(event.data);

      if (data.t_state == "game-finished") {
          if (data.mkey == key) {
            actualizeIndexPage("contentTournementPage", routesTr['tournament']);
          }
      }
    }
    catch(error){
      console.log("Error sseTournament", error);
    }
  }

  console.log("key, playerID, isAiGame, JWTid, tkey, round <->", key, playerID, isAiGame, JWTid, tkey, round)

  await fetchWithRefresh(`tournament/supervise?key=${key}&tkey=${tkey}&round=${round}`, {
    credentials: 'include'
  })

  handleGame2Players(key, playerID, isAiGame, JWTid);
}
