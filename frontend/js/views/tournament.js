import { actualizeIndexPage } from "../utils.js"
import { routesSp } from "./utils/commonFunctions.js"

export async function tournamentController() {
    const createButton = document.getElementById("create-game")

    console.log("HEY 1")
    createButton.addEventListener("click", (event) => {
        console.log("HEY 2")
        actualizeIndexPage("modal-container", routesSp["invit"])
    })
}