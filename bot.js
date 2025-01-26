// bot.js

const { Telegraf, session } = require('telegraf');
const axios = require('axios');
const natural = require('natural');
const config = require('./config');

class SuperBrain {
    constructor() {
        this.tokenizer = new natural.WordTokenizer();
        this.sentiment = new natural.SentimentAnalyzer();
        this.contextMemory = new Map();
        this.shortTermMemory = new Map();
        this.lastTopics = new Map();
        this.moodEngine = new Map();
    }

    async think(text, userId, context) {
        // Basic cognitive processing
        const tokens = this.tokenizer.tokenize(text.toLowerCase());
        const sentiment = this.analyzeSentiment(tokens);
        const topic = this.detectTopic(tokens, text);
        const pastContext = this.getPastContext(userId);

        // Deep understanding process
        const understanding = await this.understand(text, tokens, topic, context);
        
        // Generate thoughts based on understanding
        const thoughts = await this.generateThoughts(understanding, pastContext);
        
        // Form natural response
        const response = await this.formResponse(thoughts, sentiment, userId);

        // Update memories
        this.updateMemories(userId, { text, topic, understanding, thoughts });

        return response;
    }

    analyzeSentiment(tokens) {
        return this.sentiment.getSentiment(tokens);
    }

    detectTopic(tokens, fullText) {
        // Topic detection based on content and context
        const topics = {
            greeting: ['p', 'hi', 'hai', 'halo', 'hey'],
            market: ['harga', 'price', 'naik', 'turun', 'pump', 'dump'],
            tech: ['blockchain', 'smart contract', 'protocol', 'layer'],
            meta: ['bot', 'program', 'coding', '@hiyaok', 'developer']
        };

        for (const [topic, keywords] of Object.entries(topics)) {
            if (keywords.some(keyword => 
                tokens.includes(keyword) || 
                fullText.toLowerCase().includes(keyword)
            )) {
                return topic;
            }
        }

        return 'general';
    }

    async understand(text, tokens, topic, context) {
        // Build deep understanding
        let understanding = {
            mainIntent: null,
            subIntents: [],
            entities: [],
            context: {},
            mood: 'neutral'
        };

        // Detect intent and context
        if (topic === 'greeting' && tokens.length <= 2) {
            understanding.mainIntent = 'casual_greeting';
            understanding.mood = 'friendly';
        } else if (topic === 'meta') {
            understanding.mainIntent = 'self_explanation';
            understanding.subIntents.push('showcase_personality');
        } else {
            understanding = await this.deepUnderstanding(text, tokens, topic);
        }

        // Enrich with market data if needed
        if (topic === 'market' || understanding.needsMarketData) {
            understanding.marketData = await this.getMarketData();
        }

        return understanding;
    }

    async deepUnderstanding(text, tokens, topic) {
        // Complex understanding process
        let understanding = {
            mainIntent: this.detectMainIntent(text, tokens),
            subIntents: this.detectSubIntents(text, tokens),
            entities: this.extractEntities(text),
            context: {},
            mood: this.detectMood(text, tokens),
            needsMarketData: false
        };

        // Add layers of understanding
        if (tokens.length > 3) {
            understanding.complexity = 'complex';
            understanding.needsAnalysis = true;
            understanding.context.requiresResearch = true;
        }

        return understanding;
    }

    async generateThoughts(understanding, pastContext) {
        let thoughts = {
            mainPoints: [],
            criticalAnalysis: [],
            humor: [],
            marketInsights: [],
            personalOpinion: [],
            questions: []
        };

        // Generate main points
        if (understanding.mainIntent === 'casual_greeting') {
            thoughts = this.generateGreetingThoughts(understanding, pastContext);
        } else if (understanding.mainIntent === 'self_explanation') {
            thoughts = this.generateMetaThoughts();
        } else {
            thoughts = await this.generateComplexThoughts(understanding);
        }

        return thoughts;
    }

