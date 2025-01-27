const { Telegraf, Markup } = require('telegraf')
const sqlite3 = require('sqlite3').verbose()
const axios = require('axios')

// ===== KONFIGURASI =====
const BOT_TOKEN = '7903398118:AAE0MXpz-gj3h3OvMozmg6oRxw-0BWeBmVY' // Ganti dengan token bot
const ADMIN_ID = 5988451717 // Ganti ID admin
const CREATOR = '@hiyaok'
const DB_FILE = 'brain.db'

// ===== INISIALISASI =====
const db = new sqlite3.Database(DB_FILE)
const bot = new Telegraf(BOT_TOKEN)

// ===== SETUP DATABASE =====
db.serialize(() => {
  // Tabel untuk menyimpan pengetahuan
  db.run(`CREATE TABLE IF NOT EXISTS knowledge (
    id INTEGER PRIMARY KEY,
    keyword TEXT UNIQUE,
    response TEXT,
    source TEXT,
    count INTEGER DEFAULT 1
  )`)

  // Tabel sesi pengguna
  db.run(`CREATE TABLE IF NOT EXISTS sessions (
    user_id INTEGER PRIMARY KEY,
    history TEXT,
    updated DATETIME DEFAULT CURRENT_TIMESTAMP
  )`)

  // Tabel grup
  db.run(`CREATE TABLE IF NOT EXISTS groups (
    chat_id INTEGER PRIMARY KEY,
    name TEXT,
    joined DATETIME DEFAULT CURRENT_TIMESTAMP
  )`)
})

// ===== SISTEM KECERDASAN =====
class IntelligentSystem {
  constructor() {
    this.cryptoAPIs = {
      coinGecko: 'https://api.coingecko.com/api/v3'
    }
    
    this.responseStyles = {
      crypto: ['🚀', '💎', '📈'],
      casual: ['🤔', '😎', '💡'],
      group: ['👥', '🗣️', '💬'],
      web: ['🌐', '📚', '🔍']
    }
  }

  async processInput(text, userId) {
    // Update history
    await this.updateHistory(userId, text)
    
    // Deteksi topik
    if(await this.isCryptoQuestion(text)) {
      return this.handleCrypto(text)
    }
    
    // Cari jawaban dari knowledge base
    const knowledge = await this.getKnowledge(text)
    if(knowledge) return knowledge
    
    // Cari di web
    const webInfo = await this.getWebInfo(text)
    return webInfo || this.generateNaturalResponse(text)
  }

  async updateHistory(userId, text) {
    db.run(
      `INSERT OR REPLACE INTO sessions (user_id, history) 
      VALUES (?, COALESCE((SELECT history FROM sessions WHERE user_id = ?), '[]') || ?)`,
      [userId, userId, `"${text}",`]
    )
  }

  async isCryptoQuestion(text) {
    const cryptoTerms = ['bitcoin', 'crypto', 'blockchain', 'nft', 'eth', 'btc']
    return cryptoTerms.some(term => text.toLowerCase().includes(term))
  }

  async handleCrypto(text) {
    const coin = this.extractCoin(text)
    if(coin) {
      try {
        const price = await this.getCryptoPrice(coin)
        return {
          text: `💰 *${coin.toUpperCase()}*\nHarga saat ini: $${price}\nSumber: CoinGecko`,
          style: 'crypto'
        }
      } catch {
        return this.createResponse('⚠️ Gangguan data crypto', 'confused')
      }
    }
    return this.createResponse('🔍 Coin mana yang mau dicek?', 'crypto')
  }

  async getCryptoPrice(coin) {
    const response = await axios.get(
      `${this.cryptoAPIs.coinGecko}/simple/price?ids=${coin}&vs_currencies=usd`
    )
    return response.data[coin].usd
  }

