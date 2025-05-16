package main

import (
	"encoding/json"
	"fmt"
	"net/http"
	"sync"

	"github.com/gorilla/websocket"
)

type Client struct {
	conn *websocket.Conn
	name string
}

type Hub struct {
	clients     map[*Client]bool
	mutex       sync.Mutex
	typingUsers map[string]bool
}

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin:     func(r *http.Request) bool { return true },
}

var hub = Hub{
	clients:     make(map[*Client]bool),
	typingUsers: make(map[string]bool),
}

// Message struct générique
type Message struct {
	Type      string   `json:"type"`
	Name      string   `json:"name,omitempty"`
	Avatar    string   `json:"avatar,omitempty"`
	Message   string   `json:"message,omitempty"`
	MessageID string   `json:"messageId,omitempty"`
	Reaction  string   `json:"reaction,omitempty"`
	Users     []string `json:"users,omitempty"` // pour utilisateurs connectés ou typing
	Count     int      `json:"count,omitempty"` // pour le nombre
	ID        string   `json:"id,omitempty"`    // ID de message (chat)
}

func (h *Hub) broadcastJSON(data Message) {
	h.mutex.Lock()
	defer h.mutex.Unlock()

	bytes, _ := json.Marshal(data)

	for client := range h.clients {
		if err := client.conn.WriteMessage(websocket.TextMessage, bytes); err != nil {
			client.conn.Close()
			delete(h.clients, client)
		}
	}
}

func (h *Hub) updateConnectedUsers() {
	names := []string{}
	for c := range h.clients {
		names = append(names, c.name)
	}
	h.broadcastJSON(Message{
		Type:  "connected_users",
		Users: names,
		Count: len(names),
	})
}

func (h *Hub) updateTypingUsers() {
	names := []string{}
	for name := range h.typingUsers {
		names = append(names, name)
	}
	h.broadcastJSON(Message{
		Type:  "typing_users",
		Users: names,
		Count: len(names),
	})
}

func wsHandler(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		fmt.Println("Erreur lors de l'upgrade :", err)
		return
	}

	// Lire le premier message pour récupérer le nom
	_, rawMsg, err := conn.ReadMessage()
	if err != nil {
		conn.Close()
		return
	}
	var initMsg Message
	if err := json.Unmarshal(rawMsg, &initMsg); err != nil || initMsg.Type != "join" {
		conn.Close()
		return
	}

	client := &Client{conn: conn, name: initMsg.Name}

	hub.mutex.Lock()
	hub.clients[client] = true
	hub.mutex.Unlock()

	// Mise à jour utilisateurs connectés
	hub.updateConnectedUsers()

	defer func() {
		hub.mutex.Lock()
		delete(hub.clients, client)
		delete(hub.typingUsers, client.name)
		hub.mutex.Unlock()
		hub.updateConnectedUsers()
		hub.updateTypingUsers()
		conn.Close()
	}()

	for {
		_, msgBytes, err := conn.ReadMessage()
		if err != nil {
			break
		}

		var msg Message
		if err := json.Unmarshal(msgBytes, &msg); err != nil {
			continue
		}

		switch msg.Type {
		case "chat":
			hub.broadcastJSON(msg)
		case "reaction":
			hub.broadcastJSON(msg)
		case "typing":
			hub.mutex.Lock()
			hub.typingUsers[client.name] = true
			hub.mutex.Unlock()
			hub.updateTypingUsers()
		case "stop_typing":
			hub.mutex.Lock()
			delete(hub.typingUsers, client.name)
			hub.mutex.Unlock()
			hub.updateTypingUsers()
		}
	}
}

func main() {
	http.HandleFunc("/ws", wsHandler)
	fs := http.FileServer(http.Dir("./public"))
	http.Handle("/", fs)

	fmt.Println("Serveur démarré sur le port :8080")
	if err := http.ListenAndServe(":8080", nil); err != nil {
		fmt.Println("Erreur du serveur :", err)
	}
}
