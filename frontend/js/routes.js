import { homeController } from './views/home.js';
import { singlePlayController } from './views/singlePlay.js';
import { multiplayerController } from './views/multiplayer.js';
import { duelController } from './views/duel.js';
import { userController } from './views/user.js';


export const routes = {
	home: {
		template: 'home',
		controller: homeController,
	},
	singlePlay: {
		template: 'singlePlay',
		controller: singlePlayController,
	},
	multiplayer: {
		template: 'multiplayer',
		controller: multiplayerController,
	},
	duel: {
		template: 'duel',
		controller: duelController,
	},
	user: {
		template: 'user',
		controller: userController,
		isModal: true,
	},
  };