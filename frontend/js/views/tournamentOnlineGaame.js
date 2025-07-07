import { getSSE } from "./utils/commonFunctions";

export async function onlineGameTr(key, playerID, isAiGame, JWTid, tkey) {

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

    let sseTournament = getSSE();

    sseTournament.onmessage = function(event) {
        try {
          console.log(event.data);
          const data = JSON.parse(event.data);
          console.log(data);
          if (data.t_state == "game-finished") {
            actualizeIndexPage("Tournament-Lobby", routesTr['tournament'])
            // console.log("sse data: ", data.next)
            // if (data.next == "final-rounds") {
            //   fetch("tournament/finals", {
            //     method: "POST",
            //     headers: {
            //       'X-CSRFToken': csrf, 
            //       'Content-Type': 'application/json', 
            //     },
            //     credentials: 'include',
            //     body: JSON.stringify({"tKey" : data.tkey})
            //   })
            // }
            // else {
            //   fetch("tournament/next", {
            //     method: "POST",
            //     headers: {
            //       'X-CSRFToken': csrf, 
            //       'Content-Type': 'application/json', 
            //     },
            //     credentials: 'include',
            //     body: JSON.stringify({"tKey" : data.tkey})
            //   })
            // }
          }
        }
        catch(error) {
          console.log("Error sseTournament :", error);
        }
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