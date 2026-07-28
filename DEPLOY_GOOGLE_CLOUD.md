# Nasazení na Google Cloud

Doporučená produkční varianta pro tuto aplikaci:

- backend: Cloud Run service `revize-backend`
- frontend: Cloud Run service `revize-frontend`
- databáze: Cloud SQL for PostgreSQL
- doména: vlastní doména namapovaná na frontend Cloud Run service

## 1. Cloud SQL

V Google Cloud Console vytvoř PostgreSQL instanci, databázi a uživatele.

Příklad databázové URL pro Cloud Run přes Cloud SQL socket:

```text
postgresql+psycopg2://DB_USER:DB_PASSWORD@/DB_NAME?host=/cloudsql/PROJECT_ID:REGION:INSTANCE_NAME
```

Tuto hodnotu nastav backendu jako `DATABASE_URL`.

## 2. Backend Cloud Run

Build kontejneru z adresáře `revize-backend`:

```powershell
gcloud builds submit revize-backend --tag REGION-docker.pkg.dev/PROJECT_ID/revize/revize-backend:latest
```

Deploy:

```powershell
gcloud run deploy revize-backend `
  --image REGION-docker.pkg.dev/PROJECT_ID/revize/revize-backend:latest `
  --region REGION `
  --allow-unauthenticated `
  --add-cloudsql-instances PROJECT_ID:REGION:INSTANCE_NAME `
  --set-env-vars DATABASE_URL="postgresql+psycopg2://DB_USER:DB_PASSWORD@/DB_NAME?host=/cloudsql/PROJECT_ID:REGION:INSTANCE_NAME",SECRET_KEY="CHANGE_ME",PUBLIC_API_BASE_URL="https://BACKEND_URL",PUBLIC_APP_BASE_URL="https://FRONTEND_URL"
```

Backend kontejner při startu spustí:

```text
alembic upgrade head
uvicorn main:app
```

## 3. Frontend Cloud Run

Build kontejneru z adresáře `revize-frontend`:

```powershell
gcloud builds submit revize-frontend --tag REGION-docker.pkg.dev/PROJECT_ID/revize/revize-frontend:latest
```

Deploy:

```powershell
gcloud run deploy revize-frontend `
  --image REGION-docker.pkg.dev/PROJECT_ID/revize/revize-frontend:latest `
  --region REGION `
  --allow-unauthenticated `
  --set-env-vars API_ORIGIN="https://BACKEND_URL",ROUTER_MODE="hash"
```

Frontend zapisuje `/app-config.js` při startu kontejneru podle `API_ORIGIN`, takže změna URL backendu nevyžaduje rebuild frontendu.

## 4. Doména

V Cloud Run nastav mapování vlastní domény na `revize-frontend`.

Po nastavení domény uprav backend env:

```text
PUBLIC_APP_BASE_URL=https://www.lb-eltech.online
PUBLIC_API_BASE_URL=https://BACKEND_URL
```

## 5. Pozor na fotky

Backend teď ukládá fotky revizí do lokální složky:

```text
revize-backend/uploads/revision_photos
```

Na Cloud Run je lokální disk dočasný. Pro spolehlivý ostrý provoz je potřeba další krok: přesunout ukládání fotek do Cloud Storage.
