import { getCookie } from '../utils.js';
import { setPlayersLocalName } from './gameApi.js';
import { afficheWinnerTournament, affichUserTournament, getSSE } from './tournament.js';
import { routesTr } from './tournament.js';
import { localGameController } from './localGame.js';
import { actualizeIndexPage } from '../utils.js';

export async function localGameTr() {
	let id1 = localStorage.getItem('p1');
	let id2 = localStorage.getItem('p2');
	let key = localStorage.getItem('key');
	// let tkey = localStorage.getItem("tkey");
	console.log(id1, id2, key);
	let sseTournament = getSSE();

	//   console.log("aaa");
	sseTournament.onmessage = async function (event) {
		try {
			// Skip heartbeat messages
			if (event.data === 'heartbeat' || event.data.trim() === '') {
				return;
			}
			//   console.log(event.data);
			const data = JSON.parse(event.data);
			//   console.log(data);
			if (data.next == 'set-results') {
				console.log('results : ', data);
			}
			if (data.t_state == 'game-finished') {
				if (data.mkey == key) {
					await actualizeIndexPage(
						'contentTournementPage',
						routesTr['tournament']
					);
				}
			}
			if (data.t_state == 'results') {
				await affichUserTournament()
				await afficheWinnerTournament(data)
				console.log("===============--------=============>>", data);
			}
		} catch (error) {
			console.log('Error sseTournament :', error);
		}
	};

	setPlayersLocalName(key);

	localGameController(id1, id2);
}
