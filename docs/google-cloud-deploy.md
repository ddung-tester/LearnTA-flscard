# Deploy backend + MySQL on Google Cloud

This backend is ready for Cloud Run + Cloud SQL for MySQL.
This guide uses `gcloud run deploy --source .`, so you do not need to create or run a Dockerfile manually.
The backend prioritizes `INSTANCE_CONNECTION_NAME` and connects through `/cloudsql/...`; do not set `DB_HOST` for Cloud Run.

## 1. Create Cloud SQL MySQL

```bash
gcloud sql instances create learn-ta-mysql \
  --database-version=MYSQL_8_0 \
  --region=asia-southeast1 \
  --tier=db-f1-micro

gcloud sql databases create learn_ta_flashcard \
  --instance=learn-ta-mysql

gcloud sql users set-password root \
  --instance=learn-ta-mysql \
  --password="YOUR_STRONG_PASSWORD"
```

Import schema and optional seed data:

```bash
gcloud sql connect learn-ta-mysql --user=root
```

Then run the SQL from:

```txt
backend/database/schema.sql
backend/database/seed.sql
backend/database/migrations/*.sql
```

## 2. Prepare secrets and IAM

Create secrets:

```bash
printf "YOUR_DB_PASSWORD" | gcloud secrets create DB_PASSWORD_SECRET --data-file=-
printf "YOUR_LONG_RANDOM_JWT_SECRET" | gcloud secrets create JWT_SECRET --data-file=-
```

Grant the Cloud Run service account access to Cloud SQL:

```bash
gcloud projects add-iam-policy-binding PROJECT_ID \
  --member="serviceAccount:PROJECT_NUMBER-compute@developer.gserviceaccount.com" \
  --role="roles/cloudsql.client"
```

## 3. Deploy backend to Cloud Run

From `backend/`:

```bash
gcloud run deploy learn-ta-backend \
  --source . \
  --region asia-southeast1 \
  --allow-unauthenticated \
  --add-cloudsql-instances PROJECT_ID:asia-southeast1:learn-ta-mysql \
  --set-env-vars INSTANCE_CONNECTION_NAME=PROJECT_ID:asia-southeast1:learn-ta-mysql,DB_USER=root,DB_NAME=learn_ta_flashcard,CORS_ORIGIN=https://YOUR_FRONTEND_DOMAIN \
  --set-secrets DB_PASSWORD=DB_PASSWORD_SECRET:latest,JWT_SECRET=JWT_SECRET:latest
```

## 4. Verify

```bash
curl https://YOUR_CLOUD_RUN_URL/api/health
curl https://YOUR_CLOUD_RUN_URL/api/db-test
```

Use the Cloud Run URL as `VITE_API_BASE_URL` for the frontend.
