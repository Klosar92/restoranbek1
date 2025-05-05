/**
 * seed_osm.js
 * -----------  Ubacuje do 100 restorana iz OpenStreetMap‑a
 * za celu Srbiju (area wikidata Q403).
 *
 * 1)  npm install node-fetch@2           (prvi put)
 * 2)  MONGO_URI=... node seed_osm.js     ili .env fajl
 */

require('dotenv').config();               // učitaj .env ako postoji
const fetch    = require('node-fetch');   // v2 stil (require)
const mongoose = require('mongoose');
const Restoran = require('./models/restoran');

const MONGO_URI = process.env.MONGO_URI ||
  'mongodb+srv://Klosar92:Desibrate.111@restorani.xwrdoti.mongodb.net/restorani?retryWrites=true&w=majority';

const ENDPOINTS = [
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.osm.ch/api/interpreter',
  'https://overpass-api.de/api/interpreter'
];

const QUERY = `
  [out:json][timeout:60];
  area["wikidata"="Q403"]->.srbija;      /* Republika Srbija */
  (
    nwr["amenity"="restaurant"](area.srbija);
  );
  out center tags;
`;

(async () => {
  let data = null;
  for (const ep of ENDPOINTS) {
    try {
      console.log('⏳ Pokušavam:', ep);
      const r = await fetch(ep + '?data=' + encodeURIComponent(QUERY));
      const j = await r.json();
      if (j.elements && j.elements.length) {
        data = j;
        console.log('✅ Endpoint radi – elemenata:', j.elements.length);
        break;
      }
    } catch (e) {
      console.warn('⚠️  Neuspelo na', ep, e.message);
    }
  }
  if (!data) {
    console.error('❌ Ni jedan Overpass endpoint ne vraća podatke.');
    process.exit(1);
  }

  /* pripremi dokumente */
  const cats = ['jeftin','srednji','skup'];
  const docs = [];
  const seen = new Set();
  const lat = e => e.lat ?? e.center?.lat;
  const lon = e => e.lon ?? e.center?.lon;

  for (const e of data.elements) {
    if (!e.tags?.name || lat(e)==null || lon(e)==null) continue;
    const key = e.tags.name + lat(e).toFixed(5) + lon(e).toFixed(5);
    if (seen.has(key)) continue;
    seen.add(key);

    docs.push({
      ime: e.tags.name,
      adresa:
        (e.tags['addr:street'] || '') +
        (e.tags['addr:housenumber'] ? ' ' + e.tags['addr:housenumber'] : ''),
      lat: lat(e),
      lon: lon(e),
      kategorija: cats[Math.floor(Math.random()*cats.length)],
      vrsta: (e.tags.cuisine || 'ostalo').split(';')[0],
      region: e.tags['addr:city'] || e.tags['addr:municipality'] || 'nepoznato'
    });
    if (docs.length >= 100) break;
  }

  console.log('🔢 Pripremljeno dokumenata:', docs.length);

  await mongoose.connect(MONGO_URI);
  await Restoran.insertMany(docs);
  console.log('✅ Ubaceno', docs.length, 'restorana u kolekciju:', Restoran.collection.name);
  mongoose.disconnect();
})();