# 🤖 Consignes et Règles pour les Agents IA (AGENTS.md)

Ce fichier regroupe l'ensemble des règles et directives obligatoires que tout agent IA (Antigravity ou autre) doit respecter scrupuleusement lors de ses interventions sur le projet **Smik Party / JKLM Clone**.

---

## 📌 Règle Obligatoire : Documentation Bilingue par Tâche

À **chaque tâche**, intervention ou étape de développement (correction de bug, refactorisation, nouvelle fonctionnalité, optimisation) :
L'agent **DOIT OBLIGATOIREMENT** créer deux fiches de documentation dans le dossier `documentation/` :

1. **Version française** dans [`documentation/fr/`](file:///c:/Users/bapti/Desktop/Moi/Projet-Perso/Personnal-website-project/documentation/fr/) :
   - Format de nommage : `Tache_<numero>_<YYYY-MM-DD>.md`
   - Exemple : `documentation/fr/Tache_20_2026-11-02.md`
2. **Version anglaise** dans [`documentation/en/`](file:///c:/Users/bapti/Desktop/Moi/Projet-Perso/Personnal-website-project/documentation/en/) :
   - Format de nommage : `Task_<numero>_<YYYY-MM-DD>.md`
   - Exemple : `documentation/en/Task_20_2026-11-02.md`

### 🔢 Numérotation et Index
- **Numéro incrémental** : Vérifier le dernier numéro existant dans `documentation/fr/` et incrémenter de 1 (`01`, `02`, ..., `19`, `20`, ...).
- **Date** : Utiliser la date du jour au format ISO `YYYY-MM-DD`.
- **Mise à jour des tables d'index** : Ajouter la nouvelle entrée dans le tableau récapitulatif de [`documentation/fr/README.md`](file:///c:/Users/bapti/Desktop/Moi/Projet-Perso/Personnal-website-project/documentation/fr/README.md) et [`documentation/en/README.md`](file:///c:/Users/bapti/Desktop/Moi/Projet-Perso/Personnal-website-project/documentation/en/README.md).

### 📝 Structure attendue pour chaque fiche de tâche
Chaque fiche de documentation doit comporter les sections suivantes :
- **Titre** : `# Tâche <N> : Intitulé` / `# Task <N>: Title`
- **Métadonnées** : Date, Auteur (`Antigravity & Baptiste-01`), Statut (`Terminé` / `Completed`)
- **Objectif / Objective** : Contexte du besoin ou du problème résolu
- **Plan d'action / Action Plan** : Étapes techniques prévues
- **Réalisation / Implementation** : Explications détaillées des modifications apportées avec la liste des fichiers modifiés
- **Vérifications / Technical Verification** : Commandes de test, typage (`tsc`), builds exécutés

---

## 🚫 Interdictions Strictes

- **GIT** : Interdiction formelle d'exécuter `git commit` ou `git push`. La gestion des commits est réservée à l'utilisateur.

---

## 🏷️ Formats Spécifiques à Fournir à Chaque Fin de Réponse

À la fin de chaque réponse, l'agent doit systématiquement inclure :
1. **Proposition de commit en anglais** :
   ```text
   Nom commit : "type: description in english"
   ```
2. **Consommation de tokens de la demande** :
   ```text
   Tokens used : "<nombre>", pourcentage de la limite utilisé : "<pourcentage>"%
   ```

---

## 📋 Formats sur Demande Explicite de l'Utilisateur

- **Compte-rendu** : Format markdown avec titre `Compte-rendu_'numero de la tache'_yyyy-mm-jj`
- **Fiche de tâche** : Format markdown avec titre `Tache_'numero de la tache'_yyyy-mm-dd`
- **Plan d'action** : Fichier markdown nommé `'PA-Tache-"nom ou numero de la tache"-"nom projet"'`

---

## ⚡ Directives d'Efficacité et de Frugalité en Tokens

1. **Hygiène du terminal** :
   - Ne jamais lancer de scan récursif sans exclure : `node_modules`, `.venv`, `.git`, `.next`, `dist`, `__pycache__`.
   - Utiliser systématiquement les filtres courts (`Select-Object -First 20`, flags silencieux).
2. **Lectures ciblées (`read_file`)** :
   - Cibler les plages de lignes (`StartLine`, `EndLine`), ne jamais lire inutilement des fichiers volumineux entiers.
3. **Frugalité des réponses** :
   - Modifier directement les fichiers avec `write_file` ou `edit_file`.
   - Ne jamais reproduire de gros blocs de code dans le chat : fournir un résumé en 3 à 5 points clés et les liens cliquables `file://`.
   - Aucun préambule inutile ou bavardage.
4. **Gestion de session** :
   - Recommander `/compact` en fin de sous-tâche complexe.

