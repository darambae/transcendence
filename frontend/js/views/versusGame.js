import { adress, routesSp } from "./utils/commonFunctions.js";
import { setApiKeyWebSP } from "./utils/commonFunctions.js";
import { setPlayersLocalName } from "./utils/commonFunctions.js";
import { actualizeIndexPage } from "../utils.js";

export async function versusController() {
    let p1 = "Default";
    let p2 = "Default";
    let startButton = document.getElementById("getTextBtn");
    let apiKey;

    startButton.addEventListener("click", async (event) => {
        await fetch(`https://${adress}:8443/server-pong/api-key`)
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
        p1 = document.getElementById("player1").value;
        p2 = document.getElementById("player2").value;
        setPlayersLocalName(p1, p2, apiKey);
        actualizeIndexPage("replace-state", routesSp["game"])
    });
}