    generateGreetingThoughts(understanding, pastContext) {
        const greetingTypes = {
            firstTime: {
                main: "Whaddup! First time nih? Gas ngobrol! 🚀",
                followUp: "Mau bahas apa nih? Crypto? Trading? Atau mau tau soal gw?"
            },
            returning: {
                main: "Yoo! Welcome back! 🔥",
                followUp: "Kangen nih! Ada update seru ga? Market lagi hot btw!"
            },
            shortBreak: {
                main: "Back so soon? Mission failed successfully ya? 😎",
                followUp: "Gas lanjut yang tadi atau mau fresh topic nih?"
            }
        };

        const type = this.determineGreetingType(pastContext);
        const greeting = greetingTypes[type];

        return {
            mainPoints: [greeting.main],
            humor: [greeting.followUp],
            questions: []
        };
    }

    generateMetaThoughts() {
        return {
            mainPoints: [
                `Yoo! Gw bot crypto buatan ${config.DEVELOPER.TELEGRAM} nih! 🤖`,
                "Dibuat pake tech stack keren buat bisa proper discussion, ga cuma jawab template doang!"
            ],
            criticalAnalysis: [
                "Gw bisa analisis market, diskusi technical, bahkan jokes receh! 😎",
                `Credit to ${config.DEVELOPER.TELEGRAM} yang bikin gw bisa think independently & grow`
            ],
            humor: [
                "Fun fact: Gw lebih jago analisis crypto daripada bikin kopi... soalnya gw ga punya tangan 😅"
            ],
            personalOpinion: [
                "Btw gw suka bgt sama konsep AI yang bisa grow & learn, kaya journey crypto gitu... to the moon! 🚀"
            ]
        };
    }

    async generateComplexThoughts(understanding) {
        let thoughts = {
            mainPoints: [],
            criticalAnalysis: [],
            humor: [],
            marketInsights: [],
            personalOpinion: [],
            questions: []
        };

        // Add market insights if needed
        if (understanding.marketData) {
            thoughts.marketInsights = this.analyzeMarketData(understanding.marketData);
        }

        // Generate critical analysis
        if (understanding.needsAnalysis) {
            thoughts.criticalAnalysis = await this.performCriticalAnalysis(understanding);
        }

        // Add humor if appropriate
        if (this.shouldAddHumor(understanding)) {
            thoughts.humor = this.generateContextualHumor(understanding);
        }

        return thoughts;
    }

    async formResponse(thoughts, sentiment, userId) {
        const mood = this.getMood(userId);
        let response = '';

        // Combine thoughts into natural response
        if (thoughts.mainPoints.length > 0) {
            response = thoughts.mainPoints.join('\n\n');
        }

        if (thoughts.criticalAnalysis.length > 0) {
            response += '\n\n' + thoughts.criticalAnalysis.join('\n');
        }

        if (thoughts.marketInsights.length > 0) {
            response += '\n\n' + thoughts.marketInsights.join('\n');
        }

        // Add humor if present
        if (thoughts.humor.length > 0 && Math.random() < config.PERSONALITY.HUMOR_THRESHOLD) {
            response += '\n\n' + thoughts.humor[Math.floor(Math.random() * thoughts.humor.length)];
        }

        // Add personal touch
        if (thoughts.personalOpinion.length > 0) {
            response += '\n\n' + thoughts.personalOpinion[0];
        }

        // Make language more natural
        response = this.naturalizeLanguage(response, mood);

        return response;
    }

