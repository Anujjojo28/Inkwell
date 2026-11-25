# Inkwell – Content Management System (React + Vite)
## Problem statement
Non-technical teams need to create, review and publish website pages without developers. Inkwell gives writers a drag-and-drop page builder and gives admins approval, user management and analytics.
## Modules
- **Admin**: dashboard analytics, view all pages, approve/reject/publish, delete, manage users and roles.
- **User (writer)**: own dashboard, create/edit pages with drag-and-drop blocks, templates, SEO fields, submit for approval.
- **Public view**: `#/view/<slug>` renders published pages and counts views.
## Auth
Signup/Login use localStorage (`cms_users`, `cms_session`). Demo admin: `admin@cms.com` / `admin123`. Admin signup code: `CMS-ADMIN`.
## Run
`npm install && npm run dev`
## Deploy on Vercel
1. Push this folder to GitHub. 2. Vercel > Add New Project > import repo. 3. Framework: Vite (build `npm run build`, output `dist`). 4. Deploy. `vercel.json` handles routing.
