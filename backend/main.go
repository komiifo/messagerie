package main

import (
	"fmt"
	"net/http"
	"sync"

	"github.com/gorilla/websocket"
)

// Configuration de l'upgrader pour passer du HTTP au WebSocket
var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	// Pour le développement, on autorise toute origine
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

// Client représente une connexion WebSocket
type Client struct {
	conn *websocket.Conn
}

// Hub central qui garde la trace de tous les clients connectés
type Hub struct {
	clients map[*Client]bool
	mutex   sync.Mutex
}

var hub = Hub{
	clients: make(map[*Client]bool),
}

// broadcast diffuse le message reçu à tous les clients connectés
func (h *Hub) broadcast(message []byte) {
	h.mutex.Lock()
	defer h.mutex.Unlock()
	for client := range h.clients {
		if err := client.conn.WriteMessage(websocket.TextMessage, message); err != nil {
			client.conn.Close()
			delete(h.clients, client)
		}
	}
}

// wsHandler upgrade la connexion HTTP en WebSocket et gère les échanges
func wsHandler(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		fmt.Println("Erreur lors de l'upgrade :", err)
		return
	}
	client := &Client{conn: conn}
	hub.mutex.Lock()
	hub.clients[client] = true
	hub.mutex.Unlock()

	// Boucle de lecture des messages envoyés par le client
	for {
		messageType, message, err := conn.ReadMessage()
		if err != nil {
			fmt.Println("Erreur lors de la lecture :", err)
			break
		}
		if messageType == websocket.TextMessage {
			// On diffuse le message reçu à tous
			hub.broadcast(message)
		}
	}

	// Suppression du client en cas de déconnexion
	hub.mutex.Lock()
	delete(hub.clients, client)
	hub.mutex.Unlock()
	conn.Close()
}

func main() {
	http.HandleFunc("/ws", wsHandler)

	// Pour servir le frontend (les fichiers statiques seront dans le dossier "public")
	fs := http.FileServer(http.Dir("./public"))
	http.Handle("/", fs)

	fmt.Println("Serveur démarré sur le port :8080")
	if err := http.ListenAndServe(":8080", nil); err != nil {
		fmt.Println("Erreur du serveur :", err)
	}
}
