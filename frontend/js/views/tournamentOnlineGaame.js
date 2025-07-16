import { actualizeIndexPage, fetchWithRefresh } from "../utils.js";
import { routesTr, getSSE } from "./tournament.js";
import { handleGame2Players } from "./multiplayerGameSession.js";

export async function onlineGameTr(key, playerID, isAiGame, JWTid, tkey, round) {
  let sseTournament = getSSE();

  sseTournament.onmessage = function(event) {
    try {
      const data = JSON.parse(event.data);

      if (data.t_state == "game-finished") {
        if (data.next == "set-results") {
            console.log("results : ", data);
        }
        //  sseTournament.close();
        //  fetchWithRefresh(`tournament/${data.tkey}/results/`, {
        //    credentials: 'include'
        //  })
        //}  
        if (data.mkey == key) {
            actualizeIndexPage("contentTournementPage", routesTr['tournament']);
          }
          
      }
      if (data.t_state == "results") {
        console.log("------------------------------->>", data);
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

  handleGame2Players(key, Number(playerID), isAiGame, JWTid);
}
