import { getPlayersLocalName } from "./utils/commonFunctions.js"
import { adress } from "./utils/commonFunctions.js";
import { drawMap } from "./utils/commonFunctions.js";

export async function localGameController() {
    let [p1Name, p2Name, key] = getPlayersLocalName();

    let url_sse = `https://${adress}:8443/server-pong/events?apikey=${key}&idplayer=${0}&ai=${0}`;
    let url_post = `https://${adress}:8443/server-pong/send-message`;
    let started = false;
    let game_stats;
    document.getElementById("player1Username").innerHTML = p1Name;
    document.getElementById("player2Username").innerHTML = p2Name;
    // ctx.clearRect(0, 0, canvas.width, canvas.height);

    let score1 = document.getElementById("player1score")
    let score2 = document.getElementById("player2score")
    const SSEStream = new EventSource(url_sse);
    SSEStream.onmessage = function(event) {
        try {
            // console.log("Heyyo");
            const data = JSON.parse(event.data);
            // console.log(data);
            game_stats = data["game_stats"]
            if (game_stats["State"] != "Waiting for start" ) {  
                drawMap(game_stats["ball"]["position"], game_stats["player1"], game_stats["player2"]);
                score1.innerHTML = game_stats["team1Score"]
                score2.innerHTML = game_stats["team2Score"]
            }
        } catch (error) {
            // console.log("ParsingError: ", error)
        }
    }

    window.onbeforeunload = function(event) {
        // console.log("Détection du rechargement ou fermeture de la page");
        if (SSEStream.readyState !== EventSource.CLOSED) {
            // console.log("La connexion SSE va être fermée lors du rechargement.");
            logErrorToLocalStorage("La connexion SSE va être fermée lors du rechargement.");
            // Tu peux aussi essayer de fermer proprement la connexion ici si tu veux
            SSEStream.close();
        }
        else {
          // console.log("Yes");
        }
      };

      document.addEventListener('keydown', async function(event) {
            switch(event.key) {
                case "p" :
                    if (started == false) {
                        started = true;
                        fetch(url_post, {
                            method: 'POST',
                            headers: {
                              'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({"apiKey": key, "message": '{"action": "start"}'})
                          });
                    };
                    break;
                case "q" :
                    // console.log("Started : ", started);
                    if (started == true) {
                      fetch(`https://${adress}:8443/server-pong/forfait-game?apikey=${key}&idplayer=${2}`)
                    }
                    break;
                case "l" :
                    // console.log("Started : ", started);
                    if (started == true) {
                      await fetch(`https://${adress}:8443/server-pong/forfait-game?apikey=${key}&idplayer=${1}`);
                    }
                    break;
                case "ArrowUp" : 
                    fetch(url_post, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({"apiKey": key, "message": '{"action": "move", "player2": "up"}'})
                    });
                case "w" :
                    fetch(url_post, {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({"apiKey": key, "message": '{"action": "move", "player1": "up"}'})
                    });
                    break;
                case "ArrowDown" :
                    fetch(url_post, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({"apiKey": key, "message": '{"action": "move", "player2": "down"}'})
                  });
                case "s" :
                    fetch(url_post, {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({"apiKey": key, "message": '{"action": "move", "player1": "down"}'})
                      });
                    break;
            }
        })
}
