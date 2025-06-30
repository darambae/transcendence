import { getCookie } from "../utils.js";
import { getPlayersLocalName } from "./utils/commonFunctions.js"
import { adress } from "./utils/commonFunctions.js";
import { drawMap } from "./utils/commonFunctions.js";
import { setCanvasAndContext, setSSE, getSSE } from "./utils/commonFunctions.js";

export async function localGameTr(id1, id2, key, tkey) {
    let url_post = `server-pong/send-message`;
    let started = false;
    let game_stats;
    let sseTournament = getSSE();
    const csrf = getCookie("csrftoken");
    let username;
    let a;
    let b;
    let c;

    // console.log("aaa")
    // sseTournament.onmessage = function(event) {
    //   try {
    //     console.log(event.data);
    //     const data = JSON.parse(event.data);
    //     console.log(data);
    //     if (data.t_state == "game-finished") {
    //       return ;
    //     }
    //   }
    //   catch(error) {
    //     console.log(error)
    //   }
    // }
    // console.log("bbb")

    await fetch('tournament/id-players', {
        method : "POST",
        headers : {
            'Content-Type': 'application/json', 
            'X-CSRFToken': csrf,
        },
        credentials: "include", 
        body : JSON.stringify({"tkey" : tkey, "u1" : id1, "u2" : id2})
    })
    .then(response => {
        if (!response.ok) throw new Error("https Error: " + response.status);
        return response.json();
    })
    .then(data => {
        id1 = data.id1
        id2 = data.id2
    })

    // ctx.clearRect(0, 0, canvas.width, canvas.height);

    await fetch(`server-pong/check-sse`, {
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
        console.log("data", data);
        ([a,b,c] = data["guest"])
        username = data["username"]
      })
      .catch(error => {
        console.error("Erreur de requête :", error);
      })
      console.log("results: ", username, a, b, c)
      let url_sse = `server-pong/events?apikey=${key}&idplayer=0&ai=0&JWTidP1=${id1}&JWTidP2=${id2}&username=${username}`;
      if (a !== undefined) {
        url_sse += `&guest1=${a}`
      }
      if (b !== undefined) {
        url_sse += `&guest2=${b}`
      }
      if (c !== undefined) {
        url_sse += `&guest3=${c}`
      }
  
      console.log("url_sse ->->-> ", url_sse);
      
      await setCanvasAndContext();
      const SSEStream = new EventSource(url_sse);
    SSEStream.onmessage = function(event) {
      try {
        const data = JSON.parse(event.data);
        console.log("Received data: ", data);
        // console.log("Heyyo");
        // const data = JSON.parse(event.data);

        let sc1 = document.getElementById("player1score");
        let sc2 = document.getElementById("player1score");

        // console.log(data);
        game_stats = data["game_stats"]
        if (game_stats["State"] != "Waiting for start" ) {  
          if (started == false) {
            started = true;
          }
          if (game_stats["State"] != "playersInfo") {
            // console.log("AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA")
            drawMap(game_stats["ball"]["position"], game_stats["player1"], game_stats["player2"]);
            sc1.innerHTML = game_stats["team1Score"];
            sc2.innerHTML = game_stats["team2Score"];
          }
          else {
            // console.log("BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB")
            let p1 = document.getElementById("player1Username");
            let p2 = document.getElementById("player2Username");

            p1.innerHTML = game_stats["p1"][0]
            p2.innerHTML = game_stats["p2"][0]

          }
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
                        fetch(`tournament/supervise?key=${key}&tkey=${tkey}`);
                    };
                    break;
                case "q" :
                    // console.log("Started : ", started);
                    if (started == true) {
                      await fetch(`server-pong/forfait-game?apikey=${key}&idplayer=${2}`, {
                        headers: {
                          "Authorization" : `bearer ${sessionStorage.getItem("accessToken")}`
                        }
                      });
                    }
                    break;
                case "l" :
                    // console.log("Started : ", started);
                    if (started == true) {
                      await fetch(`server-pong/forfait-game?apikey=${key}&idplayer=${1}`, {
                        headers: {
                          "Authorization" : `bearer ${sessionStorage.getItem("accessToken")}`
                        }
                      });
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
                    break;
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
                  break;
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
