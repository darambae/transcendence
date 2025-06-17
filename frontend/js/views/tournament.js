import { actualizeIndexPage } from "../utils.js"
import { routesSp } from "./utils/commonFunctions.js"
import { getCookie } from "../utils.js"

export async function tournamentController() {
    const refreshButton = document.getElementById("refresh-trnmt")
    const createButton = document.getElementById("create-trnmt")
    const csrf = getCookie('csrftoken');
    console.log("csrf:", csrf);
    console.log("HEY 1")
    refreshButton.addEventListener("click", async (event) => {
        console.log("HEY 2")
        await fetch('tournament/tournament', {
            headers: {
                'X-CSRFToken': csrf,
            }
        })
        .then(response => {
            if (!response.ok) throw new Error("https Error: " + response.status);
            return response.json();
          })
          .then(data => {
            console.log("Données reçues TrnmtKey:", data["list"]);
            let trnmt = data["list"];
          })
          .catch(error => {
            console.error("Erreur de requête :", error);
            throw error;
          });
    })

    createButton.addEventListener("click", async (event) => {
        console.log("Hey 3")
        
        await fetch('tournament/tournament',  {
            method: 'POST',
            headers: {
                'X-CSRFToken': csrf,
                'Content-Type': 'application/json',
                "Authorization" : `bearer ${sessionStorage.getItem("accessToken")}`
            },
            body: JSON.stringify({ "action" : "create" })
        })
        .then(response => {
            if (!response.ok) throw new Error("https Error: " + response.status);
            return response.json();
          })
          .then(data => {
            console.log("Données reçues TrnmtCreate:", data);
            // let trnmt = data["list"];
          })
          .catch(error => {
            console.error("Erreur de requête :", error);
            throw error;
          });
    })
}