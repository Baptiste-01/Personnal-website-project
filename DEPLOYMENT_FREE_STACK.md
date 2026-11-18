# 🚀 Guide de Déploiement Cloud 100% Gratuit (Stack 1)

Ce guide détaille pas à pas la mise en ligne complète et gratuite de **Smik Party** (Frontend, Backend WebSockets et Base de données PostgreSQL) en conservant votre dépôt GitHub **strictement privé**.

---

## 🏗️ Architecture du Déploiement Gratuit

```text
┌─────────────────────────┐         ┌─────────────────────────┐
│   Vercel (0€ / mois)    │ ──────> │   Render (0€ / mois)    │
│    Client React 18      │  HTTPS  │    Backend Bun/Elysia   │
│  smik-party.vercel.app  │   WSS   │   smik-api.onrender.com │
└─────────────────────────┘         └─────────────────────────┘
                                                 │
                                                 │ Prisma (SSL)
                                                 ▼
                                    ┌─────────────────────────┐
                                    │    Neon (0€ / mois)     │
                                    │  PostgreSQL Serverless  │
                                    │   ep-xyz.neon.tech      │
                                    └─────────────────────────┘
```

---

## ⚡ Étape 1 : Créer la Base de Données Gratuite sur Neon (2 min)

1. Rendez-vous sur **[neon.tech](https://neon.tech/)** et connectez-vous avec votre compte GitHub (0 carte bancaire requise).
2. Cliquez sur **`Create project`** :
   - **Nom du projet :** `smik-party-db`
   - **Région :** `Europe (Frankfurt)` pour une latence minimale.
   - Cliquez sur **`Create project`**.
3. Sur votre tableau de bord Neon, dans **`Connection Details`** :
   - Cochez **`Pooled connection`** (recommandé pour les architectures cloud).
   - Copiez l'URL PostgreSQL affichée (elle se termine par `?sslmode=require`).
   - *Exemple :* `postgresql://neondb_owner:xyz123@ep-proud-field-a28a32.eu-central-1.aws.neon.tech/neondb?sslmode=require`

---

## ⚡ Étape 2 : Déployer le Backend sur Render.com (3 min)

1. Rendez-vous sur **[render.com](https://render.com/)** et connectez-vous avec GitHub.
2. Cliquez sur **`New +`** ➔ **`Web Service`**.
3. Choisissez **`Build and deploy from a Git repository`** et sélectionnez votre dépôt (Render accède aux dépôts privés grâce à votre autorisation GitHub).
4. Configurez les champs du service :
   - **Name :** `smik-party-api`
   - **Region :** `Frankfurt (EU Central)`
   - **Runtime :** `Docker` (Render détecte automatiquement le fichier [`Dockerfile.api`](file:///c:/Users/bapti/Desktop/Moi/Projet-Perso/Personnal-website-project/Dockerfile.api))
   - **Dockerfile Path :** `./Dockerfile.api`
   - **Instance Type :** `Free` (0 $/mois)
5. Dans la section **`Environment Variables`**, ajoutez :
   - `DATABASE_URL` : Collez l'URL Neon obtenue à l'Étape 1.
   - `JWT_SECRET` : Cliquez sur *Generate* ou collez une chaîne aléatoire d'au moins 32 caractères.
   - `NODE_ENV` : `production`
6. Cliquez sur **`Create Web Service`**.
   - En ~2 minutes, votre API sera en ligne avec son URL publique HTTPS (ex: `https://smik-party-api.onrender.com`).
   - Testez l'URL dans votre navigateur : vous devez voir le JSON `{ "name": "Smik Party API", "status": "online", "db": "connected" }`.

---

## ⚡ Étape 3 : Déployer le Frontend sur Vercel (2 min)

1. Rendez-vous sur **[vercel.com](https://vercel.com/)** et connectez-vous avec votre compte GitHub.
2. Cliquez sur **`Add New...`** ➔ **`Project`**.
3. Importez votre dépôt GitHub privé.
4. Dans les paramètres de configuration :
   - **Framework Preset :** `Vite`
   - **Root Directory :** cliquez sur *Edit* et sélectionnez `apps/web` (ou laissez la racine grâce au fichier [`vercel.json`](file:///c:/Users/bapti/Desktop/Moi/Projet-Perso/Personnal-website-project/vercel.json)).
5. Dépliez la section **`Environment Variables`** et ajoutez :
   - **`VITE_API_URL`** : `https://smik-party-api.onrender.com` (l'URL de votre API Render)
   - **`VITE_WS_URL`** : `wss://smik-party-api.onrender.com` (la même URL avec le préfixe sécurisé `wss://`)
6. Cliquez sur **`Deploy`**.
   - En ~1 minute, votre site est en ligne en HTTPS sur une URL du type `https://smik-party.vercel.app`.

---

## ⚡ Étape 4 : Initialiser les Tables dans Neon (1 min)

Pour injecter le schéma de base de données (tables des questions, arènes, utilisateurs) dans votre nouvelle base Neon depuis votre ordinateur :

1. Créez un fichier temporaire `.env.production` à la racine de votre projet :
   ```env
   DATABASE_URL="votre_url_neon_complete_avec_sslmode_require"
   ```
2. Exécutez la commande préparée dans le projet :
   ```bash
   bun run db:push:prod
   ```
3. (Optionnel) Pour injecter des données initiales :
   ```bash
   bun run db:seed:prod
   ```
4. Supprimez ensuite le fichier `.env.production` pour préserver vos secrets.

---

## 🔒 Étape 5 : Inviter un Recruteur sur votre Dépôt Privé

Votre site est désormais 100% opérationnel en ligne et votre code source reste protégé :
1. Sur GitHub : Allez sur votre dépôt ➔ **`Settings`** ➔ **`Collaborators`**.
2. Cliquez sur **`Add people`** et renseignez le pseudo GitHub du recruteur.
3. Le recruteur pourra examiner votre code source sans que le grand public n'y ait accès.
