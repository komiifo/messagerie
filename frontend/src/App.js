import React, { useState, useEffect, useRef } from "react";

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
  const [connectedUsers, setConnectedUsers] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);

  const name = useRef(getRandomName());
  const avatar = useRef(
    `https://robohash.org/${encodeURIComponent(name.current)}.png`
  );

  // timer pour stop_typing
  const typingTimeout = useRef(null);

  useEffect(() => {
    const socket = new WebSocket("ws://localhost:8080/ws");

    socket.onopen = () => {
      socket.send(
        JSON.stringify({
          type: "join",
          name: name.current,
        })
      );
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        switch (data.type) {
          case "chat":
            setMessages((prev) => [...prev, data]);
            break;
          case "reaction":
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === data.messageId
                  ? {
                      ...msg,
                      reactions: [
                        ...(msg.reactions || []),
                        { name: data.name, emoji: data.reaction },
                      ],
                    }
                  : msg
              )
            );
            break;
          case "connected_users":
            setConnectedUsers(data.users);
            break;
          case "typing_users":
            if (Array.isArray(data.users)) {
              setTypingUsers(data.users.filter((u) => u !== name.current));
            } else {
              setTypingUsers([]);
            }
            break;
          default:
            break;
        }
      } catch (e) {
        console.error("Erreur lors du parsing du message :", e);
      }
    };

    setWs(socket);
    return () => socket.close();
  }, []);

  const sendMessage = () => {
    if (ws && input) {
      const msg = {
        type: "chat",
        name: name.current,
        avatar: avatar.current,
        message: input,
        id: Date.now().toString(),
      };
      ws.send(JSON.stringify(msg));
      setInput("");
      clearTimeout(typingTimeout.current); // Stop timer
      ws.send(JSON.stringify({ type: "stop_typing", name: name.current })); // Envoie arrêt
    }
  };

  const handleTyping = () => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "typing", name: name.current }));

      clearTimeout(typingTimeout.current);
      typingTimeout.current = setTimeout(() => {
        ws.send(JSON.stringify({ type: "stop_typing", name: name.current }));
      }, 2000); // 2 secondes après la dernière frappe
    }
  };

  const sendReaction = (messageId, emoji) => {
    if (ws) {
      ws.send(
        JSON.stringify({
          type: "reaction",
          name: name.current,
          messageId,
          reaction: emoji,
        })
      );
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Chat en temps réel</h2>

      <div>
        <strong>Connectés : ({connectedUsers.length})</strong>
      </div>

      <div>
        <em>
          {typingUsers.length > 0 &&
            `${typingUsers.slice(0, 3).join(", ")}${
              typingUsers.length > 3
                ? ` et ${typingUsers.length - 3} autres`
                : ""
            } ${typingUsers.length > 1 ? "écrivent..." : "écrit..."}`}
        </em>
      </div>

      <div style={{ marginBottom: 20, display: "flex", alignItems: "center" }}>
        <img
          src={avatar.current}
          alt="avatar"
          width="50"
          style={{ borderRadius: "50%" }}
        />
        <span style={{ marginLeft: 10, fontWeight: "bold" }}>
          {name.current}
        </span>
      </div>

      <div
        style={{
          border: "1px solid #ccc",
          padding: 10,
          height: 300,
          overflowY: "scroll",
        }}
      >
        {messages.map((msg, index) => (
          <div key={index} style={{ marginBottom: 10 }}>
            <div style={{ display: "flex", alignItems: "center" }}>
              <img
                src={msg.avatar}
                alt="avatar"
                width="30"
                style={{ borderRadius: "50%" }}
              />
              <strong style={{ marginLeft: 5 }}>{msg.name} :</strong>
              <span style={{ marginLeft: 5 }}>{msg.message}</span>
            </div>
            <div style={{ marginLeft: 40 }}>
              {["👍", "❤️", "😂"].map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => sendReaction(msg.id, emoji)}
                  style={{ marginRight: 5 }}
                >
                  {emoji}
                </button>
              ))}
              {msg.reactions &&
                msg.reactions.map((r, i) => (
                  <span key={i} style={{ marginLeft: 5 }}>
                    {r.emoji}
                  </span>
                ))}
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 10 }}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === "Enter" && sendMessage()}
          onInput={handleTyping}
          placeholder="Votre message..."
          style={{ width: "80%" }}
        />
        <button
          onClick={sendMessage}
          style={{ width: "18%", marginLeft: "2%" }}
        >
          Envoyer
        </button>
      </div>
    </div>
  );
}

export default App;
