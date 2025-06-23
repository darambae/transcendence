

export async function card_profileController(username) {
	if (username) {
		const token = sessionStorage.getItem("accessToken");
		if (!token) {
			console.error("Token manquant !");
			return;
		}
		getOtherUserInfo(token, username);
		getOtherUserAvatar(token, username);
		addFriend(token);
	}
}


function displayUserInfo(data) {
	document.getElementById('otherUser').textContent = "👤 " + data.user_name;
	document.getElementById('otherFirstName').textContent = data.first_name;
	document.getElementById('otherLastName').textContent = data.last_name;;
	document.getElementById('otherMail').textContent = data.mail;
	document.getElementById('createdAtOther').textContent = data.created_at;

	const addFriendsBtn = document.getElementById('addFriendsid');
	addFriendsBtn.dataset.username = data.user_name;

	const lastOne = document.getElementById('lastActiveOther').textContent = data.last_login;

	const statusBadge = document.getElementById('statusOtherUser');
	const isOnline = data.online;

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
}


async function getOtherUserInfo(token, userName) {
	try {
		const response = await fetch(`user-service/infoOtherUser/${userName}`, {
		  method: "GET",
		  headers: {
			"Authorization": `Bearer ${token}`,
			"Content-Type": "application/json",
		  },
		});
		if (!response.ok) {
		  console.log(`Erreur HTTP ! status: ${response.status}`);
		}
		const data = await response.json();
		displayUserInfo(data)
		console.log(data)
	
	  } catch (error) {
		console.error("Error otherUser info :", error);
	  }
}


function getOtherUserAvatar(token, userName) {
	fetch(`user-service/avatarOther/${userName}`, {
		method: "GET",
		headers: {
			"Authorization": `Bearer ${token}`,
		},
	})
	.then(res => {
		if (!res.ok) throw new Error("Error retrieving other Aaatar");
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


function addFriend(token) {

	try {
		const addFriendsBtn = document.getElementById('addFriendsid');
		
		addFriendsBtn.addEventListener("click", async() => {
			const userName = addFriendsBtn.dataset.username

			console.log(userName)

			const response = await fetch("user-service/add/friend/", {
				method: "POST",
				headers: {
					Authorization: `Bearer ${token}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					userName: userName,
				}),
			});

			const data = await response.json();
			console.log(data);

		})

	} catch (error) {
		console.error("Error add friend :", error);
	}
}