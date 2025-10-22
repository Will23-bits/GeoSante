# GeoSante — Grippe et stratégie vaccinale

## Objectif
Analyser la grippe et la couverture vaccinale pour identifier les zones sous‑vaccinées, anticiper les besoins en doses, et proposer des actions concrètes et priorisées pour les décideurs et professionnels de santé.

Ce dépôt contient :
- Un pipeline d'harmonisation des données (ETL) pour la grippe et la vaccination.
- Une application React/TypeScript interactive pour visualiser l'incidence et la couverture vaccinale (tableaux, courbes, cartes choroplèthes).
- Notebooks et scripts d'analyse reproductibles.

## Résumé des critères adressés
- Pertinence : indicateurs par semaine ISO, région et tranche d'âge (incidence, couverture %), identification des zones sous‑vaccinées.
- Innovation : analyses croisées incidence ↔ couverture, détection d'anomalies (pics), visualisations synchronisées et interactives.
- Impact : livrables exploitables par les décideurs (CSV d'actions, recommandations temporelles et territoriales).
- Qualité de visualisation : graphiques lisibles, titres, légendes, palette cohérente et narration.
- Présentation des données : documentation méthodologique claire, notebook et application prêts à l'emploi.

## Données attendues
Format attendu (exemples) :
- Incidence grippe (CSV/JSON) : date (YYYY-MM-DD), regionCode, regionName, age, cases, population (optionnel), incidencePer100k (optionnel).
- Vaccination (CSV/JSON) : date (YYYY-MM-DD), regionCode, regionName, age, vaccine, dosesAdmin, populationTarget (optionnel).

Hypothèses raisonnables utilisées :
- Les dates seront converties en semaine ISO (YYYY-Www).
- Les codes de régions seront normalisés (ex : FR-84 → 84).
- Les tranches d'âge seront mappées sur des bins canoniques : 0-4, 5-11, 12-17, 18-49, 50-64, 65+.

## Harmonisation (ETL) — étapes principales
1. Normaliser les formats de date et convertir en semaine ISO.
2. Standardiser les codes/régions et les libellés d'âge.
3. Agréger/transformer les séries si nécessaire (ex : cumuls → hebdo).
4. Calculer les dérivés :
   - incidencePer100k = (cases / population) * 100000
   - coveragePct = (dosesAdmin / populationTarget) * 100
5. Contrôles de qualité : doublons, valeurs manquantes, bornes (0–100% pour la couverture), semaines invalides.
6. Exporter jeux de données prêts pour visualisation : `data/processed/` (CSV/JSON).

Un module d'exemple est fourni dans `src/data/harmonize.ts` (format TypeScript) pour servir de point d'entrée à l'ETL.

## Méthodologie analytique
- Détection de zones sous‑vaccinées : couverturePct < seuil (ex : 50%) et incidencePer100k élevée (seuils configurables).
- Tendances temporelles : lissage (moyenne mobile), détection d'anomalies par z‑score.
- Croisement par tranche d'âge pour prioriser les cohortes vulnérables.
- Génération automatique d'une liste d'actions : régions prioritaires, estimations de doses nécessaires, fenêtre temporelle de campagne.

## Visualisations proposées
- Courbes synchronisées incidence vs couverture par région et par âge.
- Carte choroplèthe interactive par semaine (sélection de semaine et d'âge).
- Barres empilées ou côte à côte par tranche d'âge pour comparer couverture vs objectif.
- Tableaux exportables et vue de recommandations (CSV).

Conseils de style :
- Utiliser des palettes colorimétriques accessibles (contraste, daltonisme).
- Titres et légendes explicites, unités affichées (ex. incidence pour 100k hab.).
- Annotations textuelles pour raconter l'histoire (ex. "Semaine 2024‑W03 : pic lié à...").

## Livrables dans le dépôt
- `notebooks/` — Notebooks (Jupyter) pour la méthodologie et l'EDA.
- `src/data/harmonize.ts` — Module TypeScript d'harmonisation (exemples de fonctions).
- `src/components/` — Composants React (cartes, graphiques, filtres).
- `data/raw/` — Données brutes (non modifiées).
- `data/processed/` — Données harmonisées prêtes à l'analyse.
- `server/` — Endpoints backend utiles pour fournir les données ou réaliser des traitements côté serveur.

## Mode d'emploi rapide (Windows - cmd.exe)
Pour installer et lancer l'application en développement :

```cmd
npm install
npm run dev
```

Notes :
- Si vous utilisez `pnpm` ou `yarn`, adaptez la commande.
- Variables d'environnement (optionnel) : chemins vers les données brutes, clés API (si utilisées).

## Exemples de commandes utiles
- Lancer uniquement le serveur (si séparé) :

```cmd
cd server
npm install
node index.js
```

- Regénérer les données harmonisées (script local) :

```cmd
node server/data/convertForOllama.js # ou un script ETL équivalent
```

# GeoSante — Nettoyage des données grippe

## Exécution du script de nettoyage (Clean Flu)
Le script principal de nettoyage se lance depuis la racine du dépôt avec Node.js :

- Se placer à la racine du projet :
  - Windows PowerShell :
    cd "C:\Users\ferre\MSC projet\GeoSante"

- Lancer la commande :
  node server/data/clean_flu.js

Le script affiche des messages de progression comme :
- "Clean Flu ETL: démarrage"
- "Écrit X enregistrements d'incidence dans data/processed"
- "Écrit Y enregistrements de couverture vaccinale dans data/processed"
- "Clean Flu ETL: terminé"

## Fichiers d'entrée attendus
Le script lit (si présents) à la racine du dépôt :
- `incidence.csv` — fichier d'incidence (format CSV simple)
- `couvertures-vaccinales-des-adolescent-et-adultes-departement.csv` — fichier de couvertures vaccinales

Remarques :
- Le parser CSV est simple (pas de gestion avancée des guillemets/virgules encapsulées).
- Le script ignore les lignes commençant par `#` dans `incidence.csv`.

## Fichiers de sortie
Les résultats sont écrits dans `data/processed` (créé si nécessaire) :
- `flu_incidence.json` et `flu_incidence.csv`
- `flu_vaccination.json` et `flu_vaccination.csv`

Les CSV contiennent les colonnes principales (semaine normalisée, code INSEE / nom, incidence par 100k ou coveragePct).

## Pré-requis & dépannage
- Node.js installé (version moderne, ex. >= 14). Le script a été testé avec Node 22.
- Si le script n'écrit rien, vérifier que les fichiers d'entrée existent à la racine.
- Pour problèmes de parsing numérique (virgules décimales, pourcentages), vérifier les valeurs source ; le script tente une normalisation automatique (virgule -> point, suppression de `%`).

## Contact rapide
Pour modifier la logique de nettoyage : éditer `server/data/clean_flu.js`.

---

Si vous voulez, je peux :
- Générer directement le fichier `notebooks/harmonisation.ipynb` (squelette) et un script d'exemple pour produire `data/processed/`.
- Ajouter ou adapter `README.md` en anglais ou dans un style plus concis pour un dépôt public.
- Commencer l'implémentation des composants React (carte choroplèthe + courbe synchronisée) et fournir des tests unitaires pour `src/data/harmonize.ts`.
