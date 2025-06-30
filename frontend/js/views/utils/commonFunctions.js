import { versusController } from "../versusGame.js";
import { homeController } from "../home.js";
import { localGameController } from "../localGame.js";
import { loginController } from "../login.js";
import { getCookie } from "../../utils.js";

let sseTournament;
export let adress = "10.18.161"
let canvas;
let ctx;

export function setSSE(sseObj) {
  sseTournament = sseObj;
}

export function getSSE() {
  return sseTournament;
}

export const routesSp = {
	home: {
		template: 'home',
		controller: homeController,
	},
  playerSelection: {
    template: 'versusGame',
    controller: versusController,
  },
  game : {
    template: 'localGame',
    controller: localGameController,
  },
  multiplayerGame : {
    template: 'localGame',
  },
  invit : {
    template : 'login',
    controller: loginController,
  }
  };

let keySp;
export function setPlayersLocalName(apikey) {
  keySp = apikey;
};

export function getPlayersLocalName() {
  return (keySp)
}

export function setCanvasAndContext() {
  canvas = document.getElementById("gameCanvas");
  ctx = canvas.getContext("2d");
  ctx.font = "20px Arial";
	ctx.fillStyle = "blue";
}

function fillCircle(ctx, x, y, radius, color = 'black') {
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
  }

export function drawMap(ballPos, Racket1Pos, Racket2Pos) {
  ctx.fillStyle = "purple";
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.fillRect(0, 0, 1000, 15);
  ctx.fillRect(0, 600, 1000, 15);
  const dx1 = Racket1Pos[1][0] - Racket1Pos[0][0];
  const dy1 = Racket1Pos[1][1] - Racket1Pos[0][1];
  const dx2 = Racket2Pos[1][0] - Racket2Pos[0][0];
  const dy2 = Racket2Pos[1][1] - Racket2Pos[0][1];
  const d1 = Math.sqrt(dx1 * dx1 + dy1 * dy1);
  const d2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);
  ctx.fillRect(Racket1Pos[0][0], Racket1Pos[0][1], 5, d1);
  ctx.fillRect(Racket2Pos[0][0], Racket2Pos[0][1], 5, d2);
  fillCircle(ctx, ballPos[0], ballPos[1], 10);
}

export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function handleGame2Players(key, playerID, isAiGame, JWTid) {
  // console.log(adress);
  let url_post = `server-pong/send-message`;
  let started = false;
  let game_stats;
  let a = undefined;
  let b = undefined;
  let c = undefined;
  let username;
  const csrf = getCookie('csrftoken');
  ctx.clearRect(0, 0, canvas.width, canvas.height)

  let mul = await fetch('./templates/localGame.html')
  let mulTxt = await mul.text()
  
  let gameState  = document.getElementById("replace-state");
  gameState.innerHTML = mulTxt;
  
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
    let url_sse = `server-pong/events?apikey=${key}&idplayer=${playerID}&ai=${isAiGame}&JWTid=${JWTid}&username=${username}`;
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

    const SSEStream = new EventSource(url_sse);
  
  SSEStream.onerror = function(event) {
    console.error("Erreur SSE :", event);

    // L'objet "event" n'a pas de "reason" directement, mais tu peux diagnostiquer via :
    // - source.readyState
    // - vérification manuelle du serveur (logs backend)
    if (SSEStream.readyState === EventSource.CLOSED) {
        console.warn("Connexion SSE fermée.");
    } else if (SSEStream.readyState === EventSource.CONNECTING) {
        console.warn("Reconnexion en cours...");
    } else {
        console.warn("État inconnu :", SSEStream.readyState);
    }
};

  SSEStream.onmessage = function(event) {
      try {
        // const data = JSON.parse(event.data);
        // // console.log("Received data: ", data);
        // console.log("Heyyo");
        const data = JSON.parse(event.data);

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
        SSEStream.close();
    }
    else {
      // console.log("Yes");
    }
  };

  document.addEventListener('keydown', function(event) {
      switch(event.key) {
          case "p" :
              if (playerID == 1 && started == false) {
                  started = true;
                  fetch(url_post, {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        'X-CSRFToken': csrf,
                      },
                      credentials: 'include',
                      body: JSON.stringify({"apiKey": key, "message": '{"action": "start"}'})
                    });
              };
              break;
          case "q" :
              // console.log("Started : ", started);
              if (started == true) {
                fetch(`server-pong/forfait-game?apikey=${key}&idplayer=${playerID}`, {
                  headers: {
                    'X-CSRFToken': csrf,
                  },
                  credentials: 'include',
                });
              }
              break;
          case "ArrowUp" : 
              if (playerID == 1) { 
                  fetch(url_post, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': csrf,
                  },
                  credentials: 'include',
                  body: JSON.stringify({"apiKey": key, "message": '{"action": "move", "player1": "up"}', "player" : "1"})
                });
              }
              else {
                  fetch(url_post, {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        'X-CSRFToken': csrf,
                      },
                      credentials: 'include',
                      body: JSON.stringify({"apiKey": key, "message": '{"action": "move", "player2": "up"}', "player" : "2"})
                    });
              } ;
              break;
          case "ArrowDown" :
              if (playerID == 1) { 
                  fetch(url_post, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': csrf,
                  },
                  credentials: 'include',
                  body: JSON.stringify({"apiKey": key, "message": '{"action": "move", "player1": "down"}', "player" : "1"})
                });
              }
              else {
                  fetch(url_post, {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        'X-CSRFToken': csrf,
                      },
                      credentials: 'include',
                      body: JSON.stringify({"apiKey": key, "message": '{"action": "move", "player2": "down"}', "player" : "2"})
                    });
              } ;
              break;
      }
  })

}

export async function loadGamePlayable(apikey) {
  let isPlayable;
  const csrf = getCookie('csrftoken');

    await fetch(`server-pong/game-status?apikey=${apikey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrf,
        },
        credentials: 'include',
        body: JSON.stringify({"apiKey": apikey})
      })
      .then(response => {
          if (!response.ok) throw new Error("https Error: " + response.status);
          return response.json();
        })
        .then(data => {
          console.log("Données reçues loadPlayable:", data["playable"]);
          isPlayable =  data["playable"]
        })
        .catch(error => {
          console.error("Erreur de requête :", error);
        })
    // console.log("isPlayable :", isPlayable);
    return isPlayable;
}

export async function setApiKeyWeb(apikey) {
  console.log("apikey Set : ", apikey);
  const csrf = getCookie('csrftoken');
  return await fetch(`server-pong/api-key`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRFToken': csrf,
    },
    credentials: 'include',
    body: JSON.stringify({ "apiKey": apikey })
  })
  .then(response => {
    if (!response.ok) throw new Error("https Error: " + response.status);
    return response.json();
  })
  .then(data => {
    console.log("Données reçues SetKey:", data["playable"]);
    return data["playable"];
  })
  .catch(error => {
    console.error("Erreur de requête :", error);
    throw error;
  });
}

export async function setApiKeyWebSP(apikey) {
  // console.log("apikey Set : ", apikey);
  const csrf = getCookie('csrftoken');
  return fetch(`server-pong/api-key-alone`, {
    method: 'POST',
    headers: {
      'X-CSRFToken': csrf,
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({ "apiKey": apikey })
  })
  .then(response => {
    if (!response.ok) throw new Error("https Error: " + response.status);
    return response.json();
  })
  .then(data => {
    // console.log("Données reçues SetKey:", data["playable"]);
    return data["playable"];
  })
  .catch(error => {
    console.error("Erreur de requête :", error);
    throw error;
  });
}