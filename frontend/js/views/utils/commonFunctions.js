import { versusController } from "../versusGame.js";
import { homeController } from "../home.js";
import { localGameController } from "../localGame.js";
import { loginController } from "../login.js";
import { getCookie, fetchWithRefresh } from "../../utils.js";
import { guideTouch, drawCenterTextP, checkwin } from "../localGame.js";
import { drawCenterText } from "../multiplayer.js"

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


function updateServerPosition(newX, newY) {
  currentPos.x = targetPos.x;
  currentPos.y = targetPos.y;
  targetPos.x = newX;
  targetPos.y = newY;
  lastUpdateTime = performance.now();
}

function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
  ctx.fill();
}

function fillCircle(ctx, x, y, r) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = "white";
  ctx.fill();
  ctx.closePath();
}


export function drawMap(ballPos, Racket1Pos, Racket2Pos) {
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');
  
  const fieldWidth = 1000;
  const fieldHeight = 600;
  const offsetX = (canvas.width - fieldWidth) / 2;
  const offsetY = (canvas.height - fieldHeight) / 2;
  
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const dx1 = Racket1Pos[1][0] - Racket1Pos[0][0];
  const dy1 = Racket1Pos[1][1] - Racket1Pos[0][1];
  const d1 = Math.sqrt(dx1 * dx1 + dy1 * dy1);
  ctx.fillStyle = "white";
  roundRect(ctx, Racket1Pos[0][0] + offsetX, Racket1Pos[0][1] + offsetY, 4, d1, 3);
  
  const dx2 = Racket2Pos[1][0] - Racket2Pos[0][0];
  const dy2 = Racket2Pos[1][1] - Racket2Pos[0][1];
  const d2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);
  ctx.fillStyle = "white";
  roundRect(ctx, Racket2Pos[0][0] + offsetX, Racket2Pos[0][1] + offsetY, 4, d2, 3);

  let ballX = Math.min(Math.max(ballPos[0], 10), fieldWidth - 10);
  let ballY = Math.min(Math.max(ballPos[1], 10), fieldHeight - 10);

  fillCircle(ctx, ballX + offsetX, ballY + offsetY, 10);
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

  if (playerID === 2) {
    drawCenterText("waiting for the player  to start the match");
    guideTouch()
  } else 
  {
    guideTouch()
    drawCenterTextP()
  }


  let mul = await fetchWithRefresh('./templates/localGame.html')
  let mulTxt = await mul.text()
  
  let gameState  = document.getElementById("idfooterCanvas");
  gameState.innerHTML = mulTxt;
  
  await fetchWithRefresh(`server-pong/check-sse`, {
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

  SSEStream.onmessage = function (event) {
      try {
        // const data = JSON.parse(event.data);
        // // console.log("Received data: ", data);
        // console.log("Heyyo");
        const data = JSON.parse(event.data);

        let sc1 = document.getElementById("player1score");
        let sc2 = document.getElementById("player2score");

        // console.log(data);
        game_stats = data["game_stats"]
        if (game_stats["State"] != "Waiting for start" ) {  
          if (started == false) {
            started = true;
          }
          if (game_stats["State"] != "playersInfo") {
            // console.log("AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA")
            drawMap(game_stats["ball"]["position"], game_stats["player1"], game_stats["player2"]);
            sc1.setAttribute("data-score", game_stats["team1Score"]);
            sc2.setAttribute("data-score", game_stats["team2Score"]);
            checkwin()
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

document.addEventListener('keydown', function (event) {
    const keysToPrevent = ['ArrowUp', 'ArrowDown', "p", "q"];
    if (keysToPrevent.includes(event.key)) {
      event.preventDefault();
      switch(event.key) {
        case "p" :
          if (playerID == 1 && started == false) {
            started = true;
            fetchWithRefresh(url_post, {
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
                  fetchWithRefresh(`server-pong/forfait-game?apikey=${key}&idplayer=${playerID}`, {
                  headers: {
                    'X-CSRFToken': csrf,
                  },
                  credentials: 'include',
                });
              }
              break;
              case "ArrowUp" : 
              if (playerID == 1) { 
                fetchWithRefresh(url_post, {
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
                fetchWithRefresh(url_post, {
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
                  fetchWithRefresh(url_post, {
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
                fetchWithRefresh(url_post, {
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
    }
  })
  
}

export async function loadGamePlayable(apikey) {
  let isPlayable;
  const csrf = getCookie('csrftoken');

    await fetchWithRefresh(`server-pong/game-status?apikey=${apikey}`, {
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
  return await fetchWithRefresh(`server-pong/api-key`, {
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
  return fetchWithRefresh(`server-pong/api-key-alone`, {
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