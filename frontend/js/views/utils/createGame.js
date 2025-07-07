import { fetchWithRefresh, getCookie } from '../../utils.js';
import {sleep, handleGame2Players, loadGamePlayable, setApiKeyWeb, adress} from './commonFunctions.js'

export async function copySeckeyGame() {
  const keyBtn = document.getElementById("keygame");

  keyBtn.addEventListener("click", () => {
    const key = keyBtn.textContent;
  
    navigator.clipboard.writeText(key)
      .then(() => {
        keyBtn.textContent = "Copied!";
        setTimeout(() => {
          keyBtn.textContent = key;
        }, 1000);
      })
      .catch((err) => {
        console.error("error to copi id key :", err);
      });
  });
}


export async function sendGameCreation() {
  let apiKey;
  const csrf = getCookie('csrftoken');
  const mul = await fetch('./js/views/utils/MatchCreation.html')
  const mulTxt = await mul.text();
  // console.log(mulTxt)
  
  let keepGoing = true;
  let gameState  = document.getElementById("idfooterCanvas");
  gameState.innerHTML = mulTxt;
  gameState = document.getElementById('gameid')
  await fetchWithRefresh(`server-pong/api-key`, {
    headers: {
      'X-CSRFToken': csrf,
    },
    credentials: 'include',
  })
  .then(response => {
    if (!response.ok) throw new Error("https Error: " + response.status);
    return response.json();
  })
  .then(data => {
    // console.log("Données reçues :", data);
    // ctx.fillText("Game State : ", 50, 50)
    // ctx.fillText(`Room ID to give -> : ${data["api_key"]}!`, 150, 150);
    let html = `<div>
    <button class="btn btn-sm btn-success me-1" id="keygame">${data.api_key}</button>
    </div>`;
    gameState.innerHTML = html
    copySeckeyGame()
    console.log('key get : ', data["api_key"])
    apiKey = data["api_key"]
  })
  .catch(error => {
    console.error("Erreur de requête :", error);
  });
  // console.log("apikey : ", apiKey)
  let isGamePlayable = await setApiKeyWeb(apiKey);
    // console.log("Données reçues :", isGamePlayable);
    while (keepGoing) {
      isGamePlayable = await loadGamePlayable(apiKey);
      // console.log("Donnees reçues :", isGamePlayable);
      // ctx.clearRect(150, 220 - 20, 650, 50);
      // ctx.fillText(`Game state : ${isGamePlayable}`, 150, 220);
      if (isGamePlayable == "Game can start") {
        keepGoing = false;
        return handleGame2Players(apiKey, 1, 0, -1);
      }
      await sleep(500);
    }
    copySeckeyGame()
  }