  async getKnowledge(query) {
    return new Promise((resolve) => {
      db.get(
        `SELECT response, source FROM knowledge 
        WHERE keyword LIKE ? 
        ORDER BY count DESC LIMIT 1`,
        [`%${query}%`],
        (err, row) => {
          if(row) {
            resolve(this.createResponse(
              `${row.response}\n\n🔗 Sumber: ${row.source}`,
              'group'
            ))
          } else resolve(null)
        }
      )
    })
  }

  async getWebInfo(query) {
    try {
      const response = await axios.get(
        `https://api.wikimedia.org/core/v1/wikipedia/id/search/page?q=${encodeURIComponent(query)}&limit=1`
      )
      if(response.data.pages[0]) {
        return this.createResponse(
          `📚 ${response.data.pages[0].description}\n🔗 Baca lengkap: ${response.data.pages[0].content_urls.desktop.page}`,
          'web'
        )
      }
    } catch {}
    return null
  }

  generateNaturalResponse(text) {
    const responses = [
      `🤔 Hmm... Jadi penasaran tentang ${text}. Menurut lu gimana?`,
      `💡 ${text} ya? Bisa dijelasin lebih detail?`,
      `🔥 Topik menarik! ${text} ini sering dibahas di grup crypto tuh...`
    ]
    return this.createResponse(
      responses[Math.floor(Math.random() * responses.length)],
      'casual'
    )
  }

  createResponse(text, style) {
    const emoji = this.responseStyles[style]
      ? this.responseStyles[style][Math.floor(Math.random()*3)]
      : '💬'
    return {
      text: `${emoji} ${text}`,
      buttons: Markup.inlineKeyboard([
        Markup.button.callback('💬 Feedback', 'feedback')
      ])
    }
  }
}

// ===== INISIALISASI AI =====
const AI = new IntelligentSystem()

// ===== HANDLER UTAMA =====
// Simpan pesan grup
bot.on('message', async (ctx) => {
  if(ctx.chat.type === 'group' || ctx.chat.type === 'supergroup') {
    const text = ctx.message.text
    const keywords = text.match(/\b(\w+)\b/gi) || []
    
    keywords.forEach(keyword => {
      db.run(
        `INSERT INTO knowledge (keyword, response, source) 
        VALUES (?, ?, ?) 
        ON CONFLICT(keyword) DO UPDATE SET count = count + 1`,
        [keyword.toLowerCase(), text, `Grup: ${ctx.chat.title}`]
      )
    })
    
    db.run(
      `INSERT OR IGNORE INTO groups (chat_id, name) VALUES (?, ?)`,
      [ctx.chat.id, ctx.chat.title]
    )
  }
})

// Handle pesan
bot.on('text', async (ctx) => {
  if(ctx.chat.type === 'private') {
    const response = await AI.processInput(ctx.message.text, ctx.from.id)
    
    ctx.replyWithMarkdown(
      response.text,
      response.buttons
    )
  }
})

// ===== FITUR TAMBAHAN =====
// Command start
bot.command('start', (ctx) => {
  ctx.replyWithMarkdown(`*🤖 Crypto Brain Bot*  
Dibuat oleh ${CREATOR}

✨ *Fitur:*
- Diskusi crypto real-time
- Jawaban natural
- Learning from groups
- Sesi percakapan

🔧 *Perintah:*
/start - Info bot
/reset - Reset percakapan

💡 Bot ini belajar otomatis dari grup!`)
})

// Command reset
bot.command('reset', (ctx) => {
  db.run(`DELETE FROM sessions WHERE user_id = ?`, [ctx.from.id])
  ctx.reply('🔄 Sessi direset! Yuk mulai obrolan baru~')
})

// Handler feedback
bot.action('feedback', (ctx) => {
  ctx.answerCbQuery()
  ctx.reply('📩 Makasih! Feedback udah dikirim ke admin')
  
  ctx.telegram.sendMessage(
    ADMIN_ID,
    `💌 Feedback baru dari @${ctx.from.username}:\n"${ctx.match.input}"`
  )
})

// ===== START BOT =====
bot.launch()
  .then(() => console.log('🤖 Bot aktif!'))
  .catch(err => console.error('💥 Error:', err))
