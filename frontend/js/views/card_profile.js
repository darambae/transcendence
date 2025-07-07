import { closeModal, fetchWithRefresh, getBlockedStatus } from "../utils.js";

export async function card_profileController(username) {

	const modalContainer = document.getElementById("modal-container");
	if (modalContainer) {
		modalContainer.addEventListener("click", (event) => {
			if (event.target.id === "modal-container") {
				closeModal();
			}
		});
	}

	const closeBtn = document.getElementById("close-card-btn");
	if (closeBtn) {
		closeBtn.addEventListener("click", () => {
			closeModal();
		});
	}

	if (username) {
		getOtherUserInfo(username);
		getOtherUserAvatar(username);
		addFriend();
		changeBlockedStatus(username);
	}
}


function displayUserInfo(data) {
	document.getElementById('otherUser').textContent = "👤 " + data.user_name;
	document.getElementById('otherFirstName').textContent = data.first_name;
	document.getElementById('otherLastName').textContent = data.last_name;;
	document.getElementById('otherMail').textContent = data.mail;
	document.getElementById('idTotalGames').textContent = data.total_games;
	document.getElementById('idGameWin').textContent = data.game_wins;
	document.getElementById('idGameLosses').textContent = data.game_losses;
	document.getElementById('createdAtOther').textContent = data.created_at;

	const addFriendsBtn = document.getElementById('addFriendsid');
	const addBlockBtn = document.getElementById('blockUserId');
	const lastOne = document.getElementById('lastActiveOther').textContent = data.last_login;
	const statusBadge = document.getElementById('statusOtherUser');
	const isOnline = data.online;

	const card = document.querySelector('.player-card');


	addFriendsBtn.dataset.username = data.user_name;
	addBlockBtn.dataset.userId = data.id;

	if (isOnline) {
	  statusBadge.textContent = '🟢 Online';
	  statusBadge.classList.add('badge-online');
	  statusBadge.classList.remove('badge-offline');
	} else {
	  statusBadge.textContent = '🔴 Offline';
	  statusBadge.classList.add('badge-ofline');
	  statusBadge.classList.remove('badge-online');
		if (lastOne) {
			lastOne.textContent = "";
		}
	}

	if (!data.friend_status) {
		card.classList.add("card-default");
	  } else if (data.friend_status === "pending") {
		card.classList.add("card-pending");
	  } else if (data.friend_status === "accepted") {
		card.classList.add("card-accepted");
	  }
}


async function gestFooter(friend_status, blockedStatus) {
	const btnAdd = document.getElementById('addFriendsid')
	const sep = document.getElementById('separation')
	const btnAddBlock = document.getElementById('blockUserId')

	console.log(blockedStatus)
	if (blockedStatus.isBlocked) {
		sep.style.display = "none"
		btnAdd.style.display = "none"
		btnAddBlock.textContent = "unblock"//to unblock
		btnAddBlock.style.display = "block"
	} else {
		btnAddBlock.style.display = "block"
		if (blockedStatus.hasBlocked) {
			sep.style.display = "none"
			btnAdd.style.display = "none"
		} else {
			console.log(friend_status)
			if (friend_status === null) {
				btnAdd.style.display = "block"
				sep.style.display = "block"
			} else if (friend_status === "pending") {
				sep.style.display = "none"
				btnAdd.style.display = "none"
			}
		}
	}
}


async function getOtherUserInfo(userName) {
	try {
		const response = await fetchWithRefresh(`user-service/infoOtherUser/${userName}`, {
		  method: "GET",
		  credentials: 'include',
		  headers: {
			"Content-Type": "application/json",
		  },
		});
		if (!response.ok) {
			console.log(`Erreur HTTP ! status: ${response.status}`);
			return;
		}
		const data = await response.json();
		let blockedStatus = await getBlockedStatus(data.id);
		gestFooter(data.friend_status, blockedStatus)
		displayUserInfo(data)
		console.log(data)

	  } catch (error) {
		console.error("Error otherUser info :", error);
	  }
}


function getOtherUserAvatar(userName) {
	fetchWithRefresh(`user-service/avatarOther/${userName}`, {
		method: "GET",
		credentials: 'include',
	})
	.then(res => {
		if (!res.ok) throw new Error("Error retrieving other Avatar");
		return res.blob();
	})
	.then(blob => {
		const imgUrl = URL.createObjectURL(blob);
		document.getElementById("avatarother").src = imgUrl;
	})
	.catch(err => {
		console.error("Error loading other avatar :", err);
	});
}


function addFriend() {

	try {
		const addFriendsBtn = document.getElementById('addFriendsid');
		if (addFriendsBtn) {
			addFriendsBtn.addEventListener('click', async () => {
				const userName = addFriendsBtn.dataset.username;

				const response = await fetchWithRefresh('user-service/add/friend/', {
					method: 'POST',
					credentials: 'include',
					headers: {
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({
						userName: userName,
					}),
				});

				const data = await response.json();

				console.log(data);
				if (data.message) {
					getOtherUserInfo(userName);
				}
			});
		}
	} catch (error) {
		console.error("Error add friend :", error);
	}
}

function changeBlockedStatus(userName) {

	try {
		const blockBtn = document.getElementById('blockUserId');
		if (blockBtn) {
			blockBtn.addEventListener('click', async () => {
				const userId = blockBtn.dataset.userId;

				const response = await fetchWithRefresh(`/chat/${userId}/blockedStatus`, {
				method : 'POST',
				headers: {
					'Content-Type': 'application/json',
                    'X-CSRFToken': getCookie('csrftoken'),
				},
				credentials : 'include',
				body: JSON.stringify({}),
			})
				const data = await response.json();
				console.log(data);
				if (data.message) {
					getOtherUserInfo(userName);
				}
			});
		}
	} catch (error) {
		console.error("Error add friend :", error);
	}
}

