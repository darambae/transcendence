import { adress, routesSp } from "./utils/commonFunctions.js";
import { setApiKeyWebSP } from "./utils/commonFunctions.js";
import { setPlayersLocalName } from "./utils/commonFunctions.js";
import { actualizeIndexPage, fetchWithRefresh } from "../utils.js";
import { drawCenterText } from "./multiplayer.js"

export async function versusController() {
  
  drawCenterText("click \"GO\"")
  let startButton = document.getElementById("getTextBtn");
  const replayBtnSinglePlayer = document.getElementById("replaySinglePlayer");
  let apiKey;

  startButton.addEventListener("click", async (event) => {
      await fetchWithRefresh(`server-pong/api-key`, {
        headers: {
          "Authorization" : `bearer ${sessionStorage.getItem("accessToken")}`
        }
      })
            .then(response => {
              if (!response.ok) throw new Error("https Error: " + response.status);
              return response.json();
            })
            .then(data => {
              apiKey = data["api_key"]
            })
            .catch(error => {
              console.error("Erreur de requête :", error);
            });
      await setApiKeyWebSP(apiKey);
      setPlayersLocalName(apiKey);
      actualizeIndexPage("idfooterCanvas", routesSp["game"])
  });
  replayBtnSinglePlayer.addEventListener("click", async (event) => {
    const player1Score = document.getElementById("player1score");
    const player2Score = document.getElementById("player2score");
    const player1Name = document.getElementById("player1Username");
    const player2Name = document.getElementById("player2Username");

    
    replayBtnSinglePlayer.style.display = "none"
    player1Score.style.setProperty('--score-color', "rgba(255, 255, 255, 0.486)");
    player2Score.style.setProperty('--score-color', "rgba(255, 255, 255, 0.486)")
    player1Name.style.color = "rgba(255, 255, 255, 0.486)";
    player2Name.style.color = "rgba(255, 255, 255, 0.486)";
    player2Score.setAttribute("data-score", 0)
    player1Score.setAttribute("data-score", 0)

    await fetchWithRefresh(`server-pong/api-key`, {
      headers: {
        "Authorization" : `bearer ${sessionStorage.getItem("accessToken")}`
      }
    })
          .then(response => {
            if (!response.ok) throw new Error("https Error: " + response.status);
            return response.json();
          })
          .then(data => {
            apiKey = data["api_key"]
          })
          .catch(error => {
            console.error("Erreur de requête :", error);
          });
    await setApiKeyWebSP(apiKey);
    setPlayersLocalName(apiKey);
    actualizeIndexPage("idfooterCanvas", routesSp["game"])
});
}
