import { getCookie } from '../utils.js';
import { setPlayersLocalName } from './gameApi.js';
import { getSSE } from './tournament.js';
import { routesTr } from './tournament.js';
import { localGameController } from './localGame.js';
import { actualizeIndexPage } from '../utils.js';

export async function localGameTr() {
	let id1 = localStorage.getItem("p1");
	let id2 = localStorage.getItem("p2");
	let key = localStorage.getItem("key");
	// let tkey = localStorage.getItem("tkey");
	// console.log(id1, id2, key, tkey);
	  let sseTournament = getSSE();
  
	//   console.log("aaa");
	  sseTournament.onmessage = function(event) {
		try {
		//   console.log(event.data);
		  const data = JSON.parse(event.data);
		//   console.log(data);
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
  
	  localGameController(id1, id2);
	}
  
