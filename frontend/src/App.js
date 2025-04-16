import React, { useState, useEffect, useRef } from 'react';

// Fonction pour générer un nom drôle aléatoire
function getRandomName() {
  const adjectives = ["Drôle", "Fou", "Mystérieux", "Souriant", "Bavard"];
  const nouns = ["Chat", "Chien", "Pingouin", "Robot", "Pirate"];
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  return `${adj} ${noun}`;
}

function App() {
  const [ws, setWs] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  // Génération d'un nom et d'un avatar lors du chargement du composant
  const name = useRef(getRandomName());
  const avatar = useRef(`https://robohash.org/${encodeURIComponent(name.current)}.png`);

  useEffect(() => {
    // Connexion au serveur WebSocket
    const socket = new WebSocket("ws://localhost:8080/ws");

    socket.onopen = () => {
      console.log("Connecté au WebSocket");
    };

    socket.onmessage = (event) => {
      try {
        // On attend que le serveur renvoie un message JSON
        const data = JSON.parse(event.data);
        setMessages(prev => [...prev, data]);
      } catch (e) {
        console.error("Erreur lors du parsing du message :", e);
      }
    };

    socket.onclose = () => {
      console.log("Connexion WebSocket fermée");
    };

    setWs(socket);

    // Fermeture du socket lors du démontage du composant
    return () => {
      socket.close();
    };
  }, []);

  const sendMessage = () => {
    if (ws && input) {
      // Création d'un objet message contenant le nom, l'avatar et le contenu
      const msg = {
        name: name.current,
        avatar: avatar.current,
        message: input
      };
      ws.send(JSON.stringify(msg));
      setInput("");
    }
  };

  const handleKeyPress = (event) => {
    if (event.key === "Enter") {
      sendMessage();
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Chat en temps réel</h2>
      <div style={{ marginBottom: 20, display: "flex", alignItems: "center" }}>
        <img
          src={avatar.current}
          alt="avatar"
          width="50"
          style={{ borderRadius: "50%" }}
        />
        <span style={{ marginLeft: 10, fontWeight: "bold" }}>{name.current}</span>
      </div>
      <div style={{
        border: "1px solid #ccc",
        padding: 10,
        height: 300,
        overflowY: "scroll"
      }}>
        {messages.map((msg, index) => (
          <div key={index} style={{ marginBottom: 10, display: "flex", alignItems: "center" }}>
            <img
              src={msg.avatar}
              alt="avatar"
              width="30"
              style={{ borderRadius: "50%" }}
            />
            <strong style={{ marginLeft: 5 }}>{msg.name} :</strong>
            <span style={{ marginLeft: 5 }}>{msg.message}</span>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 10 }}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Votre message..."
          style={{ width: "80%" }}
        />
        <button onClick={sendMessage} style={{ width: "18%", marginLeft: "2%" }}>
          Envoyer
        </button>
      </div>
    </div>
  );
}

export default App;
