//static/js/views/home.js
// export default function home() {
// 	//upload css file
// 	const link = document.createElement('link')
// 	link.rel = 'stylesheet';
// 	link.href = '/static/css/home.css';
// 	document.head.appendChild(link);

// 	const content = document.getElementById("content");
// 	content.className = "home-view";

// 	console.log("home function called");	
// 	//view content
// 	link.onload = () => {
// 		fetch('/api/data/')
// 		.then(resp => resp.json())
// 		.then(data => {
// 			content.innerHTML = `
// 			<h2>Home</h2>
// 			<p>${data.message}</p>`;
// 		});
// 	}
// }

export function homeController() {
	console.log("here in home function");
}