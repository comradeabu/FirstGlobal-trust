const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

// MongoDB connection
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// User schema
const User = mongoose.model('User', {
  email: String,
  password: String,
  balance: Number,
  history: Array,
});

// Support message schema
const SupportMessage = mongoose.model('SupportMessage', {
  email: String,
  message: String,
  date: { type: Date, default: Date.now },
});

// Routes
app.post('/register', async (req, res) => {
  const { email, password } = req.body;
  const user = new User({ email, password, balance: 0, history: [] });
  await user.save();
  res.send({ message: 'Account created', user });
});

app.post('/deposit', async (req, res) => {
  const { email, amount } = req.body;
  const user = await User.findOne({ email });
  if (!user) return res.status(404).send('User not found');
  user.balance += amount;
  user.history.push({ type: 'deposit', amount });
  await user.save();
  res.send({ balance: user.balance });
});

app.post('/withdraw', async (req, res) => {
  const { email, amount } = req.body;
  const user = await User.findOne({ email });
  if (!user || user.balance < amount) return res.status(400).send('Insufficient funds or user not found');
  user.balance -= amount;
  user.history.push({ type: 'withdraw', amount });
  await user.save();
  res.send({ balance: user.balance });
});

app.post('/transfer', async (req, res) => {
  const { fromEmail, toEmail, amount } = req.body;
  const sender = await User.findOne({ email: fromEmail });
  const receiver = await User.findOne({ email: toEmail });
  if (!sender || !receiver || sender.balance < amount) return res.status(400).send('Transfer failed');
  sender.balance -= amount;
  receiver.balance += amount;
  sender.history.push({ type: 'transfer_out', amount, to: toEmail });
  receiver.history.push({ type: 'transfer_in', amount, from: fromEmail });
  await sender.save();
  await receiver.save();
  res.send({ message: 'Transfer successful' });
});

app.get('/balance/:email', async (req, res) => {
  const user = await User.findOne({ email: req.params.email });
  if (!user) return res.status(404).send('User not found');
  res.send({ balance: user.balance });
});

app.get('/history/:email', async (req, res) => {
  const user = await User.findOne({ email: req.params.email });
  if (!user) return res.status(404).send('User not found');
  res.send({ history: user.history });
});

app.post('/support', async (req, res) => {
  const { email, message } = req.body;
  const msg = new SupportMessage({ email, message });
  await msg.save();
  res.send({ message: 'Support request received' });
});

app.get('/support-messages', async (req, res) => {
  const messages = await SupportMessage.find();
  res.send(messages);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
