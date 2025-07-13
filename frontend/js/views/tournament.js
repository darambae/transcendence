import { actualizeIndexPage, loadTemplate, fetchWithRefresh } from "../utils.js"
import { setSSE, getSSE, handleGame2Players } from "./utils/commonFunctions.js"
import { getCookie } from "../utils.js"
import { handleInvitSubmit } from "./invits.js";
import { localGameTr } from "./tournamentLocalGame.js";
import { onlineGameTr } from "./tournamentOnlineGaame.js";
import { getOtherUserAvatar } from "./card_profile.js";
import { routes } from "../routes.js"

const csrf = getCookie('csrftoken');

export let routesTr = {
  matchSp : {
    template : "singlePlayTournament",
    controller : localGameTr
  },
  matchOnline : (key, playerID, isAiGame, JWTid, tkey, round) => ({
    template : "multiplayerTournament",
    controller : () => onlineGameTr(key, playerID, isAiGame, JWTid, tkey, round)
  }),
  tournament : { 
    template : "tournament",
    controller : tournamentController
  }
}


export function invitsController() {
  const modalContainer = document.getElementById("modal-container");

  let form = document.getElementById("log-form");
  if (form) {
    form.addEventListener("submit", (e) => {
      handleInvitSubmit(e, form) 
      e.preventDefault();
    });
  }
}


export async function refreshTournament(csrf, ulDropdown, ulElem) {
  let trnmt;
  await fetchWithRefresh('tournament/tournament', {
    headers: {
      'X-CSRFToken': csrf,
    },
    credentials: "include"
  })

    .then(response => {
      if (!response.ok) throw new Error("https Error: " + response.status);
      return response.json();
    })
    .then(data => {
      console.log("Données reçues TrnmtKey:", data["list"]);
      trnmt = data["list"];
    })
    .catch(error => {
      console.error("Erreur de requête :", error);
      throw error;
    });

  ulElem.innerHTML = "";

  for (const key in trnmt) {
    const html = `
          <tr>
            <td id="${key}">
              <button  class="profile-btn dropdown-item" data-view="${key}">
                ${key} - ${trnmt[key]}
              </button>
            </td>
          </tr>
        `;

    ulElem.innerHTML += html;
  }
}

