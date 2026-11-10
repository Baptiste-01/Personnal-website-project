# 📋 Plan d'Action - Tâche 29 : Système de Templates de Partie et Partage Multijoueur
**Projet :** JKLM Clone / Smik Party  
**Date :** 2026-11-09  
**Statut :** Réalisé & Validé  

---

## 1. 🎯 Contexte & Objectif

Permettre aux joueurs de sauvegarder, réutiliser et partager facilement des configurations complètes de parties (*Game Templates* / *Modèles de jeu*).

Un template regroupe :
- **La sélection des catégories** (ex: *Mythologie*, *Sciences*, *Cinéma*, etc.).
- **Les filtres avancés par catégorie** : niveaux de difficulté spécifiques (`facile`, `moyen`, `difficile`) et éventuels sous-thèmes / tags.
- **Les paramètres de manche et de jeu** :
  - Mode de manche (*Manches fixes* vs *Manches infinies*)
  - Nombre de manches (ex: 5, 10, 15, 20...)
  - Temps alloué par question (ex: 15s, 20s, 30s...)
  - Score maximum / Limite de points pour la victoire (ex: 1000 pts)
  - Points par bonne réponse / barème de rapidité
  - Limite de joueurs par défaut (optionnel)

Chaque compte utilisateur pourra gérer ses propres templates, et chaque template disposera d'un **système de partage** (lien que le joueur pourra envoyer si des personnes lui demandent) pour être utilisé ou cloné par d'autres joueurs.

---

## 2. 🗄️ Architecture des Données (Prisma / Base de Données)

### Nouveau modèle `GameTemplate` dans `packages/database/prisma/schema.prisma`

```prisma
model GameTemplate {
  id          String   @id @default(cuid())
  name        String                           // Nom du modèle (ex: "Culture G Express")
  description String?                          // Description optionnelle
  shareCode   String   @unique                 // Code court unique pour le partage (ex: "TMPL-8F2B")
  isPublic    Boolean  @default(false)         // Visible dans le catalogue public de la communauté
  usageCount  Int      @default(0)             // Compteur d'utilisations / popularité
  settings    Json                             // Objet JSON complet (GameSettings)
  
  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([userId])
  @@index([shareCode])
  @@index([isPublic])
}
```

Mise à jour du modèle `User` :
```prisma
model User {
  // ... champs existants
  templates GameTemplate[]
}
```

---

## 3. 🌐 Architecture API Backend (`apps/api`)

Création d'un module dédié `apps/api/routes/templates.ts` préfixé par `/templates` :

| Méthode | Route | Auth requise | Description |
|:---|:---|:---:|:---|
| `GET` | `/templates/my` | Oui (Bearer token) | Récupère tous les templates créés par l'utilisateur connecté |
| `GET` | `/templates/public` | Non | Récupère les templates publics de la communauté (avec filtres / recherche) |
| `GET` | `/templates/code/:shareCode` | Non | Récupère la configuration d'un template via son code de partage court (accessible à tout joueur, même invité) |
| `POST` | `/templates` | Oui (Bearer token) | Crée un nouveau template pour le compte connecté (génère un `shareCode` unique) |
| `PUT` | `/templates/:id` | Oui (Bearer token) | Met à jour un template existant (vérification stricte de propriété) |
| `DELETE` | `/templates/:id` | Oui (Bearer token) | Supprime un template (vérification propriétaire ou administrateur) |
| `POST` | `/templates/clone/:shareCode` | Oui (Bearer token) | Duplique un template partagé dans la bibliothèque personnelle du joueur |

---

## 4. 💻 Interface Utilisateur & Expérience Joueur (`apps/web`)

### A. Intégration dans le Modal de Création d'Arène (`Lobby`)
- **Bouton / Sélecteur de Templates** :
  - Menu déroulant ou bouton *"📂 Charger un template"* permettant de pré-remplir instantanément tous les champs (catégories, difficultés par catégorie, temps, manches, points max).
  - Bouton *"🔗 Importer par code"* pour charger un template partagé par un ami en collant simplement son code.
