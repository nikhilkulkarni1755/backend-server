# Push Notification Backend

A Node.js/Express server for sending push notifications via Expo.

## Setup

### 1. Get Expo Access Token

Visit [Expo's Personal Access Token](https://expo.dev/settings/access-tokens) page to create a token.

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment

Copy `.env.example` to `.env` and add your token:

```bash
cp .env.example .env
```

Edit `.env`:
```
EXPO_ACCESS_TOKEN=your_token_here
PORT=3000
```

### 4. Local Development

```bash
npm install -g nodemon  # Install nodemon globally
npm run dev
```

Server will start on `http://localhost:3000`

## API Endpoints

### Register Device for Notifications

**POST** `/register-device`

Register an Expo push token to receive notifications.

```bash
curl -X POST http://localhost:3000/register-device \
  -H "Content-Type: application/json" \
  -d '{"token": "ExponentPushToken[...]"}'
```

Response:
```json
{
  "success": true,
  "message": "Device registered successfully",
  "totalDevices": 1
}
```

### Send Notification

**POST** `/send-notification`

Send a notification to all registered devices. Accepts flexible input.

#### With color (for React Native app):
```bash
curl -X POST http://localhost:3000/send-notification \
  -H "Content-Type: application/json" \
  -d '{"color": "Red"}'
```

#### With custom message:
```bash
curl -X POST http://localhost:3000/send-notification \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Custom Title",
    "message": "This is a custom message"
  }'
```

#### With any arbitrary text:
```bash
curl -X POST http://localhost:3000/send-notification \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello from curl!"}'
```

#### Or with any field name:
```bash
curl -X POST http://localhost:3000/send-notification \
  -H "Content-Type: application/json" \
  -d '{"text": "Anything goes!"}'
```

Response:
```json
{
  "success": true,
  "message": "Notifications sent",
  "devicesNotified": 1,
  "errors": 0,
  "notification": {
    "title": "Notification",
    "body": "Hello from curl!"
  }
}
```

### Health Check

**GET** `/health`

```bash
curl http://localhost:3000/health
```

### Get Registered Devices

**GET** `/devices`

```bash
curl http://localhost:3000/devices
```

## Deploy to Railway

### 1. Check Railway Status

```bash
railway status
```

### 2. Link to Railway Project

If not already linked:
```bash
cd /Users/nikhilkulkarni/AppVibeCoding/Components/backend
railway link
```

### 3. Deploy

```bash
railway up
```

Railway will:
- Build your project
- Detect Node.js from package.json
- Use the Procfile to start the server
- Assign a public URL

### 4. Add Environment Variables in Railway

1. Go to Railway dashboard
2. Open your project
3. Select the "backend" service
4. Go to "Variables"
5. Add `EXPO_ACCESS_TOKEN` with your Expo token
6. Redeploy (or Railway may auto-redeploy)

### 5. Get Your Public URL

In Railway dashboard, find the "Public URL" for your backend service. It will look like:
```
https://your-project-name-production.up.railway.app
```

## Update Frontend with Backend URL

Once deployed to Railway, update the React Native app to use your backend URL.

In `/react-native/NotificationDemo/app/(tabs)/index.tsx`, change:
```typescript
const response = await fetch('http://localhost:3000/send-notification', {
```

To:
```typescript
const response = await fetch('https://your-project-name-production.up.railway.app/send-notification', {
```

## Testing

### Local Testing

```bash
# Start server
npm run dev

# In another terminal, test health
curl http://localhost:3000/health

# Test with color
curl -X POST http://localhost:3000/send-notification \
  -H "Content-Type: application/json" \
  -d '{"color": "Blue"}'

# Test with custom message
curl -X POST http://localhost:3000/send-notification \
  -H "Content-Type: application/json" \
  -d '{"message": "Test message"}'

# Test with anything
curl -X POST http://localhost:3000/send-notification \
  -H "Content-Type: application/json" \
  -d '{"randomField": "Random value"}'
```

### Remote Testing (after Railway deployment)

```bash
# Get your Railway URL from the dashboard
BACKEND_URL="https://your-project-name-production.up.railway.app"

# Test health
curl $BACKEND_URL/health

# Test send notification
curl -X POST $BACKEND_URL/send-notification \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello from Railway!"}'
```

## Frontend Integration

The React Native Expo app needs to:

1. **Get Expo push token** on first load
2. **Register device** by sending token to `/register-device`
3. **Send notification events** to `/send-notification`

Example frontend code:

```typescript
import * as Notifications from 'expo-notifications';

// Get token
const token = await Notifications.getExpoPushTokenAsync();
await fetch('https://your-railway-url.com/register-device', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ token: token.data }),
});

// Send notification
await fetch('https://your-railway-url.com/send-notification', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ color: 'Red' }),
});
```

## Notes

- Devices are stored in-memory. On server restart, registered devices are cleared.
- For production, use a database to persist device tokens.
- Expo tokens expire and need to be refreshed periodically.
- Invalid tokens are automatically removed when notification sending fails.
