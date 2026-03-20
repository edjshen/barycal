const express = require('express');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const ical = require('ical-generator');
const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Serve calendar view for public links
app.get('/calendar/:shareId', async (req, res) => {
  res.sendFile(path.join(__dirname, '../public/calendar.html'));
});

const JWT_SECRET = process.env.JWT_SECRET || 'secret-key-change-me';

// Auth middleware
const auth = (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (e) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Auth routes
app.post('/api/auth/register', async (req, res) => {
  const { username, password, displayName } = req.body;
  try {
    const hashed = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { username, password: hashed, displayName: displayName || username }
    });
    const token = jwt.sign({ userId: user.id }, JWT_SECRET);
    res.json({ token, user: { id: user.id, username: user.username, displayName: user.displayName, shareId: user.shareId } });
  } catch (e) {
    res.status(400).json({ error: 'Username taken' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  const user = await prisma.user.findUnique({ where: { username } });
  if (!user || !await bcrypt.compare(password, user.password)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const token = jwt.sign({ userId: user.id }, JWT_SECRET);
  res.json({ token, user: { id: user.id, username: user.username, displayName: user.displayName, shareId: user.shareId } });
});

app.get('/api/auth/me', auth, async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.userId } });
  res.json({ id: user.id, username: user.username, displayName: user.displayName, shareId: user.shareId, isPublic: user.isPublic });
});

// Get public calendar by shareId (no auth needed)
app.get('/api/calendar/:shareId', async (req, res) => {
  const user = await prisma.user.findFirst({ 
    where: { shareId: req.params.shareId, isPublic: true },
    include: { events: { where: { isPublic: true }, orderBy: { startTime: 'asc' } } }
  });
  if (!user) return res.status(404).json({ error: 'Calendar not found' });
  res.json({ 
    username: user.username, 
    displayName: user.displayName,
    events: user.events.map(e => ({ id: e.id, title: e.title, description: e.description, location: e.location, startTime: e.startTime, endTime: e.endTime, isAllDay: e.isAllDay })) 
  });
});

// Get iCal feed
app.get('/api/calendar/:shareId.ics', async (req, res) => {
  const user = await prisma.user.findFirst({ 
    where: { shareId: req.params.shareId, isPublic: true },
    include: { events: { where: { isPublic: true } } }
  });
  if (!user) return res.status(404).send('Not found');
  
  const calendar = ical({ name: `${user.displayName || user.username}'s Calendar` });
  user.events.forEach(e => {
    calendar.createEvent({
      start: new Date(e.startTime),
      end: e.endTime ? new Date(e.endTime) : undefined,
      summary: e.title,
      description: e.description,
      location: e.location
    });
  });
  
  res.type('text/calendar').send(calendar.toString());
});

// Google Calendar link
app.get('/api/calendar/:shareId/google', async (req, res) => {
  const user = await prisma.user.findFirst({ where: { shareId: req.params.shareId, isPublic: true } });
  if (!user) return res.status(404).json({ error: 'Calendar not found' });
  
  const baseUrl = process.env.API_URL || `https://${req.headers.host}`;
  const icsUrl = `${baseUrl}/api/calendar/${user.shareId}.ics`;
  const googleUrl = `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(icsUrl)}`;
  res.redirect(googleUrl);
});

// Event routes
app.get('/api/events', auth, async (req, res) => {
  const events = await prisma.event.findMany({
    where: { userId: req.userId },
    orderBy: { startTime: 'asc' }
  });
  res.json(events);
});

app.post('/api/events', auth, async (req, res) => {
  const { title, description, location, startTime, endTime, isAllDay, isPublic } = req.body;
  const event = await prisma.event.create({
    data: { title, description, location, startTime: new Date(startTime), endTime: endTime ? new Date(endTime) : null, isAllDay: isAllDay || false, isPublic: isPublic !== false, userId: req.userId }
  });
  res.json(event);
});

app.put('/api/events/:id', auth, async (req, res) => {
  const event = await prisma.event.findFirst({ where: { id: req.params.id, userId: req.userId } });
  if (!event) return res.status(403).json({ error: 'Not authorized' });
  
  const updated = await prisma.event.update({
    where: { id: req.params.id },
    data: req.body
  });
  res.json(updated);
});

app.delete('/api/events/:id', auth, async (req, res) => {
  const event = await prisma.event.findFirst({ where: { id: req.params.id, userId: req.userId } });
  if (!event) return res.status(403).json({ error: 'Not authorized' });
  await prisma.event.delete({ where: { id: req.params.id } });
  res.json({ success: true });
});

// Update user settings
app.put('/api/settings', auth, async (req, res) => {
  const { displayName, isPublic } = req.body;
  const user = await prisma.user.update({
    where: { id: req.userId },
    data: { displayName, isPublic }
  });
  res.json({ shareId: user.shareId, displayName: user.displayName, isPublic: user.isPublic });
});

// Generate new shareId
app.post('/api/settings/regenerate-shareId', auth, async (req, res) => {
  const newShareId = uuidv4();
  const user = await prisma.user.update({
    where: { id: req.userId },
    data: { shareId: newShareId }
  });
  res.json({ shareId: user.shareId });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`📅 Social Cal running on ${PORT}`));
