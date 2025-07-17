import { actualizeIndexPage, fetchWithRefresh, fetchWithRefreshNoCash } from "../utils.js"
import { getCookie } from "../utils.js"
import { handleInvitSubmit } from "./invits.js";
import { localGameTr } from "./tournamentLocalGame.js";
import { onlineGameTr } from "./tournamentOnlineGaame.js";
import { getOtherUserAvatar } from "./card_profile.js";
import { routes } from "../routes.js"

const csrf = getCookie('csrftoken');
import { launchTournamentChat, sendMessage } from './chat.js';

let sseTournament;
let launchbool = false;

export function setSSE(sseObj) {
  sseTournament = sseObj;
}

export function getSSE() {
  return sseTournament;
}

export let routesTr = {
  matchSp: {
    template: "singlePlayTournament",
    controller: localGameTr
  },
  matchOnline: (key, playerID, isAiGame, JWTid, tkey, round) => ({
    template: "multiplayerTournament",
    controller: () => onlineGameTr(key, playerID, isAiGame, JWTid, tkey, round)
  }),
  tournament: {
    template: "tournament",
    controller: tournamentController
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


export async function refreshTournament() {
  const ulElem = document.getElementById("trnmt-list-ul");
  let trnmt;

  if (!ulElem)
    return;

  await fetchWithRefreshNoCash('tournament/tournament', {
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
      trnmt = data["list"];
    })
    .catch(error => {
      console.error("Erreur de requête :", error);
      throw error;
    });

  ulElem.innerHTML = "";

  for (const key in trnmt) {
    console.log("entreee")
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

async function createEvent(csrf, ulElem) {

  await fetchWithRefreshNoCash('tournament/tournament', {
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
    // .then(data => {
    //   // // console.log("Données reçues TrnmtCreate:", data);
    //   // let trnmt = data["list"];
    // })
    .catch(error => {
      console.error("Erreur de requête :", error);
      throw error;
    });
  refreshTournament();
}


// function diplayListStatus(status) {
//   const statusList = document.getElementById("divlistTournament")

//   statusList.style.display = status;
// }

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


function listTournament(csrf, ulElem) {
  const createButton = document.getElementById("create-trnmt");
  const container = document.getElementById("listPlayerGameTournament");

  refreshTournament();

  const savedPos = localStorage.getItem("container-position-tournamentList");

  if (savedPos) {
    container.style.position = savedPos || 'relative';
    affichUserTournament()
  }

  createButton.addEventListener("click", () => {
    createEvent(csrf, ulElem)
  })
}



async function LaunchGameIntournament(data) {
  const idNBtournament = document.getElementById("idNBtournament");
  let seconds = 5;


  const interval = setInterval(() => {
    idNBtournament.textContent = seconds;

    if (seconds <= 0) {
      clearInterval(interval);
      launchGame(data)
    }
    seconds--;
  }, 1000)
}


async function launchTournament(data) {
  const avatarother0 = document.getElementById("avatarother0");
  const nameAvatarother0 = avatarother0.getAttribute("data-username")
  const avatarother2 = document.getElementById("avatarother2");
  const nameAvatarother2 = avatarother2.getAttribute("data-username")
  const avatarother4 = document.getElementById("avatarother4");
  const nameAvatarother4 = avatarother4.getAttribute("data-username")
  const avatarother6 = document.getElementById("avatarother6");
  const nameAvatarother6 = avatarother4.getAttribute("data-username")

  if (data.match1) {
    if (data.match1.player1 == nameAvatarother0) {
      avatarother0.style.order = 0;
    }
    else if (data.match1.player1 == nameAvatarother2) {
      avatarother2.style.order = 0;
    }
    else if (data.match1.player1 == nameAvatarother4) {
      avatarother4.style.order = 0;
    }
    else if (data.match1.player1 == nameAvatarother6) {
      avatarother6.style.order = 0;
    }

    if (data.match1.player2 == nameAvatarother0) {
      avatarother0.style.order = 2;
    }
    else if (data.match1.player2 == nameAvatarother2) {
      avatarother2.style.order = 2;
    }
    else if (data.match1.player2 == nameAvatarother4) {
      avatarother4.style.order = 2;
    }
    else if (data.match1.player2 == nameAvatarother6) {
      avatarother6.style.order = 2;
    }
  }
  if (data.match2) {
    if (data.match2.player1 == nameAvatarother0) {
      avatarother0.style.order = 4;
    }
    else if (data.match2.player1 == nameAvatarother2) {
      avatarother2.style.order = 4;
    }
    else if (data.match1.player1 == nameAvatarother4) {
      avatarother4.style.order = 4;
    }
    else if (data.match2.player1 == nameAvatarother6) {
      avatarother6.style.order = 4;
    }

    if (data.match2.player2 == nameAvatarother0) {
      avatarother0.style.order = 6;
    }
    else if (data.match2.player2 == nameAvatarother2) {
      avatarother2.style.order = 6;
    }
    else if (data.match2.player2 == nameAvatarother4) {
      avatarother4.style.order = 6;
    }
    else if (data.match2.player2 == nameAvatarother6) {
      avatarother6.style.order = 6;
    }
  }

}



async function startTournament(data) {
  const tournamentLeave = document.getElementById("Tournament-leave");

  tournamentLeave.innerHTML = ""

  const view = data.Tournament

  fetchWithRefresh("tournament/match", {
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
    if (launchbool == false) {
      launchbool = true;
      await startTournament(data);
    } else {
      console.log('error tournamentLaunch not found')
    }
  }
  else if (data.number >= 1) {
    let text = await fetch('./templates/invits.html')
    text = await text.text()
    divGuest.innerHTML = text
    divGuest.style.display = "block";
  }
  // console.log("data tournament :", data);

  if (response.ok) {
    idtournament.textContent = data.Tournament
    idNBtournament.textContent = data.number + " / 4"

    if (data.players) {


      let i = 0;
      let html = "";
      for (const pl of data.players) {
        html = `
              <button
                id="avatarother${i}"
                class="profile-btn section"
                data-username="${pl}"
                style="cursor: pointer;
                      background-color: rgba(0, 33, 83, 0);
                      border: none; padding: 0;
                      color: rgb(255, 255, 255);
                      order: ${i};
                ">

                <h6 class="mb-2">${pl}</h6>
                <img
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
        if (i == 6) {
          html = `
              <div
                id="idVS2"
                class="section"
                style="
                      background-color: rgba(0, 33, 83, 0);
                      border: none; padding: 0;
                      color: rgb(255, 255, 255);
                      order: 5;
                      display: block;
                "> VS
              </div>
              <div
                id="idVS1"
                class="section"
                style="
                    background-color: rgba(0, 33, 83, 0);
                    border: none; padding: 0;
                    color: rgb(255, 255, 255);
                    order: 1;
                    display: block;
                "> VS
              </div>
            `;
          idplayerInTournament.innerHTML += html;
        }
        i += 2;
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
  listTournament(csrf, ulElem)

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
        // console.log("dat : ", data);
        if (data.Tournament != "None") {
          let usernameJwt;
          let jwtInfo;
          let guestJwt;
          let userId;
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
              // console.log("inf : ", jwtInfo);
              usernameJwt = jwtInfo["key"];
              guestJwt = jwtInfo["guests"];
              userId = jwtInfo["userId"]
            })
            .then(async data => {
              
              // Put here !!!
              //    -> ID               = userId
              //    -> username         = usernameJwt
              //    -> tournament key   = data["key"]


              const url_sse = `tournament/events?tKey=${trId}&name=${usernameJwt}&guests=${guestJwt}`;
              SSEStream = getSSE();
              // console.log(SSEStream);
              if (SSEStream === undefined) {
                SSEStream = new EventSource(url_sse);
                setSSE(SSEStream);
              }
              SSEStream.onmessage = function (event) {
                try {
                  // console.log("ggg", event.data);
                  const data = JSON.parse(event.data);
                  console.log("eee :", data);
                  // console.log("fff", data.t_state);
                  if (data.t_state == "game-start") {
                    // LaunchGameIntournament(data)
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
                    // console.log("sse data: ", data.next)
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
                    //else if (data.next == "set-results") {
                    //  SSEStream.close();
                    //  fetchWithRefresh(`tournament/${data.tkey}/results/`, {
                    //    credentials: 'include'
                    //  })
                    //}
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
                      // .then(data => {
                      //   console.log("NEXT : ", data)
                      // })
                    }
                  }
                  if (data.t_state == "results") {
                    console.log("============================>>", data);
                  }
                  else if (data.t_state == "firsts-match-preview") {
                    launchTournament(data)

                    console.log("data firsts match : ", data);
                  }
                  else if (data.t_state == "final-match-preview") {
                    console.log("data final match : ", data);
                  }
                  else if (data.t_state == "Someone-joined-left") {
                    console.log("Someone joined left : ", data);
                    listTournament()
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

              //launchButton = document.createElement("button");
              //launchButton.id = trId;
              //launchButton.className = "btn btn-outline-secondary";
              //launchButton.textContent = "Start";

              tournamentLeave.appendChild(leaveButton)
              //tournamentLaunch.appendChild(launchButton);



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
              // .then(data => {
              //   console.log("NEXT : ", data)
              // });

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

  // console.log("csrf:", csrf);
  // console.log("HEY 1")




  ulDropdown.addEventListener('click', async (event) => {
    const target = event.target;
    let usernameJwt;
    let jwtInfo;
    let guestJwt;
    let userId;


    // console.log("entree")

    // Check if the clicked element is an <a> tag
    if (target.tagName === "BUTTON") {
      event.preventDefault();
      const view = target.dataset.view;
      // console.log("aaaaa", view);
      const btnId = document.getElementById(view)


			try {
				const response = await fetchWithRefresh('tournament/check-sse', {
					headers: {
						'X-CSRFToken': csrf,
					},
					credentials: 'include',
				});

				if (!response.ok) throw new Error('HTTP Error: ' + response.status);

				jwtInfo = await response.json();
				usernameJwt = jwtInfo['key'];
				guestJwt = jwtInfo['guests'];
			} catch (error) {
				console.log('Error getting JWT info:', error);
				return; // Exit early if we can't get JWT info
			}

			try {
				const response = await fetchWithRefresh('tournament/tournament', {
					method: 'POST',
					headers: {
						'X-CSRFToken': csrf,
						'Content-Type': 'application/json',
					},
					credentials: 'include',
					body: JSON.stringify({ action: 'join', tKey: view }),
				});

				btnId.style.backgroundColor = 'red';

				if (!response.ok) throw new Error('HTTP Error: ' + response.status);

				const data = await response.json();
				btnId.style.backgroundColor = 'green';
				//init tournament_chat
				await launchTournamentChat(data['key']);
				// Close existing SSE connection if it exists
				if (SSEStream && SSEStream.readyState !== EventSource.CLOSED) {
					SSEStream.close();
				}

				// Create new SSE connection
				const url_sse = `tournament/events?tKey=${data['key']}&name=${usernameJwt}&guests=${guestJwt}`;
				SSEStream = new EventSource(url_sse);
				setSSE(SSEStream);

				SSEStream.onerror = function (error) {
					console.error('SSE connection error:', error);
				};

				// Set up message handler only after SSE is created
				SSEStream.onmessage = async function (event) {
					try {
						// Skip heartbeat messages
						if (
							event.data === 'heartbeat' ||
							event.data.trim() === ''
						) {
							return;
						}

						const data = JSON.parse(event.data);
						console.log('SSE message received:', data);

						if (data.t_state == 'game-start') {
							const buttonGame = document.createElement('button');
							buttonGame.className = 'btn btn-outline-primary';
							buttonGame.textContent = 'Launch game';
							buttonGame.dataset.type = data.mode;

							if (data.mode == 'local') {
								buttonGame.dataset.p1 = data.player1;
								buttonGame.dataset.p2 = data.player2;
							} else {
								buttonGame.dataset.player = data.player;
								buttonGame.dataset.playerId = data.playerId;
							}

							buttonGame.dataset.round = data.round;
							buttonGame.dataset.key = data.key;
							buttonGame.dataset.tkey = data.tkey;

							tournamentGame.innerHTML = '';
							tournamentGame.appendChild(buttonGame);
						} else if (data.t_state == 'game-finished') {
							await actualizeIndexPage(
								'contentTournementPage',
								routesTr['tournament']
							);

							if (data.next == 'final-rounds') {
								await fetchWithRefresh('tournament/finals', {
									method: 'POST',
									headers: {
										'X-CSRFToken': csrf,
										'Content-Type': 'application/json',
									},
									credentials: 'include',
									body: JSON.stringify({ tKey: data.tkey }),
								});
							} else {
								await fetchWithRefresh('tournament/match', {
									method: 'POST',
									headers: {
										'X-CSRFToken': csrf,
										'Content-Type': 'application/json',
									},
									credentials: 'include',
									body: JSON.stringify({ tKey: data.tkey }),
								});
							}
						}

						if (data.t_state == 'Someone-joined-left') {
							console.log('Someone joined/left:', data);
							await affichUserTournament();
						}
					} catch (error) {
						console.error('Error processing SSE message:', error);
					}
				};

				// Create leave button
				leaveButton = document.createElement('button');
				leaveButton.id = view;
				leaveButton.className = 'btn btn-outline-secondary';
				leaveButton.textContent = 'Leave';
				tournamentLeave.appendChild(leaveButton);

				await refreshTournament();
				stopAutoRefresh();
				setPositionTournamentList('absolute');

				return invitsController();
			} catch (error) {
				console.error('Error joining tournament:', error);
				btnId.style.backgroundColor = ''; // Reset button color on error
			}
		}
	});

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
          //tournamentLaunch.innerHTML = ""
          tournamentLeave.innerHTML = ""
          divGuest.innerHTML = "";
          listTournament(csrf, ulElem)
          setPositionTournamentList("relative")
        })
        .catch(error => {
          console.error("Erreur de requête :", error);
          throw error;
        });
    }
  })


  //tournamentLaunch.addEventListener('click', async (event) => {
  //  const target = event.target;
  //  console.log("===================")
  //  console.log(target)
  //  console.log("===================")

  //  if (target.tagName === "BUTTON") {
  //    event.preventDefault();
  //    const view = target.id;

  //    await fetchWithRefresh("tournament/match", {
  //      method: "POST",
  //      headers: {
  //        'X-CSRFToken': csrf,
  //        'Content-Type': 'application/json',
  //      },
  //      credentials: 'include',
  //      body: JSON.stringify({ "tKey": view })
  //    })
  //    .then(response => {
  //      if (!response.ok) throw new Error("https Error: " + response.status);
  //      console.log("entreeeeeeeeokoko")
  //      return response.json();
  //    })
  //    .then(data => {
  //      //tournamentInfo.innerHTML = `<h6>${data["Info"]}</h6>`;
  //      })
  //      .catch(error => {
  //        console.error("Erreur de requête :", error);
  //        throw error;
  //      });
  //  }
  //})


  tournamentGame.addEventListener('click', async (event) => {
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
       // console.log("Target.dataset", target.dataset);
       await fetchWithRefresh(`tournament/supervise?key=${target.dataset.key}&tkey=${target.dataset.tkey}&round=${target.dataset.round}`, {
         credentials: "include",
       })
         .then(response => {
           if (!response.ok) throw new Error("https Error: " + response.status);
           return response.json();
         })
       // .then(data => {
       //   console.log(data);
       // })

       return actualizeIndexPage("contentTournementPage", routesTr['matchSp']);
     }
     else {
       let idJWT;
       try {
         const response = await fetchWithRefresh('server-pong/check-sse', {
           headers: { 'X-CSRFToken': csrf },
           credentials: 'include',
         });

         console.log('data', response.status);
         if (!response.ok) throw new Error('HTTP Error: ' + response.status);

         const data = await response.json();
         let username;
         let a;
         let b;
         let c;

         const guestArray = Array.isArray(data.guest) ? data.guest : [];
         [a, b, c] = guestArray;
         console.log(data)
         username = data.username || 'anonymous';

         console.log(target.dataset)
         console.log(username)

         if (target.dataset.player == username) {
           idJWT = -1
         }
         else if (target.dataset.player == a) {
           idJWT = 0
         }
         else if (target.dataset.player == b) {
           idJWT = 1
         }
         else {
           idJWT = 2
         }
       } catch (error) {
         console.error('Request error:', error);
         // Could set default values for a, b, c if needed
       }
       return actualizeIndexPage("contentTournementPage", routesTr['matchOnline'](target.dataset.key, target.dataset.playerId, 0, idJWT, target.dataset.tkey, target.dataset.round));
     }
   }
  })
}


async function launchGame(data_game) {

  const KeepInfo = document.getElementById("contentTournementPage");
  // const contentInfo = KeepInfo.innerHTML;

  console.log("==========================")
  console.log(data_game)
  console.log("==========================")

  if (data_game.mode == "local") {
    localStorage.setItem("p1", data_game.player1);
    localStorage.setItem("p2", data_game.player2);
    localStorage.setItem("key", data_game.key);
    localStorage.setItem("tkey", data_game.tkey);
    await fetchWithRefresh(`tournament/supervise?key=${data_game.key}&tkey=${data_game.tkey}&round=${data_game.round}`, {
      credentials: "include",
    })
      .then(response => {
        if (!response.ok) throw new Error("https Error: " + response.status);
        return response.json();
      })
    // .then(data => {
    //   console.log(data);
    // })

    return actualizeIndexPage("contentTournementPage", routesTr['matchSp']);
  }
  else {
    let idJWT;
    try {
      const response = await fetchWithRefresh('server-pong/check-sse', {
        headers: { 'X-CSRFToken': csrf },
        credentials: 'include',
      });

      console.log('data', response.status);
      if (!response.ok) throw new Error('HTTP Error: ' + response.status);

      const data = await response.json();
      let username;
      let a;
      let b;
      let c;

      // Safely extract values with defaults
      const guestArray = Array.isArray(data.guest) ? data.guest : [];
      [a, b, c] = guestArray;
      console.log(data)
      username = data.username || 'anonymous';
      
      console.log("==========================")
      console.log(data)
      console.log(username)
      console.log("==========================")

      if (data_game.player == username) {
        idJWT = -1
      }
      else if (data_game.player == a) {
        idJWT = 0
      }
      else if (data_game.player == b) {
        idJWT = 1
      }
      else {
        idJWT = 2
      }
    } catch (error) {
      console.error('Request error:', error);
      // Could set default values for a, b, c if needed
    }
    return actualizeIndexPage("contentTournementPage", routesTr['matchOnline'](data_game.key, data_game.playerId, 0, idJWT, data_game.tkey, data_game.round));
  }
}
async function sendTournamentProgressMessage(tournamentId, message) {
	msgInfo = {
		content: message,
		group_id: tournamentId,
		sender_username: 'server',
	};
	sendMessage(msgInfo);
}
