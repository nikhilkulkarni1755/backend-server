# Quick Start Guide

## Local Development (5 minutes)

### 1. Install & Setup
```bash
cd /Users/nikhilkulkarni/AppVibeCoding/Components/backend
npm install
cp .env.example .env
# Edit .env and add your EXPO_ACCESS_TOKEN
```

### 2. Run Server
```bash
npm run dev
```

Server will start at `http://localhost:3000`

### 3. Test Endpoints

In another terminal:

```bash
# Health check
curl http://localhost:3000/health

# Send notification with color
curl -X POST http://localhost:3000/send-notification \
  -H "Content-Type: application/json" \
  -d '{"color": "Red"}'

# Send notification with custom message
curl -X POST http://localhost:3000/send-notification \
  -H "Content-Type: application/json" \
  -d '{"message": "Any text you want!"}'

# Register a test device (use real Expo token from app)
curl -X POST http://localhost:3000/register-device \
  -H "Content-Type: application/json" \
  -d '{"token": "ExponentPushToken[...]"}'
```

## Deploy to Railway (10 minutes)

### 1. Prepare
```bash
cd /Users/nikhilkulkarni/AppVibeCoding/Components/backend
git add .
git commit -m "Push notification backend"
```

### 2. Link & Deploy
```bash
railway link    # Select/create project
railway variables set EXPO_ACCESS_TOKEN your_token_here
railway up
```

### 3. Get URL
```bash
# From logs, you'll see something like:
# https://notification-backend-production.up.railway.app
```

### 4. Test Remote
```bash
BACKEND_URL="https://your-railway-url.up.railway.app"
curl $BACKEND_URL/health
```

## Update Frontend

Edit `/react-native/NotificationDemo/app/(tabs)/index.tsx`:

Change line 13 from:
```typescript
const response = await fetch('http://localhost:3000/send-notification', {
```

To your Railway URL:
```typescript
const response = await fetch('https://your-railway-url.up.railway.app/send-notification', {
```

Also update the `/register-device` call if you add device registration.

## API Reference

### POST /send-notification
Sends notification to all registered devices.

Accepts any of these in the request body:
- `color`: "Red" or "Blue" (used as notification body)
- `message`: Custom notification message
- `text`: Alternative to message
- `title`: Custom notification title

**Examples:**
```bash
# With color
curl -X POST ... -d '{"color": "Blue"}'

# With message
curl -X POST ... -d '{"message": "Hello World"}'

# With both title and message
curl -X POST ... -d '{"title": "Alert", "message": "Something happened"}'

# With literally anything
curl -X POST ... -d '{"anything": "goes here"}'
```

### POST /register-device
Registers an Expo push token.

```bash
curl -X POST ... -d '{"token": "ExponentPushToken[...]"}'
```

### GET /health
Health check endpoint.

```bash
curl http://localhost:3000/health
```

Returns:
```json
{
  "status": "ok",
  "registeredDevices": 0
}
```

### GET /devices
Lists all registered device tokens.

```bash
curl http://localhost:3000/devices
```

## Environment Variables

Required:
- `EXPO_ACCESS_TOKEN`: Your Expo access token (get from https://expo.dev/settings/access-tokens)

Optional:
- `PORT`: Server port (default: 3000)
- `NODE_ENV`: Environment (default: development)

## Troubleshooting

**"EXPO_ACCESS_TOKEN is not configured"**
- Add `EXPO_ACCESS_TOKEN` to `.env` file locally
- Add it to Railway variables for production

**"No devices registered"**
- This is normal if no app has registered yet
- Notification will still return success
- Once app registers, notifications will be sent

**Server won't start**
- Check port 3000 is available
- Run `npm install` to ensure all deps are there
- Check logs for errors

## Next Steps

1. ✅ Backend is ready
2. Next: Update React Native app frontend with your backend URL
3. Then: Get Expo push token in the app
4. Finally: Test sending notifications
