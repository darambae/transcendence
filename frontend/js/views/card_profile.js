

export async function card_profileController() {
	const token = sessionStorage.getItem("accessToken");
	if (!token) {
		console.error("Token manquant !");
		return;
	}

	getOtherUserInfo(token, "mamar")
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

function displayUserInfo(data) {
	document.getElementById('otherUser').textContent = "👤 " + data.user_name;
	document.getElementById('otherFirstName').textContent = data.first_name;
	document.getElementById('otherLastName').textContent = data.last_name;;
	document.getElementById('otherMail').textContent = data.mail;

	const statusBadge = document.getElementById('statusOtherUser');
	const isOnline = data.online;

	if (isOnline) {
	  statusBadge.textContent = '🟢 Online';
	  statusBadge.classList.add('badge-online');
	  statusBadge.classList.remove('badge-offline');
	} else {
	  statusBadge.textContent = '🔴 Offline';
	  statusBadge.classList.add('badge-offline');
	  statusBadge.classList.remove('badge-online');
	}
}