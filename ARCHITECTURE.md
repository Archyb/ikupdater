# Architecture de l'Application IkDevUpdater

## Vue d'ensemble

Cette application Electron a été refactorisée avec TypeScript pour offrir une architecture claire, modulaire et maintenable.

## Structure du Projet

```
src/
├── types/                    # Types et interfaces TypeScript
│   └── index.ts             # Types principaux de l'application
├── services/                 # Services métier (logique principale)
│   ├── ConfigService.ts     # Gestion de la configuration
│   ├── CommandService.ts    # Exécution de commandes système
│   ├── GitService.ts        # Opérations Git
│   ├── ProjectScanService.ts # Détection et scan des projets
│   └── ActionService.ts     # Exécution des actions sur les projets
├── main/                    # Processus principal Electron
│   └── main.ts              # Point d'entrée du processus principal
├── preload.ts               # Script de préchargement (API bridge)
└── renderer/                # Processus de rendu (interface utilisateur)
    ├── classes/             # Classes modulaires pour l'UI
    │   ├── AppRenderer.ts   # Application principale du renderer
    │   ├── ThemeManager.ts  # Gestion des thèmes
    │   ├── ProjectManager.ts # Gestion des projets
    │   ├── LogManager.ts    # Gestion des logs
    │   └── VersionManager.ts # Gestion des versions
    ├── renderer.ts          # Point d'entrée du renderer
    ├── index.html           # Interface utilisateur
    └── tw.css              # Styles Tailwind CSS
```

## Architecture en Couches

### 1. Couche de Types (`src/types/`)
- Définit tous les types et interfaces TypeScript
- Assure la cohérence des données entre les processus
- Facilite la maintenance et la documentation

### 2. Couche de Services (`src/services/`)
- **ConfigService** : Gestion centralisée de la configuration
- **CommandService** : Exécution sécurisée des commandes système
- **GitService** : Opérations Git (branches, etc.)
- **ProjectScanService** : Détection et analyse des projets
- **ActionService** : Orchestration des actions (Git, PHP, Node.js)

### 3. Couche Main Process (`src/main/`)
- Point d'entrée de l'application Electron
- Gestion des fenêtres et des événements IPC
- Orchestration des services

### 4. Couche Renderer (`src/renderer/`)
- Interface utilisateur organisée en classes modulaires
- **AppRenderer** : Orchestrateur principal de l'UI
- **ThemeManager** : Gestion des thèmes (clair/sombre/système)
- **ProjectManager** : Gestion de l'état des projets
- **LogManager** : Affichage et gestion des logs
- **VersionManager** : Affichage des versions PHP/Node.js

## Avantages de cette Architecture

### 1. **Séparation des Responsabilités**
- Chaque classe/service a une responsabilité unique
- Facilite la maintenance et les tests
- Réduit le couplage entre les composants

### 2. **Typage Fort avec TypeScript**
- Détection d'erreurs à la compilation
- Auto-complétion et documentation intégrée
- Refactoring sécurisé

### 3. **Modularité**
- Services réutilisables
- Classes UI indépendantes
- Facilite l'ajout de nouvelles fonctionnalités

### 4. **Maintenabilité**
- Code organisé et documenté
- Patterns cohérents
- Facile à comprendre et modifier

## Patterns Utilisés

### 1. **Singleton Pattern**
- Services utilisent le pattern Singleton pour l'état global
- Assure une instance unique par service

### 2. **Service Layer Pattern**
- Logique métier encapsulée dans des services
- Séparation claire entre logique et présentation

### 3. **Observer Pattern**
- Communication asynchrone via IPC
- Gestion des événements UI

### 4. **Factory Pattern**
- Création d'instances de services
- Configuration centralisée

## Scripts de Build

- `npm run build` : Compilation complète avec TypeScript
- `npm run build:watch` : Compilation en mode watch
- `npm run dev` : Développement avec recompilation
- `npm run type-check` : Vérification des types sans compilation
- `npm run clean` : Nettoyage du dossier dist

## Configuration TypeScript

- **tsconfig.json** : Configuration de développement
- **tsconfig.build.json** : Configuration de production
- Types stricts activés pour la qualité du code
- Support des modules ES2020 et DOM

## Communication IPC

L'application utilise une API typée pour la communication entre les processus :

```typescript
interface ElectronAPI {
  selectFolder: () => Promise<string | null>;
  scanProjects: (baseDir: string) => Promise<Project[]>;
  executeAction: (payload: ExecuteActionPayload) => Promise<ExecuteActionResponse>;
  // ... autres méthodes
}
```

Cette architecture garantit une application robuste, maintenable et évolutive.
