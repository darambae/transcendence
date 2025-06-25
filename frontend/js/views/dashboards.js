

export async function dashboardsController() {

	try {
		const response = await fetch("user-service/matchHistory/", {
		  method: "GET",
			credentials: 'include',
			headers: {
				'Content-Type': 'application/json',
			},
		});
		if (!response.ok) {
		  throw new Error(`Erreur HTTP ! status: ${response.status}`);
		}
		const data = await response.json();
		console.log(data)
	
	  } catch (error) {
		console.error("Erreur lors de la récupération des infos utilisateur :", error);
	  }

}