- **Bouton *"💾 Enregistrer comme template"*** :
  - Permet à l'hôte d'enregistrer la configuration actuelle sous un nouveau template personnalisé sans quitter le modal.

### B. Intégration dans le Panneau de Configuration de l'Arène (`Arena`)
- Dans l'onglet des réglages de partie de l'arène :
  - Possibilité pour l'hôte d'appliquer un template existant en cours de salon (avant le lancement de la partie).
  - Possibilité de sauvegarder les modifications courantes comme un nouveau template.

### C. Gestionnaire de Templates dans la Page Profil (`Profile`)
- Nouvel onglet ou section dédiée **"Mes Modèles de Partie"** :
  - Grille des templates créés avec résumé visuel (badges catégories, difficultés, durée, manches).
  - Actions :
    - 📋 **Copier le code** (ex: `TMPL-7K9A`) avec notification toast.
    - 🔗 **Copier le lien direct de partage** (`?template=TMPL-7K9A`).
    - ✏️ **Modifier** (nom, description, visibilité publique).
    - 🗑️ **Supprimer**.
  - Champ de saisie rapide *"Rejoindre / Importer avec un code de partage"*.

### D. Catalogue & Découverte Communautaire
- Section ou modale pour explorer les templates populaires partagés par les autres joueurs avec aperçu et bouton *"Utiliser pour créer une arène"* ou *"Ajouter à mes favoris / Cloner"*.

---

## 5. 🔗 Mécanisme de Partage

1. **Génération de code court sécurisé** :
   - Format lisible et convivial sans ambiguïté : préfixe `TMPL-` suivi de 4 à 6 caractères alphanumériques majuscules (ex: `TMPL-X7M2`).
2. **Partage par lien URL universel** :
   - Prise en charge des query parameters : `http://.../lobby?template=TMPL-X7M2`.
   - À l'ouverture de ce lien, l'application charge automatiquement le template et propose d'ouvrir la création d'arène avec ces paramètres.
3. **Accès sans friction** :
   - Même un joueur non connecté peut utiliser un code de template partagé pour lancer une partie.
   - La connexion n'est requise que pour sauvegarder et gérer des templates dans sa propre bibliothèque.

---

## 6. 📅 Découpage des Étapes d'Implémentation

1. **Étape 1 : Base de données & Modèle Prisma**
   - Ajout du modèle `GameTemplate` et relation avec `User`.
   - Migration / Synchronisation `prisma db push` et régénération du client `prisma generate`.
2. **Étape 2 : API Backend**
   - Implémentation des routes `/templates` avec validation des schémas, gestion de l'authentification et permissions.
   - Tests unitaires / endpoints API via curl/fetch.
3. **Étape 3 : Types et Utilitaires Frontend**
   - Définition des interfaces TypeScript (`GameTemplate`, `TemplateSharePayload`) dans `apps/web/src/types/index.ts`.
   - Service API client pour les templates.
4. **Étape 4 : Composants UI & Expérience de Partage**
   - Modal d'enregistrement et de sélection de templates dans le `Lobby` et dans `Arena`.
   - Modal ou composant de partage (copie de code et lien avec animation de confirmation).
   - Onglet de gestion des templates dans `Profile`.
5. **Étape 5 : Documentation Bilingue & Vérification**
   - Vérification TypeScript globale (`bun run build` ou `tsc --noEmit`).
   - Rédaction de la documentation bilingue (`documentation/fr/Tache_29_2026-11-09.md` et `documentation/en/Task_29_2026-11-09.md`).
   - Mise à jour des index `README.md`.

---

## 7. ❓ Questions & Choix Soumis à Validation Utilisateur

1. **Visibilité par défaut :** Préférez-vous que les templates soient privés par défaut (uniquement accessibles via le code de partage) avec une case à cocher pour les rendre "Publics dans le catalogue", ou directement publics ? Aucun moyen public uniquement privé et par lien de partage
2. **Emplacement principal :** Souhaitez-vous que la gestion complète (créer/supprimer/éditer) soit accessible principalement depuis la page Profil, ou également depuis une modale dédiée directement dans le Lobby ? Modale accessible par la page Profil
