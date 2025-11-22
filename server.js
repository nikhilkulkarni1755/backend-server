const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { Expo } = require('expo-server-sdk');

const app = express();

// API Key for securing endpoints
const API_KEY = process.env.NOTIFICATION_API_KEY || 'dev-api-key-change-in-production';

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(cors());

// Middleware to verify API key for notification endpoints
const verifyApiKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];

  if (!apiKey) {
    return res.status(401).json({ error: 'Missing X-API-Key header' });
  }

  if (apiKey !== API_KEY) {
    console.warn(`❌ Unauthorized request from ${req.ip}`);
    return res.status(403).json({ error: 'Invalid API key' });
  }

  next();
};

// Initialize Expo SDK
const expo = new Expo({
  accessToken: process.env.EXPO_ACCESS_TOKEN,
});

// Store for device tokens (in production, use a database)
const deviceTokens = new Set();

// Store for user device tokens (userId -> Set of tokens)
const userDeviceTokens = new Map();

// Register device for notifications
app.post('/register-device', (req, res) => {
  const { token, userId } = req.body;

  if (!token) {
    return res.status(400).json({ error: 'Token is required' });
  }

  deviceTokens.add(token);

  // Register user device token if userId provided
  if (userId) {
    if (!userDeviceTokens.has(userId)) {
      userDeviceTokens.set(userId, new Set());
    }
    userDeviceTokens.get(userId).add(token);
    console.log(`Device registered for user ${userId}: ${token}`);
  } else {
    console.log(`Device registered (anonymous): ${token}`);
  }

  console.log(`Total devices: ${deviceTokens.size}`);

  res.json({
    success: true,
    message: 'Device registered successfully',
    totalDevices: deviceTokens.size,
    userId: userId || 'anonymous',
  });
});

