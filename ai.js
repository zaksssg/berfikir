const { Telegraf, Markup } = require('telegraf')
const sqlite3 = require('sqlite3').verbose()
const axios = require('axios')

// ========== KONFIGURASI ==========
const BOT_TOKEN = '7903398118:AAE0MXpz-gj3h3OvMozmg6oRxw-0BWeBmVY'
const ADMIN_ID = 5988451717 // Ganti dengan ID admin
const CREATOR = '@hiyaok'
const DB_FILE = 'smart_bot.db'

// ========== INISIALISASI ==========
const db = new sqlite3.Database(DB_FILE)
const bot = new Telegraf(BOT_TOKEN)

// ========== SETUP DATABASE ==========
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS group_data (
    id INTEGER PRIMARY KEY,
    chat_id INTEGER,
    message TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  )`)

  db.run(`CREATE TABLE IF NOT EXISTS sessions (
    user_id INTEGER PRIMARY KEY,
    context TEXT,
    history TEXT,
    last_active DATETIME
  )`)
})

// ========== SISTEM KECERDASAN ==========
class Brain {
  constructor() {
    this.cryptoKeywords = new Set([
      'bitcoin', 'crypto', 'blockchain', 'eth',
      'nft', 'web3', 'altcoin', 'defi', 'token'
    ])
  }

  async processInput(text, userId) {
    const context = await this.getContext(userId)
    const isCrypto = this.detectCrypto(text)
    
    if(isCrypto) {
      return this.handleCrypto(text, context)
    }
    return this.handleGeneral(text, context)
  }

  async getContext(userId) {
    return new Promise((resolve) => {
      db.get(
        'SELECT context, history FROM sessions WHERE user_id = ?',
        [userId],
        (err, row) => resolve(row || { history: [] })
      )
    })
  }

  detectCrypto(text) {
    const words = text.toLowerCase().split(/[\s\W]+/)
    return words.some(word => this.cryptoKeywords.has(word))
  }

  async handleCrypto(text, context) {
    const coin = this.extractCoin(text)
    if(coin) {
      try {
        const data = await this.getCryptoData(coin)
        return this.formatCryptoResponse(data)
      } catch {
        return this.createResponse(
          '⚠️ Lagi ada masalah nih sama data cryptonya, coba lagi ya?',
          'confused'
        )
      }
    }
    return this.createResponse(
      '💡 Mau bahas crypto apa nih? Bisa tanya harga, teknologi, atau prediksi!',
      'crypto'
    )
  }

  async handleGeneral(text, context) {
    // Cari di database grup
    const groupAnswer = await this.findGroupAnswer(text)
    if(groupAnswer) {
      return this.createResponse(
        `🗣️ Dari obrolan grup:\n"${groupAnswer}"`,
        'group'
      )
    }

    // Cari di sumber eksternal
    const webInfo = await this.getWebInfo(text)
    if(webInfo) {
      return this.createResponse(
        `${webInfo.text}\n\n🔗 Sumber: ${webInfo.source}`,
        'web'
      )
    }

    // Jawaban default
    return this.createResponse(
      this.generateCasualResponse(),
      'casual'
    )
  }

  async getCryptoData(coin) {
    const response = await axios.get(
      `https://api.coingecko.com/api/v3/coins/${coin}`
    )
    return {
      name: response.data.name,
      symbol: response.data.symbol.toUpperCase(),
      price: response.data.market_data.current_price.usd,
      source: 'https://www.coingecko.com'
    }
  }

  formatCryptoResponse(data) {
    return {
      text: `💰 *${data.name} (${data.symbol})*\n` +
            `🔼 Harga Terkini: $${data.price}\n` +
            `🌐 Sumber: ${data.source}`,
      source: data.source
    }
  }

  async findGroupAnswer(query) {
    return new Promise((resolve) => {
      db.get(
        'SELECT message FROM group_data WHERE message LIKE ? ORDER BY timestamp DESC LIMIT 1',
        [`%${query}%`],
        (err, row) => resolve(row?.message)
      )
    })
  }

  async getWebInfo(query) {
    try {
      const response = await axios.get(
        `https://id.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(query)}&limit=1&format=json`
      )
      if(response.data[2][0]) {
        return {
          text: `📚 ${response.data[2][0].substring(0, 300)}...`,
          source: response.data[3][0]
        }
      }
    } catch {
      return null
    }
  }

  generateCasualResponse() {
    const responses = [
      '🤔 Hmm... Jadi penasaran nih... Bisa dijelasin lebih detail?',
      '🔥 Wah topik keren! Tapi gue lebih jago bahas crypto deh~',
      '😴 Waduh, bahas ini jadi ngantuk... Ada yang mau nanya crypto?',
      '💡 Btw, lu udah cek harga Bitcoin hari ini? Seru loh pergerakannya!'
    ]
    return responses[Math.floor(Math.random() * responses.length)]
  }

  createResponse(text, mood) {
    const emojis = {
      crypto: ['💰', '🔗', '📈'],
      group: ['🗣️', '👥', '💬'],
      web: ['🌐', '📚', '🔍'],
      casual: ['😎', '🤙', '💡'],
      confused: ['⚠️', '❓', '🤔']
    }
    return {
      text: `${emojis[mood][0]} ${text}`,
      source: null
    }
  }
}

