import { actualizeIndexPage, fetchWithRefresh } from '../utils.js';
import { routesTr, getSSE, afficheWinnerTournament, affichUserTournament } from './tournament.js';
import { handleGame2Players } from './multiplayerGameSession.js';

export async function onlineGameTr(
	key,
	playerID,
	isAiGame,
	JWTid,
	tkey,
	round
) {
	let sseTournament = getSSE();

	sseTournament.onmessage = async function (event) {
		try {
			if (
				event.data === 'heartbeat' ||
				event.data.trim() === ''
			) {
				return;
			}
			const data = JSON.parse(event.data);

			if (data.t_state == 'game-finished') {
				if (data.next == 'set-results') {
					console.log('results : ', data);
				}
				if (data.mkey == key) {
					await actualizeIndexPage('contentTournementPage', routesTr['tournament']);
				}
			}
			if (data.t_state == 'results') {
				console.log("------------------------------->>", data);
				await affichUserTournament(true)
				await afficheWinnerTournament(data)
			}
		} catch (error) {
			console.log('Error sseTournament', error);
		}
	};

	console.log(
		'key, playerID, isAiGame, JWTid, tkey, round <->',
		key,
		playerID,
		isAiGame,
		JWTid,
		tkey,
		round
	);

	await fetchWithRefresh(
		`tournament/supervise?key=${key}&tkey=${tkey}&round=${round}`,
		{
			credentials: 'include',
		}
	);

	handleGame2Players(key, Number(playerID), isAiGame, JWTid);
}
