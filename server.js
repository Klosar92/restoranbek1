/**********************************************************************
 *  server.js  –  REST API za projekte restorani
 *********************************************************************/

/* ------------------------------------------------------------------ *
 * 1.  UČITAJ ENV PROMENLJIVE
 * ------------------------------------------------------------------ */

// VARIJANTA A – koristi .env fajl (preporučeno za produkciju)
require('dotenv').config();  // .env mora biti u istom folderu

// Ako .env NE postoji ili zaboraviš MONGO_URI, fallback na varijantu B:
const FALLBACK_URI =
  'mongodb+srv://Klosar92:Desibrate.111@restorani.xwrdoti.mongodb.net/restorani?retryWrites=true&w=majority';

/* ------------------------------------------------------------------ *
 * 2.  BIBLIOTEKE I POVEZIVANJE NA BAZU
 * ------------------------------------------------------------------ */
const express  = require('express');
const mongoose = require('mongoose');
const cors     = require('cors');
const compression = require('compression');
console.log('SERVER vidi URI:', process.env.MONGO_URI);

// Pokušaj prvo sa process.env.MONGO_URI, ako je undefined – uzmi FALLBACK_URI
const mongoURI = process.env.MONGO_URI
                || process.env.MONGODB_URI
                || FALLBACK_URI;

mongoose
  .connect(mongoURI)
  .then(() =>
    console.log('✅ Povezan na bazu:', mongoose.connection.name)
  )
  .catch(err =>
    console.error('❌ Greška pri povezivanju:', err.message)
  );

/* ------------------------------------------------------------------ *
 * 3.  DEFINICIJE MODELA
 * ------------------------------------------------------------------ */
const Restoran = require('./models/restoran'); // tvoj postojeći model

const User = mongoose.model(
  'User',
  new mongoose.Schema({
    email:    { type: String, required: true, unique: true },
    password: { type: String, required: true },
    phone:    { type: String, required: true }
  })
);

const Review = mongoose.model(
  'Review',
  new mongoose.Schema({
    restoranIme: String,
    korisnik:    String,
    ocena:       Number,
    komentar:    String
  })
);

/* ------------------------------------------------------------------ *
 * 4.  EXPRESS APLIKACIJA I MIDDLEWARE
 * ------------------------------------------------------------------ */
const app  = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(compression());

/* ------------------------------------------------------------------ *
 * 5.  AUTH RUTE
 * ------------------------------------------------------------------ */
app.post('/api/register', async (req, res) => {
  try {
    const { email, password, phone } = req.body;
    if (await User.findOne({ email }))
      return res.status(400).json({ message: 'Email već postoji.' });

    await new User({ email, password, phone }).save();
    res.status(201).json({ message: 'Registracija uspešna.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const ok = await User.findOne({ email, password });
    if (!ok) return res.status(400).json({ message: 'Neispravni podaci.' });
    res.json({ message: 'Prijava uspešna.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ------------------------------------------------------------------ *
 * 6.  RESTORANI RUTE
 * ------------------------------------------------------------------ */
app.get('/api/restorani', async (_req, res) => {
  try {
    const restorani = await Restoran.find();
    res.json(restorani);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/restorani', async (req, res) => {
  try {
    await new Restoran(req.body).save();
    res.status(201).json({ message: 'Restoran dodat.' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/restorani/bbox?south=..&west=..&north=..&east=..&limit=300
app.get('/api/restorani/bbox', async (req, res) => {
  const { south, west, north, east, limit = 300 } = req.query;
  if (![south, west, north, east].every(Number))
    return res.status(400).json({ error: 'Nevažeći koordinatni parametri.' });

  const box = [
    [parseFloat(west), parseFloat(south)], // donji-levo  [lon, lat]
    [parseFloat(east), parseFloat(north)]  // gornji-desno
  ];

  try {
    const docs = await Restoran.find({
      loc: { $geoWithin: { $box: box } }
    }).limit(parseInt(limit, 10));

    res.json(docs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
``


/* ------------------------------------------------------------------ *
 * 7.  REVIEWS RUTE
 * ------------------------------------------------------------------ */
app.post('/api/review', async (req, res) => {
  try {
    await new Review(req.body).save();
    res.status(201).json({ message: 'Ocena sačuvana.' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/reviews/:restoranIme', async (req, res) => {
  try {
    const reviews = await Review.find({ restoranIme: req.params.restoranIme });
    res.json(reviews);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ------------------------------------------------------------------ *
 * 8.  TEST RUTA & START
 * ------------------------------------------------------------------ */
app.get("/", async (req, res) => {
  try {
    const restorani = await Restoran.find();
    res.json(restorani);
  } catch (err) {
    res.status(500).json({ error: "Greška prilikom dohvaćanja restorana" });
  }
});


app.listen(PORT, () =>
  console.log(`🚀 Server sluša na http://localhost:${PORT}`)
);
