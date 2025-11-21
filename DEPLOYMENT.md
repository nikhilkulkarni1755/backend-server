# Deployment Guide for Railway

## Prerequisites

- Railway CLI installed: `npm install -g @railway/cli`
- Logged into Railway: `railway login`
- Expo access token created and ready

## Step-by-Step Deployment

### 1. Prepare Your Local Environment

```bash
cd /Users/nikhilkulkarni/AppVibeCoding/Components/backend
```

### 2. Initialize Git (if not already done)

```bash
git init
git config user.email "your-email@example.com"
git config user.name "Your Name"
git add .
git commit -m "Initial commit: Push notification backend"
```

### 3. Link to Railway Project

Choose one of these options:

**Option A: Create a new Railway project**
```bash
railway init
# Follow prompts to create a new project
```

**Option B: Link to existing Railway project**
```bash
railway link
# Select your project from the list
```

### 4. Set Environment Variables

```bash
railway variables set EXPO_ACCESS_TOKEN your_expo_token_here
```

Or set via Railway dashboard:
1. Go to your project at https://railway.app
2. Select your "backend" service
3. Click "Variables"
4. Add `EXPO_ACCESS_TOKEN` with your token value
5. Save

### 5. Deploy

```bash
railway up
```

This will:
- Push your code to Railway
- Install dependencies
- Build the project
- Start the server

### 6. Get Your Public URL

After deployment succeeds, get your URL:

```bash
railway variables list
# Look for the $RAILWAY_PUBLIC_DOMAIN variable
```

Or via Railway dashboard:
1. Go to your project
2. Select "backend" service
3. Look for "Public URL" (under Deployments or Environment)

Example URL:
```
https://notification-backend-production.up.railway.app
```

### 7. Verify Deployment

Test your deployed backend:

```bash
BACKEND_URL="https://notification-backend-production.up.railway.app"

# Health check
curl $BACKEND_URL/health

# Test notification
curl -X POST $BACKEND_URL/send-notification \
  -H "Content-Type: application/json" \
  -d '{"message": "Deployment successful!"}'
```

You should see:
```json
{
  "success": true,
  "message": "Notifications sent",
  "devicesNotified": 0,
  "notification": {
    "title": "Notification",
    "body": "Deployment successful!"
  }
}
```

### 8. Update Frontend

In your React Native app (`/react-native/NotificationDemo/app/(tabs)/index.tsx`):

Update the fetch URL from:
```typescript
const response = await fetch('http://localhost:3000/send-notification', {
```

To:
```typescript
const response = await fetch('https://your-railway-url.up.railway.app/send-notification', {
```

## Viewing Logs

See what's happening on your deployed backend:

```bash
# Live logs
railway logs

# Or via dashboard at https://railway.app
```

## Redeployment

After making code changes:

```bash
git add .
git commit -m "Your changes"
railway up
```

Or push to a connected GitHub repo and Railway will auto-deploy.

## Troubleshooting

### Build fails
- Check logs: `railway logs`
- Ensure all dependencies are in package.json
- Verify Node.js version compatibility

### Server starts but notifications fail
- Verify `EXPO_ACCESS_TOKEN` is set
- Check Railway logs for errors

### Can't connect to backend from frontend
- Verify public URL is correct
- Check CORS is enabled (it is by default)
- Make sure devices are registered first

## Useful Commands

```bash
# View current environment
railway variables list

# Update a variable
railway variables set VARIABLE_NAME value

# Check deployment status
railway status

# Stop service
railway down

# Remove service
railway service delete
```

## Next Steps

After successful deployment:

1. Update React Native frontend with your Railway URL
2. Get Expo push token in the app
3. Register the device: `POST /register-device`
4. Send test notifications: `POST /send-notification`

Enjoy your push notifications! 🚀
