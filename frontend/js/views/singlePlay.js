import {setCanvasAndContext} from './utils/commonFunctions.js'
import { routesSp } from './utils/commonFunctions.js';
import { actualizeIndexPage } from '../utils.js';

export function singlePlayController() {
	setCanvasAndContext();
	const aiButton = document.getElementById("AI-game")
	const versusButton = document.getElementById("versus-game")

	aiButton.addEventListener("click", (event) => {
		sendGameCreation();
	});

	versusButton.addEventListener("click", (event) => {
    	actualizeIndexPage("replace-state", routesSp["playerSelection"]);
	})
	console.log("here in single Play");
}