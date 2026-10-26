# Activer le formulaire Espace admin

Ce parcours sépare la connexion étudiante de l'accès administrateur. Pour la sécurité, on ne doit pas permettre à n'importe quel visiteur de s'inscrire comme admin : sinon un étudiant pourrait obtenir les droits de modération.

## Une seule fois : installer les règles

1. Ouvrir le projet dans Supabase.
2. Aller dans **SQL Editor** > **New query**.
3. Ouvrir le fichier `supabase/admin-access.sql`, copier tout son contenu dans l'éditeur, puis cliquer **Run**.

## Autoriser le premier administrateur

Dans SQL Editor, exécuter la requête suivante en remplaçant l'adresse d'exemple par l'adresse NWS exacte de la personne autorisée :

```sql
insert into public.admin_email_allowlist(email)
values (lower('prenom.nom@normandiewebschool.fr'))
on conflict (email) do nothing;
```

Cette liste est privée. L'ajout de l'adresse attribue automatiquement le rôle à son profil s'il existe déjà. Si le compte n'existe pas, la personne peut le créer depuis le bouton **Espace admin**. Le rôle sera attribué par le trigger SQL quand elle s'inscrit avec cette adresse et le formulaire admin.

Pour autoriser un autre membre du personnel, exécuter la même requête avec sa propre adresse. Il n'est pas nécessaire d'éditer manuellement la colonne `profiles.role`.

Pour révoquer un accès, supprimer l'adresse autorisée :

```sql
delete from public.admin_email_allowlist
where email = lower('prenom.nom@normandiewebschool.fr');
```

La suppression de l'adresse retire automatiquement le rôle admin au profil correspondant. N'ajoutez que des adresses de personnes réellement autorisées à administrer le site.

## Connexion

- **Espace admin** ouvre le formulaire dédié.
- Une adresse autorisée peut s'inscrire ou se connecter.
- Une adresse non autorisée ne reçoit pas de privilèges d'administration.
- Les étudiants gardent le formulaire étudiant habituel.

Après modification du code, lancer `npm run build`, puis envoyer les changements sur GitHub pour déclencher un nouveau déploiement Vercel.
