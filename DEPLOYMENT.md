# Deployment Setup for Google Cloud Run

This document outlines the setup required to deploy the API to Google Cloud Run using GitHub Actions and Google Cloud Build.

## Prerequisites

1. **Google Cloud Project**: Create a GCP project and note the project ID
2. **Enable APIs**: Enable the following APIs in your GCP project:
   - Cloud Run API
   - Cloud Build API
   - Container Registry API

## Google Cloud Setup

### 1. Create a Service Account

```bash
# Create service account
gcloud iam service-accounts create github-actions \
    --description="Service account for GitHub Actions" \
    --display-name="GitHub Actions"

# Grant necessary roles
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
    --member="serviceAccount:github-actions@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/run.admin"

gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
    --member="serviceAccount:github-actions@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/cloudbuild.builds.builder"

gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
    --member="serviceAccount:github-actions@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/storage.admin"

gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
    --member="serviceAccount:github-actions@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/iam.serviceAccountUser"

# Create and download service account key
gcloud iam service-accounts keys create key.json \
    --iam-account=github-actions@YOUR_PROJECT_ID.iam.gserviceaccount.com

# Grant Secret Manager access to the Compute Engine default service account
gcloud projects add-iam-policy-binding beam-467512 \
    --member="serviceAccount:<SERVICE_ACCOUNT_ID>-compute@developer.gserviceaccount.com" \
    --role="roles/secretmanager.secretAccessor"
```

### 2. Enable Cloud Build Triggers (Optional)

If you want to trigger builds directly from Cloud Build:

```bash
gcloud builds triggers create github \
    --repo-name=YOUR_REPO_NAME \
    --repo-owner=YOUR_GITHUB_USERNAME \
    --branch-pattern="^main$" \
    --build-config=packages/api/cloudbuild.yaml
```

## GitHub Repository Setup

### 1. Add Repository Secrets

Go to your GitHub repository → Settings → Secrets and variables → Actions, and add:

- `GCP_PROJECT_ID`: Your Google Cloud project ID
- `GCP_SA_KEY`: Contents of the `key.json` file created above (entire JSON content)

### 2. Environment Variables (Optional)

If your API requires environment variables, add them to the Cloud Run deployment in `cloudbuild.yaml`:

```yaml
--set-env-vars: NODE_ENV=production,DATABASE_URL=your-db-url,JWT_SECRET=your-secret
```

Or use Google Secret Manager for sensitive values:

```yaml
--set-secrets: JWT_SECRET=jwt-secret:latest,DATABASE_URL=database-url:latest
```

## Deployment Process

The deployment is triggered automatically when:

1. Code is pushed to the `main` branch
2. Changes are made to files in `packages/api/`, `packages/core/`, `package.json`, or `bun.lock`

### Manual Deployment

To deploy manually using Cloud Build:

```bash
gcloud builds submit \
    --config=packages/api/cloudbuild.yaml \
    --substitutions=COMMIT_SHA=$(git rev-parse HEAD) \
    .
```

## Monitoring and Logs

- **Cloud Run Console**: https://console.cloud.google.com/run
- **Cloud Build History**: https://console.cloud.google.com/cloud-build/builds
- **Container Registry**: https://console.cloud.google.com/gcr

## Troubleshooting

### Common Issues

1. **Permission Denied**: Ensure the service account has all required roles
2. **Build Failures**: Check Cloud Build logs in the GCP console
3. **Container Registry Access**: Verify Container Registry API is enabled
4. **Memory/CPU Limits**: Adjust resources in `cloudbuild.yaml` if needed

### Useful Commands

```bash
# View Cloud Run services
gcloud run services list

# View service details
gcloud run services describe beam-api --region=us-central1

# View logs
gcloud logs read --service=beam-api --limit=50

# Update service configuration
gcloud run services update beam-api \
    --region=us-central1 \
    --memory=1Gi \
    --cpu=2
```

## Cost Optimization

- Cloud Run charges only for actual usage
- Consider setting `--min-instances=0` for development
- Use `--max-instances` to control scaling limits
- Monitor usage in the GCP billing console
