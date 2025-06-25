import { actualizeIndexPage } from "../utils.js"
import { routesSp } from "./utils/commonFunctions.js"
import { getCookie } from "../utils.js"
import { invitsController } from "./invits.js";

export async function tournamentController() {
    let SSEStream;
    let leaveButton = undefined;
    const tournamentInfo = document.getElementById("Tournament-info");
    const refreshButton = document.getElementById("refresh-trnmt");
    const createButton = document.getElementById("create-trnmt");
    const csrf = getCookie('csrftoken');
    const ulElem = document.getElementById("list");
    const ulDropdown = document.getElementById("trnmt-list-ul");
    const divGuest = document.getElementById("guest-add");
    let trnmt;

    console.log("csrf:", csrf);
    console.log("HEY 1")
    refreshButton.addEventListener("click", async (event) => {
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

    })

    createButton.addEventListener("click", async (event) => {
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
            tournamentInfo.innerHTML = ""
            tournamentInfo.appendChild(leaveButton)

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

    tournamentInfo.addEventListener('click', async (event) => {
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
          })
          .catch(error => {
            console.error("Erreur de requête :", error);
            throw error;
          });
      }
    })
}