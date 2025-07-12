import { actualizeIndexPage, getCookie } from "../utils.js";
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

  await fetch(`tournament/supervise?round=${round}&tkey=${tkey}&key=${key}`, {
    credentials: 'include'
  })

  handleGame2Players(key, playerID, isAiGame, JWTid);
}