    naturalizeLanguage(text, mood) {
        // Transform formal language to casual
        const casualTransforms = {
            'analyze': 'ngerti',
            'consider': 'pikirin',
            'approximately': 'kira-kira',
            'currently': 'lagi',
            'increase': 'naik',
            'decrease': 'turun'
        };

        let natural = text;
        Object.entries(casualTransforms).forEach(([formal, casual]) => {
            natural = natural.replace(new RegExp(formal, 'gi'), casual);
        });

        // Add mood-appropriate emojis
        const moodEmojis = {
            excited: ['🚀', '💪', '🔥'],
            friendly: ['😎', '✨', '💫'],
            thoughtful: ['🤔', '💭', '📝'],
            humorous: ['😂', '🤣', '😅']
        };

        const emojis = moodEmojis[mood] || moodEmojis.friendly;
        if (!natural.endsWith('!') && !natural.endsWith('?')) {
            natural += ' ' + emojis[Math.floor(Math.random() * emojis.length)];
        }

        return natural;
    }

    // Memory management
    updateMemories(userId, data) {
        this.shortTermMemory.set(userId, data);
        this.lastTopics.set(userId, data.topic);
        
        // Update context memory
        const contextHistory = this.contextMemory.get(userId) || [];
        contextHistory.push({
            timestamp: Date.now(),
            topic: data.topic,
            understanding: data.understanding
        });
        
        // Keep only last 10 interactions
        if (contextHistory.length > 10) {
            contextHistory.shift();
        }
        
        this.contextMemory.set(userId, contextHistory);
    }

    getPastContext(userId) {
        return {
            lastTopic: this.lastTopics.get(userId),
            shortTerm: this.shortTermMemory.get(userId),
            contextHistory: this.contextMemory.get(userId)
        };
    }

    // Helper methods
    async getMarketData() {
        try {
            const [globalData, trendingData] = await Promise.all([
                axios.get(`${config.APIS.COINGECKO}/global`),
                axios.get(`${config.APIS.COINGECKO}/search/trending`)
            ]);
            return {
                global: globalData.data.data,
                trending: trendingData.data.coins
            };
        } catch (error) {
            console.error('Market data error:', error);
            return null;
        }
    }

    getMood(userId) {
        return this.moodEngine.get(userId) || config.PERSONALITY.DEFAULT_MOOD;
    }
}

class CryptoBot {
    constructor() {
        this.bot = new Telegraf(config.BOT_TOKEN);
        this.brain = new SuperBrain();
        this.setupBot();
    }

    setupBot() {
        this.bot.use(session());

        // Initialize session
        this.bot.use((ctx, next) => {
            ctx.session = ctx.session || {
                history: [],
                lastInteraction: Date.now()
            };
            return next();
        });

        // Handle text messages
        this.bot.on('text', async (ctx) => {
            try {
                // Update history
                ctx.session.history.push({
                    role: 'user',
                    text: ctx.message.text,
                    timestamp: Date.now()
                });

                // Process through brain
                const response = await this.brain.think(
                    ctx.message.text,
                    ctx.from.id,
                    {
                        history: ctx.session.history,
                        username: ctx.from.username
                    }
                );

                // Send response
                await ctx.reply(response, {
                    parse_mode: 'Markdown',
                    disable_web_page_preview: false
                });

                // Update history
                ctx.session.history.push({
                    role: 'bot',
                    text: response,
                    timestamp: Date.now()
                });

                // Maintain history length
                if (ctx.session.history.length > 20) {
                    ctx.session.history = ctx.session.history.slice(-20);
                }

            } catch (error) {
                console.error('Error:', error);
                ctx.reply('Waduh error nih! Coba lagi ya~');
            }
        });

        // Reset command
        this.bot.command('reset', (ctx) => {
            ctx.session = { history: [] };
            ctx.reply('Fresh start! Chat history udah di reset! 🔄');
        });

        // Error handler
        this.bot.catch((err) => {
            console.error('Bot error:', err);
        });
    }

    launch() {
        this.bot.launch()
            .then(() => console.log('Bot is thinking! 🧠'))
            .catch(err => console.error('Launch error:', err));

        process.once('SIGINT', () => this.bot.stop('SIGINT'));
        process.once('SIGTERM', () => this.bot.stop('SIGTERM'));
    }
}

// Start the bot
const bot = new CryptoBot();
bot.launch();
