import {sleep, handleGame2Players, loadGamePlayable, setApiKeyWeb, adress} from './commonFunctions.js'

export async function sendGameCreation() {
    let apiKey;
    const mul = await fetch('./js/views/utils/MatchCreation.html')
    const mulTxt = await mul.text()
    console.log(mulTxt)

    let gameState  = document.getElementById("replace-state");
    gameState.innerHTML = mulTxt;
    gameState = document.getElementById('gameid')
    await fetch(`https://${adress}:8443/server-pong/api-key`)
      .then(response => {
        if (!response.ok) throw new Error("https Error: " + response.status);
        return response.json();
      })
      .then(data => {
        console.log("Données reçues :", data);
        // ctx.fillText("Game State : ", 50, 50)
        // ctx.fillText(`Room ID to give -> : ${data["api_key"]}!`, 150, 150);
        gameState.innerHTML = data["api_key"]
        apiKey = data["api_key"]
      })
      .catch(error => {
        console.error("Erreur de requête :", error);
      });
    console.log("apikey : ", apiKey)
    let isGamePlayable = await setApiKeyWeb(apiKey);
    console.log("Données reçues :", isGamePlayable);
    while (true) {
      isGamePlayable = await loadGamePlayable(apiKey);
      console.log("Donnees reçues :", isGamePlayable);
      // ctx.clearRect(150, 220 - 20, 650, 50);
      // ctx.fillText(`Game state : ${isGamePlayable}`, 150, 220);
      if (isGamePlayable == "Game can start") {
        return handleGame2Players(apiKey, 1, 0);
      }
      await sleep(500);
    }
  
  }