// Génère un SESSION_SECRET (32 bytes en base64) pour .env
const crypto = require('crypto')
console.log(crypto.randomBytes(32).toString('base64'))
