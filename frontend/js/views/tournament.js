import { actualizeIndexPage } from "../utils.js"
import { routesSp } from "./utils/commonFunctions.js"

export async function tournamentController() {
    const refreshButton = document.getElementById("refresh-trnmt")

    console.log("HEY 1")
    refreshButton.addEventListener("click", async (event) => {
        console.log("HEY 2")
        await fetch('tournament/tournament')
        .then(response => {
            if (!response.ok) throw new Error("https Error: " + response.status);
            return response.json();
          })
          .then(data => {
            console.log("Données reçues SetKey:", data["list"]);
            trnmt = data["list"];
          })
          .catch(error => {
            console.error("Erreur de requête :", error);
            throw error;
          });
    })
}