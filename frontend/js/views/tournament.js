import { actualizeIndexPage } from "../utils.js"
import { routesSp } from "./utils/commonFunctions.js"
import { getCookie } from "../utils.js"
import { handleInvitSubmit } from "./invits.js";


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
    let SSEStream;
    let leaveButton = undefined;
    let launchButton = undefined;
    const tournamentInfo = document.getElementById("Tournament-info");
    const tournamentLeave = document.getElementById("Tournament-leave");
    const tournamentLaunch = document.getElementById("Tournament-launch")
    const refreshButton = document.getElementById("refresh-trnmt");
    const createButton = document.getElementById("create-trnmt");
    const csrf = getCookie('csrftoken');
    const ulElem = document.getElementById("list");
    const ulDropdown = document.getElementById("trnmt-list-ul");
    const divGuest = document.getElementById("guest-add");

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

      // Check if the clicked element is an <a> tag
      if (target.tagName === "A") {
        event.preventDefault();
        const view = target.dataset.view;

        console.log(view);

        await fetch("server-pong/check-sse", {
          headers : {
            'X-CSRFToken': csrf,
          },
          credentials : "include",
        })
        .then(response => {
          if (!response.ok) throw new Error("https Error: " + response.status);
          usernameJwt = response.json();
          usernameJwt = usernameJwt["username"];
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
            const url_sse = `tournament/events?tKey=${data["key"]}&jwt=${usernameJwt}`;
            SSEStream = new EventSource(url_sse);
            SSEStream.onmessage = function(event) {
              try {
                console.log(event.data);
                const data = JSON.parse(event.data);
                console.log(data);
              }
              catch (error) {
                console.log("Error");
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
}