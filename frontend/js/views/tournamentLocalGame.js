import { getCookie } from "../utils.js";
import { getPlayersLocalName, setPlayersLocalName } from "./utils/commonFunctions.js"
import { adress } from "./utils/commonFunctions.js";
import { drawMap } from "./utils/commonFunctions.js";
import { setCanvasAndContext, setSSE, getSSE } from "./utils/commonFunctions.js";
import { actualizeIndexPage } from "../utils.js";
import { routesTr } from "./tournament.js";
import { localGameController } from "./localGame.js";

export async function localGameTr() {
  let id1 = localStorage.getItem("p1");
  let id2 = localStorage.getItem("p2");
  let key = localStorage.getItem("key");
  let tkey = localStorage.getItem("tkey");
  console.log(id1, id2, key, tkey);
    let url_post = `server-pong/send-message`;
    let started = false;
    let game_stats;
    let sseTournament = getSSE();
    const csrf = getCookie("csrftoken");
    let username;
    let a;
    let b;
    let c;

    console.log("aaa");
    sseTournament.onmessage = function(event) {
      try {
        console.log(event.data);
        const data = JSON.parse(event.data);
        console.log(data);
        if (data.t_state == "game-finished") {
            if (data.mkey == key) {
                actualizeIndexPage("contentTournementPage", routesTr['tournament'])
            }
        }
      }
      catch(error) {
        console.log("Error sseTournament :", error);
      }
    }

    setPlayersLocalName(key)

    localGameController();
  }
