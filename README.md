# NWS Ideas — Boîte à idées numérique

Application React + TypeScript + Vite connectée à Supabase pour centraliser les idées d'amélioration de la Normandie Web School.

## Fonctionnalités

- Inscription/connexion avec e-mail NWS et mot de passe, confirmation par e-mail via Supabase Auth.
- Publication d'idées avec titre, description, catégorie et image facultative.
- Recherche, filtres par catégorie, tri par date/popularité.
- Votes uniques par étudiant/ idée, retrait du vote.
- Statuts : Proposée, À l’étude, Acceptée, Refusée, Réalisée.
- Interface de modération pour le rôle `admin`.
- Notifications de changement de statut (stockées en base).
- Schéma de commentaires prêt pour l'extension.
- RLS PostgreSQL pour protéger les données et les actions.

## Prérequis

- Node.js 20 ou plus récent
- Un compte Supabase
- Un compte GitHub (pour le dépôt)
- Un compte Vercel (facultatif, pour l'hébergement)

## Installation locale

1. Cloner le dépôt puis installer les dépendances :

   ```bash
   git clone <URL_DU_DEPOT>
   cd nws-ideas
   npm install
   ```

2. Dans Supabase, créer un projet puis ouvrir **SQL Editor**. Copier et exécuter le contenu de `supabase/schema.sql`.

3. Dans **Authentication > URL Configuration**, renseigner l'URL locale `http://localhost:5173` et l'URL de redirection autorisée. Activer la confirmation d'adresse e-mail. Vérifier avec l'équipe NWS le domaine officiel exact avant de changer `normandiewebschool.fr` dans le SQL et la variable d'environnement.

4. Copier `.env.example` en `.env` et remplacer les valeurs :

   ```env
   VITE_SUPABASE_URL=https://VOTRE_PROJET.supabase.co
   VITE_SUPABASE_ANON_KEY=VOTRE_CLE_ANON
   VITE_ALLOWED_EMAIL_DOMAIN=normandiewebschool.fr
   ```

   Ne jamais utiliser la clé `service_role` dans une application frontend ni la committer dans Git.

5. Démarrer l'application :

   ```bash
   npm run dev
   ```

   Ouvrir l'URL affichée par Vite, généralement `http://localhost:5173`.

6. Vérifier le build de production :

   ```bash
   npm run build
   npm run preview
   ```

## Créer un accès administrateur

Après `supabase/schema.sql`, exécuter une fois `supabase/admin-access.sql` dans Supabase > SQL Editor. Ajouter ensuite les adresses e-mail du personnel autorisé à `public.admin_email_allowlist` (la requête exacte est expliquée dans `ADMIN-SETUP.md`). Les adresses autorisées peuvent utiliser le bouton **Espace admin** pour créer leur compte ou se connecter. Le rôle est décidé par le trigger SQL ; un étudiant ne peut pas se donner les droits admin depuis le navigateur.

Ne pas distribuer de mot de passe administrateur partagé en production.

## Déploiement sur Vercel

1. Pousser le projet sur GitHub.
2. Dans Vercel, importer le dépôt.
3. Paramètres de build : `npm run build`; répertoire de sortie : `dist`.
4. Ajouter `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` et `VITE_ALLOWED_EMAIL_DOMAIN` dans les variables d'environnement Vercel.
5. Ajouter le domaine Vercel dans les URL autorisées de Supabase Auth.
6. Redéployer.

## Sécurité et points de vigilance

- Le contrôle du domaine e-mail est effectué côté interface et dans le trigger SQL, mais le domaine exact doit être confirmé avec la NWS.
- La confirmation d'adresse doit être activée dans Supabase Auth : la simple saisie d'une adresse n'authentifie pas un étudiant.
- Les profils ne sont pas publiquement lisibles. Ne pas sélectionner `profiles.email` dans les requêtes publiques.
- Les adresses autorisées à administrer sont gérées dans `public.admin_email_allowlist`; un trigger de confiance accorde ou révoque automatiquement le rôle correspondant.
- Les politiques RLS sont indispensables même si l'interface masque les boutons d'administration.
- La clé publique `anon` est prévue pour le navigateur avec RLS activée. La clé `service_role` ne doit jamais être exposée.
- Les notifications sont enregistrées en base ; une vue dédiée pour les consulter doit être ajoutée avant une mise en production complète.
- Les commentaires ont leur table et leurs règles RLS, mais le formulaire de commentaires reste une extension à finaliser.
- Avant une vraie mise en production, faire auditer les politiques RLS, les règles de modération, l'accessibilité et le flux d'images.

## Comptes de démonstration

Les identifiants réels ne peuvent pas être précréés sans un projet Supabase. Créer un compte étudiant via l'écran Inscription, puis un compte admin de test et promouvoir son rôle avec la requête ci-dessus. Ne jamais publier de vrais mots de passe dans le dépôt.

## Structure

```text
nws-ideas/
├── src/
│   ├── lib/supabase.ts
│   ├── App.tsx
│   ├── main.tsx
│   ├── styles.css
│   └── types.ts
├── supabase/schema.sql
├── .env.example
├── index.html
├── package.json
└── README.md
```

## Identité visuelle

L'interface utilise une direction graphique contemporaine : bleu nuit, jaune lumineux, fonds clairs, typographies Space Grotesk et DM Sans. Les couleurs sont une proposition de maquette et doivent être ajustées à la charte officielle NWS si celle-ci est fournie.


## Identité visuelle NWS
- Orange NWS : `#e94a34`
- Bleu NWS : `#00a5a5`
- Jaune NWS : `#fec800`
- Logo fourni : `public/logo-nws.jpeg`
Les couleurs sont appliquées aux actions principales, aux éléments de navigation et aux accents de l'interface.

## Espace administrateur (sécurisé)

Après avoir appliqué `supabase/schema.sql`, exécutez une fois `supabase/admin-access.sql` dans Supabase > SQL Editor. Puis autorisez les adresses du personnel NWS en ajoutant leurs e-mails à `public.admin_email_allowlist` via SQL Editor. Une adresse autorisée peut créer son compte depuis le bouton **Espace admin**; les autres adresses ne peuvent pas s'auto-attribuer le rôle. Le rôle est décidé côté base de données, pas seulement par l'interface.