// ========== INIT BRAIN ==========
const AI = new Brain()

// ========== HANDLER PESAN ==========
// Simpan pesan grup
bot.on('message', (ctx) => {
  if(ctx.chat.type === 'group' || ctx.chat.type === 'supergroup') {
    db.run(
      'INSERT INTO group_data (chat_id, message) VALUES (?, ?)',
      [ctx.chat.id, ctx.message.text]
    )
  }
})

// Handle pesan private
bot.on('text', async (ctx) => {
  const userId = ctx.from.id
  const text = ctx.message.text

  // Update session
  db.run(
    'INSERT OR REPLACE INTO sessions (user_id, history, last_active) VALUES (?, ?, ?)',
    [userId, text, new Date().toISOString()]
  )

  // Generate response
  const response = await AI.processInput(text, userId)
  
  // Kirim pesan
  ctx.replyWithMarkdown(
    response.text,
    Markup.inlineKeyboard([
      Markup.button.callback('💬 Feedback', 'feedback')
    ])
  )
})

// ========== FITUR TAMBAHAN ==========
// Handler feedback
bot.action('feedback', (ctx) => {
  ctx.answerCbQuery()
  ctx.reply('📩 Makasih masukannya! Udah gue terusin ke bos besar nih~')
  
  ctx.telegram.sendMessage(
    ADMIN_ID,
    `📢 Feedback dari @${ctx.from.username}:\n"${ctx.message.text}"`
  )
})

// Handler info bot
bot.hears(/bot|pembuat|creator/i, (ctx) => {
  ctx.replyWithMarkdown(
    `🤖 *ID Card*\n` +
    `Nama: CryptoMasterBot\n` +
    `Pencipta: ${CREATOR}\n` +
    `Spesialisasi: Crypto & Ngobrol Santai\n` +
    `Motto: "Ga perlu serius mulu, crypto bisa fun kok!"`
  )
})

// Command reset
bot.command('reset', (ctx) => {
  db.run('DELETE FROM sessions WHERE user_id = ?', [ctx.from.id])
  ctx.replyWithMarkdown(
    '🔄 *Sessi direset!* Yuk mulai obrolan baru~',
    Markup.removeKeyboard()
  )
})

// ========== START BOT ==========
bot.launch().then(() => {
  console.log('🤖 Bot berjalan dengan kecerdasan buatan!')
}).catch(err => {
  console.error('❌ Gagal memulai:', err)
})
