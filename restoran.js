const mongoose = require('mongoose');

const RestoranSchema = new mongoose.Schema(
  {
    ime:       String,
    adresa:    String,
    lat:       Number,
    lon:       Number,
     loc: {
          type:        { type: String, enum: ['Point'], default: 'Point', required: true },
          coordinates: { type: [Number],               required: true }
        },
    kategorija:String,
    vrsta:     String,
    region:    String
  },
  { collection: 'restorans' }   // <── KLJUČNI RED
);

RestoranSchema.index({ loc: '2dsphere' });
module.exports = mongoose.model('Restoran', RestoranSchema);

