import { actualizeIndexPage, loadTemplate } from "../utils.js"
import { setSSE, getSSE } from "./utils/commonFunctions.js"
import { getCookie } from "../utils.js"
import { handleInvitSubmit } from "./invits.js";
import { localGameTr } from "./tournamentLocalGame.js";

export let routesTr = {
  matchSp : {
    template : "tournamentMatch",
    controller : localGameTr
  },
  tournament : { 
    template : "tournament",
    controller : tournamentController
  }
}

export function invitsController() {
	const modalContainer = document.getElementById("modal-container");

	let form = document.getElementById("log-form");
	if (form) {
	  form.addEventListener("submit", (e) => {handleInvitSubmit(e, form)});
	}
}

async function refreshTournament(csrf, ulDropdown, ulElem) {
  let trnmt;
  console.log("HEY 2")
  await fetch('tournament/tournament', {
      headers: {
          'X-CSRFToken': csrf,
      },
      credentials : "include"
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
    ulDropdown.innerHTML = "";

    let liElem;
    let liElemA;
    let aElem;
    for (const key in trnmt) {
      liElem = document.createElement('li');
      liElem.textContent = `${key} - ${trnmt[key]}`
      aElem = document.createElement('a');
      aElem.dataset.view = key;
      aElem.className = "dropdown-item"
      aElem.textContent = key;
      liElemA = document.createElement('li');
      liElemA.appendChild(aElem);
      ulElem.appendChild(liElem);
      ulDropdown.appendChild(liElemA);
    }
}

async function createEvent(csrf, ulDropdown, ulElem) {
  console.log("Hey 3")
        
  await fetch('tournament/tournament',  {
      method: 'POST',
      headers: {
          'X-CSRFToken': csrf,
          'Content-Type': 'application/json',
      },
      credentials : "include",
      body: JSON.stringify({ "action" : "create" })
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
    await refreshTournament(csrf, ulDropdown, ulElem);
}
export async function tournamentController() {
  const csrf = getCookie('csrftoken');
  let SSEStream;
  let leaveButton = undefined;
  let launchButton = undefined;
  const tournamentInfo = document.getElementById("Tournament-info");
  const tournamentLeave = document.getElementById("Tournament-leave");
  const tournamentGame = document.getElementById("Tournament-game");
  const tournamentLaunch = document.getElementById("Tournament-launch")
  const refreshButton = document.getElementById("refresh-trnmt");
  const createButton = document.getElementById("create-trnmt");
  const ulElem = document.getElementById("list");
  const ulDropdown = document.getElementById("trnmt-list-ul");
  const divGuest = document.getElementById("guest-add");
  
    await fetch('tournament/me', {
      headers : {
        'X-CSRFToken': csrf,
        },
        credentials : "include",
    })
    .then( response => {
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
      
          await fetch("tournament/check-sse", {
            headers : {
              'X-CSRFToken': csrf,
            },
            credentials : "include",
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
              SSEStream.onmessage = function(event) {
                try {
                  console.log("ggg", event.data);
                  const data = JSON.parse(event.data);
                  console.log("eee", data);
                  console.log("fff", data.t_state);
                  if (data.t_state == "game-start") {
                    console.log("SSE 1")
                    const buttonGame =  document.createElement("button");
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
                      console.log("To do");
                    }
                    console.log("SSE 8")
                    buttonGame.dataset.key = data.key;
                    buttonGame.dataset.tkey = data.tkey
                    console.log("SSE 9")
                    tournamentGame.innerHTML = "";
                    console.log("SSE 10")
                    tournamentGame.appendChild(buttonGame);
                  }
                  else if (data.t_state == "game-finished") {
                    actualizeIndexPage("Tournament-Lobby", routesTr['tournament'])
                    console.log("sse data: ", data.next)
                    if (data.next == "final-rounds") {
                      fetch("tournament/finals", {
                        method: "POST",
                        headers: {
                          'X-CSRFToken': csrf, 
                          'Content-Type': 'application/json', 
                        },
                        credentials: 'include',
                        body: JSON.stringify({"tKey" : data.tkey})
                      })
                    }
                    else {
                      fetch("tournament/next", {
                        method: "POST",
                        headers: {
                          'X-CSRFToken': csrf, 
                          'Content-Type': 'application/json', 
                        },
                        credentials: 'include',
                        body: JSON.stringify({"tKey" : data.tkey})
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
              tournamentInfo.innerHTML = ""
              tournamentLeave.appendChild(leaveButton)
              tournamentLaunch.appendChild(launchButton);

              let text = await fetch('./templates/invits.html')
              console.log(text);
              text = await text.text()
              divGuest.innerHTML = text
              await fetch("tournament/next", {
                method: "POST",
                headers: {
                  'X-CSRFToken': csrf, 
                  'Content-Type': 'application/json', 
                },
                credentials: 'include',
                body: JSON.stringify({"tKey" : trId})
              });

              return invitsController()
            })
            .catch(error => {
              console.error("Erreur de requête :", error);
              throw error;
            });
        };
      })

    console.log("csrf:", csrf);
    console.log("HEY 1")
    refreshButton.addEventListener("click", () => 
        {refreshTournament(csrf, ulDropdown, ulElem)
      })

    createButton.addEventListener("click", () => 
        {createEvent(csrf, ulDropdown, ulElem)
      })

    ulDropdown.addEventListener('click', async (event) => {
      const target = event.target;
      let usernameJwt;
      let jwtInfo;
      let guestJwt;


      // Check if the clicked element is an <a> tag
      if (target.tagName === "A") {
        event.preventDefault();
        const view = target.dataset.view;

        console.log(view);

        await fetch("tournament/check-sse", {
          headers : {
            'X-CSRFToken': csrf,
          },
          credentials : "include",
        })
        .then(response => {
          if (!response.ok) throw new Error("https Error: " + response.status);
          jwtInfo = response.json();
          console.log(jwtInfo);
          usernameJwt = jwtInfo["key"];
          guestJwt = jwtInfo["guests"]
        })


        await fetch("tournament/tournament", {
          method : 'POST',
          headers : {
            'X-CSRFToken': csrf,
            'Content-Type': 'application/json',
          },
          credentials : "include",
          body: JSON.stringify({"action" : "join", "tKey" : view})
        })
        .then(response => {
          if (!response.ok) throw new Error("https Error: " + response.status);
          return response.json();
        })
          .then(async data => {
            console.log("Données reçues Join:", data["key"]);
            const url_sse = `tournament/events?tKey=${data["key"]}&name=${usernameJwt}&guests=${guestJwt}`;
            SSEStream = new EventSource(url_sse);
            setSSE(SSEStream);
            SSEStream.onmessage = function(event) {
              try {
                console.log("iii", event.data);
                const data = JSON.parse(event.data);
                console.log("jjj", data);
                console.log("kkk",data.t_state);
                if (data.t_state == "game-start") {
                  console.log("SSE 1")
                  const buttonGame =  document.createElement("button");
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
                    console.log("To do");
                  }
                  console.log("SSE 8")
                  buttonGame.dataset.key = data.key;
                  buttonGame.dataset.tkey = data.tkey
                  console.log("SSE 9")
                  tournamentGame.innerHTML = "";
                  console.log("SSE 10")
                  tournamentGame.appendChild(buttonGame);
                }
                else if (data.t_state == "game-finished") {
                  actualizeIndexPage("Tournament-Lobby", routesTr['tournament'])
                  console.log("sse data: ", data.next)
                  if (data.next == "final-rounds") {
                    fetch("tournament/finals", {
                      method: "POST",
                      headers: {
                        'X-CSRFToken': csrf, 
                        'Content-Type': 'application/json', 
                      },
                      credentials: 'include',
                      body: JSON.stringify({"tKey" : data.tkey})
                    })
                  }
                  else {
                    fetch("tournament/match", {
                      method: "POST",
                      headers: {
                        'X-CSRFToken': csrf, 
                        'Content-Type': 'application/json', 
                      },
                      credentials: 'include',
                      body: JSON.stringify({"tKey" : data.tkey})
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
            tournamentInfo.innerHTML = ""
            tournamentLeave.appendChild(leaveButton)
            tournamentLaunch.appendChild(launchButton);

            let text = await fetch('./templates/invits.html')
            console.log(text);
            text = await text.text()
            divGuest.innerHTML = text
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
        await fetch("tournament/tournament", {
          method : 'POST',
          headers : {
            'X-CSRFToken': csrf,
            'Content-Type': 'application/json',
          },
          credentials : "include",
          body: JSON.stringify({"action": "leave", "tKey" : target.id})
        })
        .then(response => {
          if (!response.ok) throw new Error("https Error: " + response.status);
          return response.json();
        })
          .then(data => {
            SSEStream.close();
            tournamentInfo.innerHTML = "<h4>No tournament Joined</h4>";
            tournamentLaunch.innerHTML = ""
            tournamentLeave.innerHTML = ""
            divGuest.innerHTML = "<h4>Waiting for tournament</h4>";
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

        await fetch("tournament/match", {
          method: "POST",
          headers: {
            'X-CSRFToken': csrf, 
            'Content-Type': 'application/json', 
          },
          credentials: 'include',
          body: JSON.stringify({"tKey" : view})
        })
        .then(response => {
          if (!response.ok) throw new Error("https Error: " + response.status);
          return response.json();
        })
          .then(data => {
            tournamentInfo.innerHTML = `<h6>${data["Info"]}</h6>`;
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

        const KeepInfo = document.getElementById("Tournament-Lobby");
        // const contentInfo = KeepInfo.innerHTML;
        
        localStorage.setItem("p1", target.dataset.p1);
        localStorage.setItem("p2", target.dataset.p2);
        localStorage.setItem("key", target.dataset.key);
        localStorage.setItem("tkey",  target.dataset.tkey);
        fetch(`tournament/supervise?key=${target.dataset.key}&tkey=${target.dataset.tkey}`, {
          credentials: "include",
        })
        .then(response => {
          if (!response.ok) throw new Error("https Error: " + response.status);
          return response.json();
        })
        .then(data => {
          console.log(data);
        })

        return actualizeIndexPage("Tournament-Lobby", routesTr['matchSp']);
      }
    })
}
