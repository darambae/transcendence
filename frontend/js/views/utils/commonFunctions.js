export let adress = "localhost"
let canvas;
let ctx;

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
function drawMap(ballPos, Racket1Pos, Racket2Pos) {
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

export async function handleGame2Players(key, playerID, isAiGame) {
  console.log(adress);
  let url_sse = `https://${adress}:8443/server-pong/events?apikey=${key}&idplayer=${playerID}&ai=${isAiGame}`;
  let url_post = `https://${adress}:8443/server-pong/send-message`;
  let started = false;
  let game_stats;
  ctx.clearRect(0, 0, canvas.width, canvas.height)

    
  const SSEStream = new EventSource(url_sse);
  SSEStream.onmessage = function(event) {
      try {
        // const data = JSON.parse(event.data);
        // console.log("Received data: ", data);
        console.log("Heyyo");
        const data = JSON.parse(event.data);
        console.log(data);
        game_stats = data["game_stats"]
        if (game_stats["State"] != "Waiting for start" ) {  
          drawMap(game_stats["ball"]["position"], game_stats["player1"], game_stats["player2"]);
        }
      } catch (error) {
        console.log("ParsingError: ", error)
      }
  }

  window.onbeforeunload = function(event) {
    console.log("Détection du rechargement ou fermeture de la page");
    if (SSEStream.readyState !== EventSource.CLOSED) {
        // Si la connexion SSE est toujours ouverte, on peut loguer une erreur
        console.log("La connexion SSE va être fermée lors du rechargement.");
        logErrorToLocalStorage("La connexion SSE va être fermée lors du rechargement.");
        // Tu peux aussi essayer de fermer proprement la connexion ici si tu veux
        SSEStream.close();
    }
    else {
      console.log("Yes");
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
                        'Content-Type': 'application/json'
                      },
                      body: JSON.stringify({"apiKey": key, "message": '{"action": "start"}'})
                    });
              };
              break;
          case "q" :
              console.log("Started : ", started);
              if (started == true) {
                fetch(`https://${adress}:8443/server-pong/forfait-game?apikey=${key}&idplayer=${playerID}`);
              }
              break;
          case "ArrowUp" : 
              if (playerID == 1) { 
                  fetch(url_post, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify({"apiKey": key, "message": '{"action": "move", "player1": "up"}'})
                });
              }
              else {
                  fetch(url_post, {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json'
                      },
                      body: JSON.stringify({"apiKey": key, "message": '{"action": "move", "player2": "up"}'})
                    });
              } ;
              break;
          case "ArrowDown" :
              if (playerID == 1) { 
                  fetch(url_post, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify({"apiKey": key, "message": '{"action": "move", "player1": "down"}'})
                });
              }
              else {
                  fetch(url_post, {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json'
                      },
                      body: JSON.stringify({"apiKey": key, "message": '{"action": "move", "player2": "down"}'})
                    });
              } ;
              break;
      }
  })

}

export async function loadGamePlayable(apikey) {
  let isPlayable;

    await fetch(`https://${adress}:8443/server-pong/game-status?apikey=${apikey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
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
    console.log("isPlayable :", isPlayable);
    return isPlayable;
}

export async function setApiKeyWeb(apikey) {
  console.log("apikey Set : ", apikey);
  return fetch(`https://${adress}:8443/server-pong/api-key`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
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