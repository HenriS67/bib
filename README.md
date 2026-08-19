# Qwik City App ⚡️

- [Qwik Docs](https://qwik.dev/)
- [Discord](https://qwik.dev/chat)
- [Qwik GitHub](https://github.com/QwikDev/qwik)
- [@QwikDev](https://twitter.com/QwikDev)
- [Vite](https://vitejs.dev/)

---

## Project Structure

This project is using Qwik with [QwikCity](https://qwik.dev/qwikcity/overview/). QwikCity is just an extra set of tools on top of Qwik to make it easier to build a full site, including directory-based routing, layouts, and more.

Inside your project, you'll see the following directory structure:

```
├── public/
│   └── ...
└── src/
    ├── components/
    │   └── ...
    └── routes/
        └── ...
```

- `src/routes`: Provides the directory-based routing, which can include a hierarchy of `layout.tsx` layout files, and an `index.tsx` file as the page. Additionally, `index.ts` files are endpoints. Please see the [routing docs](https://qwik.dev/qwikcity/routing/overview/) for more info.

- `src/components`: Recommended directory for components.

- `public`: Any static assets, like images, can be placed in the public directory. Please see the [Vite public directory](https://vitejs.dev/guide/assets.html#the-public-directory) for more info.

## Add Integrations and deployment

Use the `pnpm qwik add` command to add additional integrations. Some examples of integrations includes: Cloudflare, Netlify or Express Server, and the [Static Site Generator (SSG)](https://qwik.dev/qwikcity/guides/static-site-generation/).

```shell
pnpm qwik add # or `pnpm qwik add`
```

## Development

Development mode uses [Vite's development server](https://vitejs.dev/). The `dev` command will server-side render (SSR) the output during development.

```shell
npm start # or `pnpm start`
```

> Note: during dev mode, Vite may request a significant number of `.js` files. This does not represent a Qwik production build.

## PostgreSQL

The project includes a server-side PostgreSQL layer using Drizzle ORM. Copy `.env.example` to `.env` and set `DATABASE_URL` before using it.

The initial schema contains:

- `authors`: author identity and image URL
- `books`: book metadata and a `pdf_url` pointing to the PDF storage

Create or update the database schema with:

```shell
pnpm db:push
```

For a migration-based workflow, use `pnpm db:generate` followed by `pnpm db:migrate`.

PDF files should live in object storage or a protected file server. PostgreSQL should store their metadata and URL, not large PDF binaries. The database connection is server-only and must never be exposed to browser code.

### Utiliser la bibliothèque PDF

1. Démarrer PostgreSQL :

```shell
sudo systemctl enable --now postgresql
```

2. Vérifier `.env` :

```env
DATABASE_URL=postgresql://bibliotheque_user:VOTRE_MOT_DE_PASSE@localhost:5432/bibliotheque
```

3. Créer les tables :

```shell
pnpm db:push
```

4. Insérer un exemple de catalogue :

```shell
PGPASSWORD='VOTRE_MOT_DE_PASSE' psql -h localhost -U bibliotheque_user -d bibliotheque -f src/db/seed.sql
```

5. Placer les fichiers correspondants dans `public/books` pour un usage local, par exemple `public/books/summa-theologiae.pdf`. La valeur `pdf_url` doit alors être `/books/summa-theologiae.pdf`. Pour un déploiement, utiliser plutôt une URL HTTPS vers un stockage de fichiers protégé.

Les pages `/`, `/auteurs/<id>`, `/recherche?q=...` et `/livres/<id>` interrogent PostgreSQL côté serveur. La page livre affiche le PDF indiqué par `pdf_url` dans le lecteur intégré.

### Importer une bibliothèque organisée par auteur

Le format attendu est :

```text
ma-bibliotheque/
    Aristote/
        Metaphysique.pdf
        Politique.pdf
    Saint Augustin/
        Confessions.pdf
```

Lance l'importeur depuis la racine du projet :

```shell
pnpm db:import-pdfs "/chemin/vers/ma-bibliotheque"
```

Il crée les auteurs, copie les PDF dans `public/books`, ajoute les livres dans PostgreSQL et ignore les livres déjà importés. Les noms de dossiers deviennent les auteurs et les noms de fichiers deviennent les titres. Si la commande `pdfinfo` est installée, le nombre de pages est détecté automatiquement ; sinon il est enregistré à `0`.

### Vider les données de test

Cette commande supprime tous les auteurs et tous les livres, mais conserve les tables :

```shell
pnpm db:clear --yes
```

Les fichiers PDF déjà copiés dans `public/books` ne sont pas supprimés. Supprime-les manuellement uniquement si nécessaire.

## Preview

The preview command will create a production build of the client modules, a production build of `src/entry.preview.tsx`, and run a local server. The preview server is only for convenience to preview a production build locally and should not be used as a production server.

```shell
pnpm preview # or `pnpm preview`
```

## Production

The production build will generate client and server modules by running both client and server build commands. The build command will use Typescript to run a type check on the source code.

```shell
pnpm build # or `pnpm build`
```