async function createEvent(csrf, ulDropdown, ulElem) {
  console.log("Hey 3")

  await fetchWithRefresh('tournament/tournament', {
    method: 'POST',
    headers: {
      'X-CSRFToken': csrf,
      'Content-Type': 'application/json',
    },
    credentials: "include",
    body: JSON.stringify({ "action": "create" })
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
  refreshTournament(csrf, ulDropdown, ulElem);
}


function diplayListStatus(status) {
  const statusList = document.getElementById("divlistTournament")

  statusList.style.display = status;
}

function setPositionTournamentList(pos) {
  const container = document.getElementById("listPlayerGameTournament");


  container.style.position = pos;
  if (pos == "relative") {
    container.style.display = "none";
  }
  else {
    container.style.display = "block";
  }
  localStorage.setItem("container-position-tournamentList", pos);
}


function listTournament(csrf, ulDropdown, ulElem) {
  const createButton = document.getElementById("create-trnmt");
  const container = document.getElementById("listPlayerGameTournament");

  refreshTournament(csrf, ulDropdown, ulElem);

  const savedPos = localStorage.getItem("container-position-tournamentList");

  if (savedPos) {
    container.style.position = savedPos || 'relative';
    affichUserTournament()
  }

  createButton.addEventListener("click", () => {
    createEvent(csrf, ulDropdown, ulElem)
  })
}


export async function affichUserTournament() {
  const idtournament = document.getElementById("idtournament");
  const idNBtournament = document.getElementById("idNBtournament");
  const idplayerInTournament = document.getElementById("idplayerInTournament")
  const divGuest = document.getElementById("guest-add");


  if (!idtournament || !idNBtournament || !idplayerInTournament) {
    return;
  }

  idplayerInTournament.innerHTML = "";

  const response = await fetch('tournament/me', {
    headers: {
      'X-CSRFToken': csrf,
    },
    credentials: "include",
  })
  const data = await response.json();

  if (data.number == 4) {
    divGuest.innerHTML = ""
    divGuest.style.display = "none";
  }
  else if (data.number >= 1) {
    let text = await fetch('./templates/invits.html')
    text = await text.text()
    divGuest.innerHTML = text
    divGuest.style.display = "block";
  }
  console.log("data tournament :", data);

  if (response.ok) {
    idtournament.textContent = data.Tournament
    idNBtournament.textContent = data.number + " / 4"

    if (data.players) {


      let i = 0;
      for (const pl of data.players) {
        const html = `
              <button
                class="profile-btn section"
                data-username="${pl}"
                style="cursor: pointer; background-color: rgba(0, 33, 83, 0); border: none; padding: 0; color: rgb(255, 255, 255);">
                
                <h6 class="mb-2">${pl}</h6>
                <img
                  id="avatarother${i}"
                  alt="Avatar User"
                  src="/assets/img/default.png"
                  class="rounded-circle img-responsive"
                  width="128"
                  height="128"
                />
              </button>
      `;
        idplayerInTournament.innerHTML += html;
        getOtherUserAvatar(pl, i)
        i++;
      }
      document.querySelectorAll('.profile-btn').forEach(btn => {
        btn.addEventListener('click', async function () {
          const username = btn.dataset.username;
          await actualizeIndexPage('modal-container', routes.card_profile(username))
        })
      })
      invitsController()
    }
  }
}




export async function tournamentController() {
  const ulDropdown = document.getElementById("trnmt-list-ul");
  const ulElem = document.getElementById("trnmt-list-ul");
  listTournament(csrf, ulDropdown, ulElem)

  let SSEStream;
  let leaveButton = undefined;
  let launchButton = undefined;
  //const tournamentInfo = document.getElementById("Tournament-info");
  const tournamentLeave = document.getElementById("Tournament-leave");
  const tournamentGame = document.getElementById("Tournament-game");
  const tournamentLaunch = document.getElementById("Tournament-launch");
  const refreshButton = document.getElementById("refresh-trnmt");
  const divGuest = document.getElementById("guest-add");

  try {
    await fetchWithRefresh('tournament/me', {
      headers: {
        'X-CSRFToken': csrf,
      },
      credentials: "include",
    })
      .then(response => {
        if (!response.ok) throw new Error("https Error: " + response.status);
        return response.json()
      })
      .then(async data => {
        console.log("dat : ", data);
        if (data.Tournament != "None") {
          let usernameJwt;
          let jwtInfo;
          let guestJwt;
          const trId = data.Tournament;


          // Check if the clicked element is an <a> tag
          await fetchWithRefresh("tournament/check-sse", {
            headers: {
              'X-CSRFToken': csrf,
            },
            credentials: "include",
          })
            .then(async response => {
              if (!response.ok) throw new Error("https Error: " + response.status);
              jwtInfo = await response.json();
              console.log("inf : ", jwtInfo);
              usernameJwt = jwtInfo["key"];
              guestJwt = jwtInfo["guests"]
            })
            .then(async data => {
              console.log("Données reçues Join:", trId);
              const url_sse = `tournament/events?tKey=${trId}&name=${usernameJwt}&guests=${guestJwt}`;
              SSEStream = getSSE();
              console.log(SSEStream);
              if (SSEStream === undefined) {
                SSEStream = new EventSource(url_sse);
                setSSE(SSEStream);
              }
              SSEStream.onmessage = function (event) {
                try {
                  console.log("ggg", event.data);
                  const data = JSON.parse(event.data);
                  console.log("eee", data);
                  console.log("fff", data.t_state);
                  if (data.t_state == "game-start") {
                    console.log("SSE 1")
                    const buttonGame = document.createElement("button");
                    console.log("SSE 2")
                    buttonGame.className = "btn btn-outline-primary";
                    console.log("SSE 3")
                    buttonGame.textContent = "Launch game";
                    console.log("SSE 4")
                    buttonGame.dataset.type = data.mode;
                    console.log("SSE 5")
                    if (data.mode == "local") {
                      console.log("SSE 6")
                      buttonGame.dataset.p1 = data.player1;
                      console.log("SSE 7")
                      buttonGame.dataset.p2 = data.player2;
                    }
                    else {
                      buttonGame.dataset.player = data.player;
                      buttonGame.dataset.playerId = data.playerId;
                      console.log("done");
                    }
                    console.log("SSE 8")
                    buttonGame.dataset.key = data.key;
                    buttonGame.dataset.tkey = data.tkey
                    buttonGame.dataset.round = data.round;
                    console.log("SSE 9")
                    tournamentGame.innerHTML = "";
                    console.log("SSE 10")
                    tournamentGame.appendChild(buttonGame);
                    console.log("SSE 11")
                  }
                  else if (data.t_state == "game-finished") {
                    actualizeIndexPage("contentTournementPage", routesTr['tournament'])
                    console.log("sse data: ", data.next)
                    if (data.next == "final-rounds") {
                      fetchWithRefresh("tournament/finals", {
                        method: "POST",
                        headers: {
                          'X-CSRFToken': csrf,
                          'Content-Type': 'application/json',
                        },
                        credentials: 'include',
                        body: JSON.stringify({ "tKey": data.tkey })
                      })
                    }
                    else {
                      fetchWithRefresh("tournament/next", {
                        method: "POST",
                        headers: {
                          'X-CSRFToken': csrf,
                          'Content-Type': 'application/json',
                        },
                        credentials: 'include',
                        body: JSON.stringify({ "tKey": data.tkey })
                      })
                        .then(response => {
                          if (!response.ok) throw new Error("https Error: " + response.status);
                          return response.json()
                        })
                        .then(data => {
                          console.log("NEXT : ", data)
                        })
                    }
                  }
                }
                catch (error) {
                  console.log("Error", error);
                }
              };

              leaveButton = document.createElement("button");
              leaveButton.id = trId;
              leaveButton.className = "btn btn-outline-secondary";
              leaveButton.textContent = "Leave";

              launchButton = document.createElement("button");
              launchButton.id = trId;
              launchButton.className = "btn btn-outline-secondary";
              launchButton.textContent = "Start";

              tournamentLeave.appendChild(leaveButton)
              tournamentLaunch.appendChild(launchButton);



              await fetchWithRefresh("tournament/next", {
                method: "POST",
                headers: {
                  'X-CSRFToken': csrf,
                  'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({ "tKey": trId })
              })
                .then(response => {
                  if (!response.ok) throw new Error("https Error: " + response.status);
                  return response.json()
                })
                .then(data => {
                  console.log("NEXT : ", data)
                });

              return invitsController()
            })
            .catch(error => {
              console.log("Erreur de requête :", error);
            });
        } else {
          setPositionTournamentList("relative");
        }
      })
  }
  catch (error) {
    console.log("Error : ", error);
  }

  console.log("csrf:", csrf);
  console.log("HEY 1")




  ulDropdown.addEventListener('click', async (event) => {
    const target = event.target;
    let usernameJwt;
    let jwtInfo;
    let guestJwt;


    console.log("entree")

    // Check if the clicked element is an <a> tag
    if (target.tagName === "BUTTON") {
      event.preventDefault();
      const view = target.dataset.view;
      console.log("aaaaa", view);
      const btnId = document.getElementById(view)


      try {
        await fetchWithRefresh("tournament/check-sse", {
          headers: {
            'X-CSRFToken': csrf,
          },
          credentials: "include",
        })
          .then(async response => {
            if (!response.ok) throw new Error("https Error: " + response.status);
            console.log("response : ", response)
            jwtInfo = await response.json();
            console.log("------------------------->>> ", jwtInfo);
            usernameJwt = jwtInfo["key"];
            guestJwt = jwtInfo["guests"]
          })
      }
      catch (error) {
        console.log("Error : ", error);
      }

      await fetchWithRefresh("tournament/tournament", {
        method: 'POST',
        headers: {
          'X-CSRFToken': csrf,
          'Content-Type': 'application/json',
        },
        credentials: "include",
        body: JSON.stringify({ "action": "join", "tKey": view })
      })
        .then(response => {
          console.log("aaa1", response)
          btnId.style.backgroundColor = "red";
          if (!response.ok) throw new Error("https Error: " + response.status);
          return response.json();
        })
        .then(async data => {
          btnId.style.backgroundColor = "green";
          console.log("Données reçues Join:", data["key"]);
          const url_sse = `tournament/events?tKey=${data["key"]}&name=${usernameJwt}&guests=${guestJwt}`;
          SSEStream = new EventSource(url_sse);
          setSSE(SSEStream);
          SSEStream.onmessage = function (event) {
            try {
              console.log("iii", event.data);
              const data = JSON.parse(event.data);
              console.log("jjj", data);
              console.log("kkk", data.t_state);
              if (data.t_state == "game-start") {
                console.log("SSE 1")
                const buttonGame = document.createElement("button");
                console.log("SSE 2")
                buttonGame.className = "btn btn-outline-primary";
                console.log("SSE 3")
                buttonGame.textContent = "Launch game";
                console.log("SSE 4")
                buttonGame.dataset.type = data.mode;
                console.log("SSE 5")
                if (data.mode == "local") {
                  console.log("SSE 6")
                  buttonGame.dataset.p1 = data.player1;
                  console.log("SSE 7")
                  buttonGame.dataset.p2 = data.player2;
                }
                else {
                  buttonGame.dataset.player = data.player;
                  buttonGame.dataset.playerId = data.playerId;
                  console.log("done");
                }
                console.log("SSE 8")
                buttonGame.dataset.round = data.round;
                buttonGame.dataset.key = data.key;
                buttonGame.dataset.tkey = data.tkey
                console.log("SSE 9")
                tournamentGame.innerHTML = "";
                console.log("SSE 10")
                tournamentGame.appendChild(buttonGame);
                console.log("SSE 11")

              }
              else if (data.t_state == "game-finished") {
                actualizeIndexPage("contentTournementPage", routesTr['tournament'])
                console.log("sse data: ", data.next)
                if (data.next == "final-rounds") {
                  fetchWithRefresh("tournament/finals", {
                    method: "POST",
                    headers: {
                      'X-CSRFToken': csrf,
                      'Content-Type': 'application/json',
                    },
                    credentials: 'include',
                    body: JSON.stringify({ "tKey": data.tkey })
                  })
                }
                else {
                  fetchWithRefresh("tournament/match", {
                    method: "POST",
                    headers: {
                      'X-CSRFToken': csrf,
                      'Content-Type': 'application/json',
                    },
                    credentials: 'include',
                    body: JSON.stringify({ "tKey": data.tkey })
                  })
                }
              }
            }
            catch (error) {
              console.log("Error", error);
            }
          };


          leaveButton = document.createElement("button");
          leaveButton.id = view;
          leaveButton.className = "btn btn-outline-secondary";
          leaveButton.textContent = "Leave";

          launchButton = document.createElement("button");
          launchButton.id = view;
          launchButton.className = "btn btn-outline-secondary";
          launchButton.textContent = "Start";

          tournamentLeave.appendChild(leaveButton)
          tournamentLaunch.appendChild(launchButton);
          refreshTournament(csrf, ulDropdown, ulElem)

          
          setPositionTournamentList("absolute")
          affichUserTournament()


          return invitsController()
        })
        .catch(error => {
          console.error("Erreur de requête :", error);
          throw error;
        });
    };
  })

  tournamentLeave.addEventListener('click', async (event) => {
    const target = event.target;

    if (target.tagName === "BUTTON") {
      event.preventDefault();
      await fetchWithRefresh("tournament/tournament", {
        method: 'POST',
        headers: {
          'X-CSRFToken': csrf,
          'Content-Type': 'application/json',
        },
        credentials: "include",
        body: JSON.stringify({ "action": "leave", "tKey": target.id })
      })
        .then(response => {
          if (!response.ok) throw new Error("https Error: " + response.status);
          return response.json();
        })
        .then(data => {
          SSEStream.close();
          //tournamentInfo.innerHTML = "";
          tournamentLaunch.innerHTML = ""
          tournamentLeave.innerHTML = ""
          divGuest.innerHTML = "";
          listTournament(csrf, ulDropdown, ulElem)
          setPositionTournamentList("relative")
        })
        .catch(error => {
          console.error("Erreur de requête :", error);
          throw error;
        });
    }
  })


  tournamentLaunch.addEventListener('click', async (event) => {
    const target = event.target;

    if (target.tagName === "BUTTON") {
      event.preventDefault();
      const view = target.id;

      await fetchWithRefresh("tournament/match", {
        method: "POST",
        headers: {
          'X-CSRFToken': csrf,
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ "tKey": view })
      })
        .then(response => {
          if (!response.ok) throw new Error("https Error: " + response.status);
          return response.json();
        })
        .then(data => {
          //tournamentInfo.innerHTML = `<h6>${data["Info"]}</h6>`;
        })
        .catch(error => {
          console.error("Erreur de requête :", error);
          throw error;
        });
    }
  })


  tournamentGame.addEventListener('click', (event) => {
    const target = event.target;

    if (target.tagName === "BUTTON") {
      event.preventDefault();

      const KeepInfo = document.getElementById("contentTournementPage");
      // const contentInfo = KeepInfo.innerHTML;

      if (target.dataset.type == "local") {
        localStorage.setItem("p1", target.dataset.p1);
        localStorage.setItem("p2", target.dataset.p2);
        localStorage.setItem("key", target.dataset.key);
        localStorage.setItem("tkey", target.dataset.tkey);
        console.log("Target.dataset", target.dataset);
        fetchWithRefresh(`tournament/supervise?key=${target.dataset.key}&tkey=${target.dataset.tkey}&round=${target.dataset.round}`, {
          credentials: "include",
        })
          .then(response => {
            if (!response.ok) throw new Error("https Error: " + response.status);
            return response.json();
          })
          .then(data => {
            console.log(data);
          })

        return actualizeIndexPage("contentTournementPage", routesTr['matchSp']);
      }
      else {
        return actualizeIndexPage("contentTournementPage", routesTr['matchOnline'](target.dataset.key, target.dataset.playerId, 0, -1, target.dataset.tkey, target.dataset.round));
      }
    }
  })
}
