# Google Analytics Setup Guide

This guide walks you through setting up Google Analytics for both tracking (frontend) and viewing analytics data (admin dashboard).

## Part 1: Google Analytics 4 Property Setup

### Step 1: Create GA4 Property
1. Go to [Google Analytics](https://analytics.google.com/)
2. Click **Admin** (gear icon in bottom left)
3. Click **Create Property**
4. Enter property name (e.g., “Mike’s AI Forge”)
5. Set timezone and currency
6. Click **Next** and complete setup

### Step 2: Get Measurement ID
1. In your new property, go to **Data Streams**
2. Click **Add stream** → **Web**
3. Enter your website URL
4. Copy the **Measurement ID** (format: `G-XXXXXXXXXX`)
5. Save this for frontend tracking

### Step 3: Install Tracking Code
1. Copy the measurement ID from Step 2
2. In your project, create/update `.env` file:
   ```
   VITE_GA_MEASUREMENT_ID=G-XXXXXXXXXX
   # Optional fallback used by the app if VITE_* is missing
   GOOGLE_ANALYTICS_ID=G-XXXXXXXXXX
   ```
3. The tracking code is already integrated in `services/analyticsService.ts`
4. Restart your dev server to apply changes
5. Netlify: after setting the variable, trigger “Deploy project without cache” to ensure the ID is embedded in the build.

### Frontend vs Backend Environment Variables (Quick Overview)
- Frontend (for client-side tracking, injected by Vite):
  - VITE_GA_MEASUREMENT_ID=G-XXXXXXXXXX
  - This is used by the frontend analyticsService to send pageviews/events (Measurement ID).
- Backend (for server-side access to GA4 data via the Data API):
  - GOOGLE_ANALYTICS_PROPERTY_ID=123456789
  - GOOGLE_ANALYTICS_CREDENTIALS_PATH=./google-analytics-credentials.json
  - These are used by your backend to authenticate with the Google Analytics Data API and fetch reports for the admin dashboard.

Be careful: frontend VITE_* variables are exposed to the browser; backend GOOGLE_* variables must remain secret and only be available to your server environment.

## Part 2: Google Analytics Data API Setup (for Admin Dashboard)

### Step 1: Create Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click **Select a project** → **New Project**
3. Enter project name (e.g., “Mike’s AI Forge Analytics”)
4. Click **Create**

### Step 2: Enable Google Analytics Data API
1. In Cloud Console, go to **APIs & Services** → **Library**
2. Search for **Google Analytics Data API**
3. Click on it and click **Enable**

### Step 3: Create Service Account
1. Go to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **Service Account**
3. Enter service account name (e.g., “analytics-viewer”)
4. Click **Create and Continue**
5. Skip role assignment (we’ll set permissions in GA4)
6. Click **Done**

### Step 4: Generate Service Account Key
1. Click on the service account you just created
2. Go to the **Keys** tab
3. Click **Add Key** → **Create new key**
4. Select **JSON** format
5. Click **Create** – a JSON file will download
6. **Important**: Keep this file secure, never commit to git

### Step 5: Add Service Account to GA4
1. Copy the service account email (format: `name@project-id.iam.gserviceaccount.com`)
2. Go back to [Google Analytics](https://analytics.google.com/)
3. Click **Admin** → Select your property
4. Click **Property Access Management**
5. Click “+” → **Add users**
6. Paste the service account email
7. Select role: **Viewer**
8. Uncheck “Notify new users by email”
9. Click **Add**

### Step 6: Configure Backend
1. Move the downloaded JSON file to your backend directory (e.g., `backend/google-analytics-credentials.json`)
2. Add to `.gitignore`:
   ```
   google-analytics-credentials.json
   ```
3. Update backend `.env` file:
   ```
   GOOGLE_ANALYTICS_PROPERTY_ID=123456789
   GOOGLE_ANALYTICS_CREDENTIALS_PATH=./google-analytics-credentials.json
   ```
4. To find your Property ID:
   - Go to GA4 Admin → **Property Settings**
   - Copy the numeric Property ID

### Step 7: Install Dependencies
1. In the backend directory, run:
   ```bash
   npm install @google-analytics/data
   ```

### Step 8: Test Integration
1. Start your backend server
2. Log in as admin
3. Navigate to **Admin → Google Analytics**
4. You should see your analytics data

## Troubleshooting

### “Credentials not found” error
- Verify the JSON file path in `.env` is correct
- Ensure the file has proper read permissions
- Check that the service account email was added to GA4

### “Permission denied” error
- Verify the service account has Viewer role in GA4
- Wait a few minutes for permissions to propagate

### No data showing
- Ensure your GA4 property is receiving data (check in GA4 Realtime)
- Verify the Property ID in `.env` matches your GA4 property
- Check that tracking code is installed on your website

## Security Best Practices

1. **Never commit credentials**: Always add credential files to `.gitignore`
2. **Use environment variables**: Store sensitive data in `.env` files
3. **Restrict service account**: Only grant Viewer role, not Editor
4. **Rotate keys**: Periodically create new service account keys
5. **Monitor usage**: Check Cloud Console for API usage and anomalies

## Reference

- [GA4 Setup Guide](https://support.google.com/analytics/answer/9304153)
- [Google Analytics Data API](https://developers.google.com/analytics/devguides/reporting/data/v1)
- [Service Account Authentication](https://cloud.google.com/docs/authentication/getting-started)

For additional help, refer to the attached screenshot showing the GA tag setup interface.