// Send notification endpoint - accepts flexible input
app.post('/send-notification', verifyApiKey, async (req, res) => {
  try {
    const { color, message, title, text } = req.body;

    // Build notification body from any provided field
    let notificationBody = message || text || color;

    // If no message provided, use first non-title, non-color field
    if (!notificationBody) {
      const fields = Object.entries(req.body).filter(
        ([key, val]) => key !== 'title' && typeof val === 'string'
      );
      if (fields.length > 0) {
        notificationBody = fields[0][1];
      } else {
        notificationBody = 'Event triggered';
      }
    }

    let notificationTitle = title || 'Notification';

    console.log(`📬 Sending notification: "${notificationTitle}" - "${notificationBody}"`);
    console.log(`👥 Devices to notify: ${deviceTokens.size}`);

    if (deviceTokens.size === 0) {
      return res.json({
        success: true,
        message: 'No devices registered. Notification queued.',
        devicesNotified: 0,
      });
    }

    // Prepare messages for all devices
    const messages = [];
    for (const token of deviceTokens) {
      if (!Expo.isExpoPushToken(token)) {
        console.warn(`Invalid token: ${token}`);
        deviceTokens.delete(token);
        continue;
      }

      messages.push({
        to: token,
        sound: 'default',
        title: notificationTitle,
        body: notificationBody,
        data: {
          color,
          message,
          timestamp: new Date().toISOString(),
        },
      });
    }

    // Send notifications in chunks
    const chunks = expo.chunkPushNotifications(messages);
    const responses = [];

    for (const chunk of chunks) {
      try {
        const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
        responses.push(...ticketChunk);
        console.log(`✅ Sent chunk with ${chunk.length} notifications`);
      } catch (error) {
        console.error('Error sending chunk:', error);
      }
    }

    // Check for errors in responses
    let successCount = 0;
    let errorCount = 0;

    for (const response of responses) {
      if (response.status === 'ok') {
        successCount++;
      } else {
        errorCount++;
        console.error(`Notification error: ${response.message}`);
      }
    }

    res.json({
      success: true,
      message: 'Notifications sent',
      devicesNotified: successCount,
      errors: errorCount,
      notification: {
        title: notificationTitle,
        body: notificationBody,
      },
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Send personalized notification to specific user(s)
app.post('/send-personalized-notification', verifyApiKey, async (req, res) => {
  try {
    const { userId, username, isPremium, message } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    // Get device tokens for this user
    const userTokens = userDeviceTokens.get(userId);

    if (!userTokens || userTokens.size === 0) {
      return res.json({
        success: true,
        message: 'No devices registered for this user. Notification queued.',
        devicesNotified: 0,
        userId,
      });
    }

    // Build personalized message
    let notificationTitle = isPremium ? '⭐ Premium Message' : 'Hey there!';
    let notificationBody =
      message || `Hey ${username}, thanks for clicking!`;

    console.log(
      `💌 Sending personalized notification to ${userId}: "${notificationTitle}" - "${notificationBody}"`
    );
    console.log(`📱 Devices for user ${userId}: ${userTokens.size}`);

    // Prepare messages for user's devices
    const messages = [];
    for (const token of userTokens) {
      if (!Expo.isExpoPushToken(token)) {
        console.warn(`Invalid token for user ${userId}: ${token}`);
        userTokens.delete(token);
        deviceTokens.delete(token);
        continue;
      }

      messages.push({
        to: token,
        sound: 'default',
        title: notificationTitle,
        body: notificationBody,
        data: {
          userId,
          username,
          isPremium,
          type: 'personalized',
          timestamp: new Date().toISOString(),
        },
      });
    }

    if (messages.length === 0) {
      return res.json({
        success: true,
        message: 'No valid devices for this user.',
        devicesNotified: 0,
        userId,
      });
    }

    // Send notifications in chunks
    const chunks = expo.chunkPushNotifications(messages);
    const responses = [];

    for (const chunk of chunks) {
      try {
        const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
        responses.push(...ticketChunk);
        console.log(`✅ Sent chunk with ${chunk.length} personalized notifications`);
      } catch (error) {
        console.error('Error sending chunk:', error);
      }
    }

    // Check for errors in responses
    let successCount = 0;
    let errorCount = 0;

    for (const response of responses) {
      if (response.status === 'ok') {
        successCount++;
      } else {
        errorCount++;
        console.error(`Notification error: ${response.message}`);
      }
    }

    res.json({
      success: true,
      message: 'Personalized notifications sent',
      devicesNotified: successCount,
      errors: errorCount,
      userId,
      username,
      notification: {
        title: notificationTitle,
        body: notificationBody,
      },
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Send app-wide notification to all users
app.post('/send-appwide-notification', verifyApiKey, async (req, res) => {
  try {
    const { title, message, text } = req.body;

    let notificationBody = message || text || 'Important update!';
    let notificationTitle = title || '📢 Announcement';

    console.log(
      `📣 Sending app-wide notification: "${notificationTitle}" - "${notificationBody}"`
    );
    console.log(`👥 Total devices: ${deviceTokens.size}`);

    if (deviceTokens.size === 0) {
      return res.json({
        success: true,
        message: 'No devices registered. Notification queued.',
        devicesNotified: 0,
      });
    }

    // Prepare messages for all devices
    const messages = [];
    for (const token of deviceTokens) {
      if (!Expo.isExpoPushToken(token)) {
        console.warn(`Invalid token: ${token}`);
        deviceTokens.delete(token);
        continue;
      }

      messages.push({
        to: token,
        sound: 'default',
        title: notificationTitle,
        body: notificationBody,
        data: {
          type: 'appwide',
          timestamp: new Date().toISOString(),
        },
      });
    }

    // Send notifications in chunks
    const chunks = expo.chunkPushNotifications(messages);
    const responses = [];

    for (const chunk of chunks) {
      try {
        const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
        responses.push(...ticketChunk);
        console.log(`✅ Sent chunk with ${chunk.length} app-wide notifications`);
      } catch (error) {
        console.error('Error sending chunk:', error);
      }
    }

    // Check for errors in responses
    let successCount = 0;
    let errorCount = 0;

    for (const response of responses) {
      if (response.status === 'ok') {
        successCount++;
      } else {
        errorCount++;
        console.error(`Notification error: ${response.message}`);
      }
    }

    res.json({
      success: true,
      message: 'App-wide notifications sent',
      devicesNotified: successCount,
      errors: errorCount,
      notification: {
        title: notificationTitle,
        body: notificationBody,
      },
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    registeredDevices: deviceTokens.size,
  });
});

// Get registered devices count
app.get('/devices', (req, res) => {
  res.json({
    count: deviceTokens.size,
    devices: Array.from(deviceTokens),
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔑 Expo token configured: ${!!process.env.EXPO_ACCESS_TOKEN}`);
});
