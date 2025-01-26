const { Telegraf } = require('telegraf');
const { NeuralNetwork } = require('brain.js');
const natural = require('natural');
const axios = require('axios');

const BOT_TOKEN = '7903398118:AAEwEzFnw1CZDqnPlwIEHfMI_dUU9qpsy1Q';

class BrainCore {
    constructor() {
        // Neural network for understanding
        this.network = new NeuralNetwork();
        
        // Natural language processing
        this.tokenizer = new natural.WordTokenizer();
        this.tfidf = new natural.TfIdf();
        
        // Dynamic memory system
        this.conversationState = new Map();
        this.knowledgeBase = new Map();
        
        // Initialize learning system
        this.initializeLearning();
    }

    async initializeLearning() {
        // Initialize with base understanding
        await this.network.train([
            // Base patterns for learning
            { input: { text: 'greeting' }, output: { type: 'social' } },
            { input: { text: 'question' }, output: { type: 'analytical' } }
        ]);
    }

    async learn(input, context) {
        // Learn from interaction
        const pattern = this.extractPattern(input);
        await this.network.train([{
            input: pattern,
            output: { type: context.type }
        }]);
    }

    extractPattern(input) {
        // Convert input to learning pattern
        const tokens = this.tokenizer.tokenize(input.toLowerCase());
        return {
            text: input,
            tokens: tokens.length,
            complexity: this.analyzeComplexity(tokens)
        };
    }

    analyzeComplexity(tokens) {
        // Analyze input complexity
        return tokens.length > 10 ? 'complex' : 'simple';
    }

    async think(input, context) {
        // Real thinking process
        const understanding = await this.understand(input, context);
        const analysis = await this.analyze(understanding);
        const thought = await this.formulate(analysis);
        
        return this.express(thought);
    }

    async understand(input, context) {
        // Build deep understanding
        const tokens = this.tokenizer.tokenize(input.toLowerCase());
        const sentiment = this.analyzeSentiment(tokens);
        const topic = this.identifyTopic(tokens);
        const intent = this.determineIntent(tokens, context);

        return {
            tokens,
            sentiment,
            topic,
            intent,
            context
        };
    }

    analyzeSentiment(tokens) {
        // Custom sentiment analysis
        let score = 0;
        tokens.forEach(token => {
            // Dynamic sentiment scoring
            if (this.isPositive(token)) score++;
            if (this.isNegative(token)) score--;
        });
        return score;
    }

    isPositive(token) {
        return [
            'bagus', 'mantap', 'keren', 'asik', 'seru',
            'bull', 'pump', 'moon', 'profit'
        ].includes(token);
    }

    isNegative(token) {
        return [
            'jelek', 'ampas', 'rugi', 'loss',
            'bear', 'dump', 'crash', 'rekt'
        ].includes(token);
    }

    identifyTopic(tokens) {
        // Dynamic topic identification
        const topics = {
            market: ['price', 'chart', 'analysis', 'harga'],
            tech: ['blockchain', 'protocol', 'network'],
            social: ['dev', 'team', 'community'],
            meta: ['bot', 'program', 'code']
        };

        for (const [topic, keywords] of Object.entries(topics)) {
            if (tokens.some(token => keywords.includes(token))) {
                return topic;
            }
        }
        return 'general';
    }

    determineIntent(tokens, context) {
        // Dynamic intent analysis
        if (tokens.some(t => t.match(/^(apa|gimana|kenapa|kapan)/))) {
            return 'question';
        }
        if (tokens.some(t => t.match(/^(tolong|help|bantu)/))) {
            return 'request';
        }
        return 'statement';
    }

    async analyze(understanding) {
        // Deep analysis of understanding
        const analysis = {
            mainPoints: [],
            criticalThoughts: [],
            humorPotential: 0,
            marketData: null
        };

        // Build analysis based on topic
        if (understanding.topic === 'market') {
            analysis.marketData = await this.getMarketData();
            analysis.criticalThoughts = this.analyzeMarket(analysis.marketData);
        }

        // Add humor if appropriate
        if (this.shouldAddHumor(understanding)) {
            analysis.humorPotential = Math.random();
        }

        return analysis;
    }

