import { closeModal, fetchWithRefresh, getBlockedStatus, getCookie } from "../utils.js";
import { refreshChatAfterBlockStatusChange } from "./chat.js";

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
		await getOtherUserAvatar(username);
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

	console.log('gestFooter - blockedStatus:', blockedStatus)
	console.log('gestFooter - friend_status:', friend_status)
	console.log('gestFooter - isBlocked:', blockedStatus?.isBlocked)
	console.log('gestFooter - hasBlocked:', blockedStatus?.hasBlocked)

	// Vérifier si blockedStatus est un objet valide
	if (!blockedStatus) {
		console.log('blockedStatus is null/undefined - treating as no blocking')
		blockedStatus = { isBlocked: false, hasBlocked: false };
	}

	if (blockedStatus.isBlocked) {
		sep.style.display = "none"
		btnAdd.style.display = "none"
		btnAddBlock.textContent = "unblock"//to unblock
		btnAddBlock.style.display = "block"
		console.log('Case 1: User is blocked - showing unblock button')
	} else {
		btnAddBlock.style.display = "block"
		if (blockedStatus.hasBlocked) {
			sep.style.display = "none"
			btnAdd.style.display = "none"
			btnAddBlock.textContent = "block"
			console.log('Case 2: User has blocked - showing block button')
		} else {
			console.log('Case 3: No blocking - friend_status:', friend_status)
			btnAddBlock.textContent = "block"
			if (friend_status === null) {
				btnAdd.style.display = "block"
				sep.style.display = "block"
				console.log('Case 3a: No friend relation - showing both buttons')
			} else if (friend_status === "pending") {
				sep.style.display = "none"
				btnAdd.style.display = "none"
				console.log('Case 3b: Friend pending - hiding add friend button')
			}
		}
	}
}


export async function getOtherUserInfo(userName) {
	try {
		const timestamp = Date.now();
		const response = await fetchWithRefresh(
			`user-service/infoOtherUser/${userName}?t=${timestamp}`,
			{
				method: 'GET',
				credentials: 'include',
				headers: {
					'Content-Type': 'application/json',
					'Cache-Control': 'no-cache',
				},
			}
		);
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


export async function getOtherUserAvatar(userName, i = "") {
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
		document.getElementById("avatarother" + i).src = imgUrl;
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
						'X-CSRFToken': getCookie('csrftoken'),
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
		console.log('Block button found:', blockBtn); // Debug log
		if (blockBtn) {
			blockBtn.addEventListener('click', async () => {
				if (blockBtn.disabled) {
					console.log('Button is already processing, ignoring click');
					return;
				}

				console.log('Block button clicked!'); // Debug log
				const userId = blockBtn.dataset.userId;
				console.log('User ID:', userId); // Debug log

				// Disable the button during processing
				blockBtn.disabled = true;
				const originalText = blockBtn.textContent;
				blockBtn.textContent = 'Processing...';

				try {
					const response = await fetchWithRefresh(
						`chat/${userId}/blockedStatus/`,
						{
							method: 'POST',
							headers: {
								'Content-Type': 'application/json',
								'X-CSRFToken': getCookie('csrftoken'),
							},
							credentials: 'include',
							body: JSON.stringify({}),
						}
					);

					if (!response.ok) {
						console.error(`HTTP Error: ${response.status}`);
						blockBtn.disabled = false;
						blockBtn.textContent = originalText;
						return;
					}
					const data = await response.json();
					console.log('Response data:', data);
					if (data.status === 'success' || data.message) {
						console.log('Action réussie - mise à jour locale optimiste');
						if (originalText === "block") {
							blockBtn.textContent = "unblock";
						} else {
							blockBtn.textContent = "block";
						}
						blockBtn.disabled = false;
						try {
							await refreshChatAfterBlockStatusChange(userId);
							console.log('Chat status refreshed after block/unblock action');
						} catch (chatError) {
							console.error('Error refreshing chat status:', chatError);
						}

						// Vérifier le statut côté serveur après un délai pour la cohérence
						// setTimeout(async () => {
						// 	console.log('Vérification différée du statut côté serveur...');
						// 	await getOtherUserInfo(userName);
						// }, 2000); // 2 secondes de délai
					} else {
						blockBtn.disabled = false;
						blockBtn.textContent = originalText;
					}
				} catch (fetchError) {
					console.error('Error in fetch request:', fetchError);
					blockBtn.disabled = false;
					blockBtn.textContent = originalText;
				}
			});
		} else {
			console.error('Block button not found!'); // Debug log
		}
	} catch (error) {
		console.error('Error in changeBlockedStatus:', error);
	}
}

