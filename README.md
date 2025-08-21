# Updater

Application Electron pour synchroniser et installer rapidement des projets (Git, Composer, Yarn/NPM) dans un même dossier parent.

## Fonctionnalités

- Détection des projets via `composer.json` et/ou `package.json`
- Détection de techno: PHP (Composer), Node/TypeScript (NPM/Yarn)
- Sélection de branche par projet via une liste déroulante (branches Git détectées)
- Synchronisation Git sûre: `fetch --all --prune` + `merge --ff-only origin/<branche>` (pas de rebase/pull/merge commit)
- Actions par projet: Git, PHP (Composer), Node (Yarn/NPM), ou Sync (tout enchaîner)
- `nvm use` automatique si `.nvmrc` présent (bonne version de Node)
- Vérification PHP ≥ 7.3 avant Composer (sinon, Composer est ignoré avec un message clair)
- Actions groupées (Git/PHP/Node) avec inclusion/exclusion par projet
- Logs en direct par projet + console globale
- Préférences persistées: dossier parent, inclusion et branche par projet

## Prérequis

- macOS
- Node.js + npm/yarn
- nvm installé dans `$HOME/.nvm` si vous utilisez `.nvmrc`
- PHP installé (≥ 7.3 recommandé pour Composer)
- Git installé et accès SSH configuré

## Démarrer en développement

```bash
npm install
npm run start
```

## Build macOS (.app / .dmg)

```bash
npm run dist
```

Sorties dans `dist/`:
- `Updater-<version>-arm64.dmg`
- `Updater-<version>-arm64-mac.zip`

Sans certificat macOS, l’app n’est pas signée (Gatekeeper peut prévenir). Ajoutez une signature via electron-builder si nécessaire.

## Utilisation

1. Ouvrez l’app, choisissez le dossier parent contenant vos projets
2. Ajustez "Inclure" et la branche par projet
3. Lancez des actions par projet ou les actions groupées
4. Surveillez les logs (carte du projet et console globale)

## Architecture

- `src/main/main.js`: processus principal (fenêtre, IPC, orchestration)
- `src/main/config.js`: configuration persistée (JSON dans `userData`)
- `src/main/exec.js`: exécution des commandes (stdout/stderr en streaming)
- `src/main/git.js`: opérations Git (branches, fetch)
- `src/preload.js`: pont sécurisé (API exposée au renderer)
- `src/renderer/*`: UI (HTML/CSS/JS), scan, actions, affichage des logs

## Sécurité Git

- Pas de rebase automatique, pas de merge non-FF, pas de `git pull`
- Mise à jour: `fetch --all --prune` puis `checkout` + `merge --ff-only`
- En cas de divergence, l’opération échoue sans modifier l’historique

## Dépannage

- nvm non détecté: vérifiez `~/.nvm/nvm.sh`
- PHP trop ancien (< 7.3): mettez à jour PHP pour Composer
- SSH prompt: désactivé pour éviter les blocages (dev uniquement)
