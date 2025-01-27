const { Telegraf, Markup } = require('telegraf')
const sqlite3 = require('sqlite3').verbose()
const axios = require('axios')

// Konfigurasi Hardcoded
const BOT_TOKEN = '7903398118:AAEwEzFnw1CZDqnPlwIEHfMI_dUU9qpsy1Q'
const ADMIN_ID = 5988451717 // Ganti dengan ID admin
const BOT_CREATOR = '@hiyaok'
const DB_FILE = 'bot_database.db'

// Inisialisasi Database
const db = new sqlite3.Database(DB_FILE)
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS group_messages (
    id INTEGER PRIMARY KEY,
    chat_id INTEGER,
    user_id INTEGER,
    message TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  )`)
  
  db.run(`CREATE TABLE IF NOT EXISTS sessions (
    user_id INTEGER PRIMARY KEY,
    context TEXT,
    last_interaction DATETIME DEFAULT CURRENT_TIMESTAMP
  )`)
})

// Inisialisasi Bot
const bot = new Telegraf(BOT_TOKEN)

// Sistem Memori Sesi
const userSessions = new Map()

// Kamus Bahasa Gaul
const slangDB = {
  'p': 'p',
  'bro': '🗿 Bro! Ada apa?',
  'mantap': '🔥 Mantul banget tuh!',
  'wkwk': '😂 Wkwkwk ngakak banget sih!',
  'crypto': '💸 Mau diskusi crypto ya? Gas!'
}

// Format Teks
const fmt = {
  bold: (t) => `*${t}*`,
  italic: (t) => `_${t}_`,
  code: (t) => `\`${t}\``
}

// Handler Pesan Grup
bot.on('message', (ctx) => {
  const { chat, from, text } = ctx.message
  
  // Simpan ke database
  db.run(
    'INSERT INTO group_messages (chat_id, user_id, message) VALUES (?, ?, ?)',
    [chat.id, from.id, text]
  )
  
  // Update session
  updateUserSession(from.id, text)
})

// Handler Pesan Private
bot.on('text', async (ctx) => {
  const userId = ctx.from.id
  const userInput = ctx.message.text
  let response = ''
  
  // Cek pertanyaan tentang bot
  if (/bot|pembuat|creator/i.test(userInput)) {
    response = `🤖 ${fmt.bold('Aku adalah CryptoBroBot!')}\nDibuat dengan ❤️ oleh ${BOT_CREATOR}`
  }
  // Cek crypto
  else if (/crypto|bitcoin|ethereum/i.test(userInput)) {
    response = await handleCryptoQuery(userInput)
  }
  // Coba cari di database
  else {
    response = await generateSmartResponse(userId, userInput)
  }
  
  // Tambahkan tombol feedback
  const keyboard = Markup.inlineKeyboard([
    Markup.button.callback('💌 Kasih Feedback', 'send_feedback')
  ])
  
  ctx.replyWithMarkdown(response, keyboard)
})

// Handler Feedback
bot.action('send_feedback', (ctx) => {
  ctx.answerCbQuery()
  ctx.reply('👍 Oke bang, feedback lu udah aku terusin ke admin ya!')
  
  // Kirim ke admin
  ctx.telegram.sendMessage(
    ADMIN_ID,
    `📣 Feedback dari @${ctx.from.username}:\n"${ctx.match.input}"`
  )
})

// Fungsi Khusus Crypto
async function handleCryptoQuery(query) {
  try {
    const coin = getCoinName(query)
    const price = await getCryptoPrice(coin)
    return `💰 ${fmt.bold(coin.toUpperCase())}\nHarga: ${fmt.code(`$${price}`)}\nSumber: CoinGecko`
  } catch {
    return '📉 Hmm, crypto itu kayaknya lagi error nih. Coba lagi nanti ya?'
  }
}

// Pencarian Harga Crypto
async function getCryptoPrice(coin) {
  const response = await axios.get(`https://api.coingecko.com/api/v3/simple/price?ids=${coin}&vs_currencies=usd`)
  return response.data[coin].usd
}

// Sistem Generasi Jawaban
async function generateSmartResponse(userId, input) {
  // Cek bahasa gaul
  const slangResponse = checkSlang(input)
  if (slangResponse) return slangResponse
  
  // Cari di database
  const similar = await findSimilarMessages(input)
  if (similar) return `🗣️ Ini info dari obrolan sebelumnya:\n${similar}`
  
  // Jawaban default
  return generateCasualResponse()
}

// Cek Kamus Gaul
function checkSlang(input) {
  const words = input.toLowerCase().split(' ')
  for (const word of words) {
    if (slangDB[word]) return slangDB[word]
  }
  return null
}

// Pencarian Pesan Serupa
function findSimilarMessages(query) {
  return new Promise((resolve, reject) => {
    db.get(
      'SELECT message FROM group_messages WHERE message LIKE ? ORDER BY timestamp DESC LIMIT 1',
      [`%${query}%`],
      (err, row) => resolve(row?.message || null)
    )
  })
}

// Update Sesi Pengguna
function updateUserSession(userId, message) {
  const session = userSessions.get(userId) || { history: [] }
  session.history.push(message)
  session.lastActive = Date.now()
  userSessions.set(userId, session)
}

// Generate Jawaban Santai
function generateCasualResponse() {
  const responses = [
    '🤔 Hmm... Jadi penasaran nih...',
    '🔥 Wah topik keren nih! Tapi gue lagi laper sih...',
    '📌 Btw, lu udah cek harga crypto hari ini?',
    '💡 Nemu meme keren nih kemarin! Mau liat?',
    '😴 Waduh, ngomongin ini jadi ngantuk deh...'
  ]
  return responses[Math.floor(Math.random() * responses.length)]
}

// Command Reset Sesi
bot.command('reset', (ctx) => {
  userSessions.delete(ctx.from.id)
  ctx.reply('🔄 Oke bang, obrolan kita mulai dari awal ya!')
})

// Jalankan Bot
bot.launch().then(() => {
  console.log('🚀 Bot berhasil dijalankan!')
})
