/**
 * Event Bus pour la communication entre les différents modules de l'application
 * Permet de déclencher et d'écouter des événements globaux
 */

class EventBus {
    constructor() {
        this.events = {};
    }

    /**
     * Écouter un événement
     * @param {string} eventName - Nom de l'événement
     * @param {function} callback - Fonction à exécuter lors de l'événement
     */
    on(eventName, callback) {
        if (!this.events[eventName]) {
            this.events[eventName] = [];
        }
        this.events[eventName].push(callback);
        
        console.log(`Event listener added for: ${eventName}`);
        
        // Retourner une fonction pour supprimer le listener
        return () => {
            this.off(eventName, callback);
        };
    }

    /**
     * Supprimer un listener d'événement
     * @param {string} eventName - Nom de l'événement
     * @param {function} callback - Fonction à supprimer
     */
    off(eventName, callback) {
        if (this.events[eventName]) {
            this.events[eventName] = this.events[eventName].filter(cb => cb !== callback);
            if (this.events[eventName].length === 0) {
                delete this.events[eventName];
            }
            console.log(`Event listener removed for: ${eventName}`);
        }
    }

    /**
     * Déclencher un événement
     * @param {string} eventName - Nom de l'événement
     * @param {any} data - Données à passer aux listeners
     */
    emit(eventName, data = null) {
        console.log(`Event emitted: ${eventName}`, data);
        
        if (this.events[eventName]) {
            this.events[eventName].forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Error in event listener for ${eventName}:`, error);
                }
            });
        }
    }

    /**
     * Écouter un événement une seule fois
     * @param {string} eventName - Nom de l'événement
     * @param {function} callback - Fonction à exécuter
     */
    once(eventName, callback) {
        const onceCallback = (data) => {
            callback(data);
            this.off(eventName, onceCallback);
        };
        this.on(eventName, onceCallback);
    }
}

// Instance globale de l'EventBus
const eventBus = new EventBus();

// Événements prédéfinis de l'application
export const EVENTS = {
    // Événements de blocage/déblocage
    USER_BLOCKED: 'user:blocked',
    USER_UNBLOCKED: 'user:unblocked',
    BLOCK_STATUS_CHANGED: 'user:blockStatusChanged',
    
    // Événements de chat
    CHAT_CREATED: 'chat:created',
    CHAT_MESSAGE_RECEIVED: 'chat:messageReceived',
    CHAT_LIST_UPDATED: 'chat:listUpdated',
    CHAT_STATUS_CHANGED: 'chat:statusChanged',
    
    // Événements d'amitié
    FRIEND_REQUEST_SENT: 'friend:requestSent',
    FRIEND_REQUEST_RECEIVED: 'friend:requestReceived',
    FRIEND_REQUEST_ACCEPTED: 'friend:requestAccepted',
    FRIEND_REQUEST_DECLINED: 'friend:requestDeclined',
    FRIEND_REMOVED: 'friend:removed',
    
    // Événements utilisateur
    USER_STATUS_CHANGED: 'user:statusChanged',
    USER_PROFILE_UPDATED: 'user:profileUpdated',
    
    // Événements de connexion
    USER_LOGGED_IN: 'auth:loggedIn',
    USER_LOGGED_OUT: 'auth:loggedOut'
};

export default eventBus;
