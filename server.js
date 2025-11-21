const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { Expo } = require('expo-server-sdk');

const app = express();

// Middleware
app.use(express.json());
app.use(cors());

// Initialize Expo SDK
const expo = new Expo({
  accessToken: process.env.EXPO_ACCESS_TOKEN,
});

// Store for device tokens (in production, use a database)
const deviceTokens = new Set();

// Register device for notifications
app.post('/register-device', (req, res) => {
  const { token } = req.body;

  if (!token) {
    return res.status(400).json({ error: 'Token is required' });
  }

  deviceTokens.add(token);
  console.log(`Device registered: ${token}`);
  console.log(`Total devices: ${deviceTokens.size}`);

  res.json({
    success: true,
    message: 'Device registered successfully',
    totalDevices: deviceTokens.size,
  });
});

// Send notification endpoint - accepts flexible input
app.post('/send-notification', async (req, res) => {
  try {
    const { color, message, title, text } = req.body;

    // Use provided message/text, or construct from color
    let notificationTitle = title || 'Notification';
    let notificationBody = message || text || color || 'Event triggered';

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
