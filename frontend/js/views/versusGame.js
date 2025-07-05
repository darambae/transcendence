import { adress, routesSp } from "./utils/commonFunctions.js";
import { setApiKeyWebSP } from "./utils/commonFunctions.js";
import { setPlayersLocalName } from "./utils/commonFunctions.js";
import { actualizeIndexPage, fetchWithRefresh } from "../utils.js";
import { drawCenterText } from "./multiplayer.js"

export async function versusController() {
    drawCenterText("click \"GO\"")
    let startButton = document.getElementById("getTextBtn");
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
}