    async getMarketData() {
        try {
            const [globalData, trendingData] = await Promise.all([
                axios.get('https://api.coingecko.com/api/v3/global'),
                axios.get('https://api.coingecko.com/api/v3/search/trending')
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

    analyzeMarket(data) {
        if (!data) return [];

        const thoughts = [];
        
        // Critical market analysis
        if (data.global) {
            const { total_market_cap, market_cap_percentage } = data.global;
            
            if (market_cap_percentage.btc > 50) {
                thoughts.push("Bitcoin dominance tinggi, altcoin season might be delayed");
            } else {
                thoughts.push("Altcoin getting stronger, diversification might be good");
            }
        }

        // Trend analysis
        if (data.trending) {
            thoughts.push(`Top trending: ${data.trending.slice(0,3).map(c => c.item.symbol).join(', ')}`);
        }

        return thoughts;
    }

    shouldAddHumor(understanding) {
        return understanding.sentiment > 0 && 
               !understanding.tokens.includes('serius') &&
               Math.random() > 0.7;
    }

    async formulate(analysis) {
        // Formulate response
        let response = '';

        // Add market insights
        if (analysis.marketData) {
            response += this.formulateMarketInsights(analysis.marketData);
        }

        // Add critical thoughts
        if (analysis.criticalThoughts.length > 0) {
            response += '\n\n' + analysis.criticalThoughts.join('\n');
        }

        // Add humor if appropriate
        if (analysis.humorPotential > 0.8) {
            response += '\n\n' + this.generateHumor();
        }

        return response;
    }

    formulateMarketInsights(data) {
        if (!data.global) return '';

        const mcap = (data.global.total_market_cap.usd / 1e12).toFixed(2);
        const btcDom = data.global.market_cap_percentage.btc.toFixed(1);

        return `Market Update 📊\n` +
               `Total MCap: $${mcap}T\n` +
               `BTC Dominance: ${btcDom}%`;
    }

    generateHumor() {
        // Dynamic humor generation based on context
        return Math.random() > 0.5 ? 
            "Keep calm and HODL on! 💎✋" :
            "Not financial advice, tapi financial entertainment! 🎭";
    }

    express(thought) {
        // Transform thought into natural expression
        return thought
            .replace(/\b(?:analysis|analyze)\b/g, 'ngerti')
            .replace(/\b(?:currently|present)\b/g, 'sekarang')
            .replace(/\b(?:recommendation)\b/g, 'saran')
            .replace(/\b(?:potentially)\b/g, 'kayaknya');
    }
}

class CryptoBot {
    constructor() {
        this.bot = new Telegraf(BOT_TOKEN);
        this.brain = new BrainCore();
        this.sessions = new Map();
        this.setupBot();
    }

    setupBot() {
        // Handle text messages
        this.bot.on('text', async (ctx) => {
            try {
                const userId = ctx.from.id;
                let session = this.sessions.get(userId);
                
                if (!session) {
                    session = {
                        history: [],
                        lastInteraction: Date.now()
                    };
                    this.sessions.set(userId, session);
                }

                // Process through brain
                const response = await this.brain.think(
                    ctx.message.text,
                    {
                        history: session.history,
                        userId: userId
                    }
                );

                // Update history
                session.history.push({
                    role: 'user',
                    text: ctx.message.text,
                    timestamp: Date.now()
                });

                // Send response
                await ctx.reply(response);

                // Update history
                session.history.push({
                    role: 'bot',
                    text: response,
                    timestamp: Date.now()
                });

                // Maintain history length
                if (session.history.length > 20) {
                    session.history = session.history.slice(-20);
                }

                // Learn from interaction
                await this.brain.learn(ctx.message.text, {
                    type: 'conversation',
                    success: true
                });

            } catch (error) {
                console.error('Error:', error);
                ctx.reply('Waduh error nih! Coba lagi ya~');
            }
        });

        // Reset command
        this.bot.command('reset', (ctx) => {
            const userId = ctx.from.id;
            this.sessions.delete(userId);
            ctx.reply('Chat history cleared! Fresh start! 🔄');
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

// Create and launch bot
const bot = new CryptoBot();
bot.launch();
