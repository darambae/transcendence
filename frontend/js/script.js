// script.js

console.log("script.js loaded successfully!");

// You can add your JavaScript code here for interactivity.
// For example, you might want to add event listeners to the "Play Now" button.

const playNowButton = document.querySelector('#hero button');

if (playNowButton) {
    playNowButton.addEventListener('click', function(event) {
        alert('Starting the game!');
        // In a real application, you would redirect to the game page or start the game logic here.
    });
}