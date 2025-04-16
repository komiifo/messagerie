# Application de chat en temps réel

Cette application est un système de messagerie instantanée fullstack, avec un **frontend React** et un **backend en Go** qui communiquent via WebSocket.

## 🔧 Stack technique

- Frontend : React 19
- Backend : Golang + WebSocket
- Conteneurisation : Docker & Docker Compose

## 📦 Prérequis

- Docker et Docker Compose installés

## 🚀 Lancer l'application

```bash
docker-compose up --build
```

- Frontend dispo sur http://localhost:3000
- Backend WebSocket sur ws://localhost:8080/ws

## 🗂️ Arborescence du projet

```
mon-app/
├── backend/
│   ├── Dockerfile
│   └── main.go
├── frontend/
│   ├── Dockerfile
│   ├── package.json
│   └── src/
├── docker-compose.yml
└── README.md
```

## 🛠️ Commandes utiles

```bash
# React
npm install
npm run start

# Go
cd backend
go run main.go
```

## 🧪 Fonctionnalités

- Connexion WebSocket temps réel
- Avatar dynamique généré via robohash
- Pseudo aléatoire pour chaque utilisateur

## 📘 Contribution

- Projet versionné avec Git
- Branche principale : `main`
- Convention de commit : messages clairs en anglais/français

---

📝 **Auteur** : Jhonatan GALAIS

Projet réalisé dans le cadre du TP CDA – Bloc 1 – Compétence 1 : *Installer et configurer son environnement de travail*
