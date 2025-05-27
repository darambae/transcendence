import {sleep, handleGame2Players, loadGamePlayable, setApiKeyWeb, adress} from './commonFunctions.js'

export async function sendGameJoining() {
    const mul = await fetch('./js/views/utils/MatchJoining.html')
    const mulTxt = await mul.text()
    console.log(mulTxt)
    let gameState  = document.getElementById("replace-state");
    gameState.innerHTML = mulTxt;

    let btnJoin = document.getElementById("getTextBtn");
    let txtApiKey;
    let isGamePlayable;
    
    btnJoin.addEventListener("click", async (event) => {
        txtApiKey = document.getElementById("myTextInput").value;
        isGamePlayable = await setApiKeyWeb(txtApiKey);
        console.log(`api key : ${txtApiKey}`)
        console.log(`state : ${isGamePlayable}`)
        if (isGamePlayable == "Game can start") {
            return handleGame2Players(txtApiKey, 2, 0);
        }
    });
}