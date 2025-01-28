const { Telegraf } = require('telegraf');
const natural = require('natural');
const tf = require('@tensorflow/tfjs-node');
const math = require('mathjs');
const fs = require('fs').promises;

// Initialize core components
const bot = new Telegraf('7543358703:AAHSmglzIOrl3gS6OuAvxG6khEyEaOY7JEY');
const tokenizer = new natural.WordTokenizer();
const classifier = new natural.BayesClassifier();

/**
 * Enhanced Bot Brain with advanced learning capabilities
 */
class EnhancedBotBrain {
    constructor() {
        // Initialize TensorFlow sequential model with optimized layer structure
        this.model = tf.sequential({
            layers: [
                tf.layers.dense({
                    units: 20,
                    inputShape: [6], // Adjusted for our input features
                    activation: 'relu'
                }),
                tf.layers.dense({
                    units: 15,
                    activation: 'relu'
                }),
                tf.layers.dense({
                    units: 10,
                    activation: 'sigmoid'
                })
            ]
        });

        // Compile model with optimized settings
        this.model.compile({
            optimizer: tf.train.adam(0.01),
            loss: 'meanSquaredError',
            metrics: ['accuracy']
        });

        // Initialize memory systems
        this.conversationMemory = new Map();
        this.groupPatterns = new Map();
        this.userProfiles = new Map();
        this.groupContexts = new Map();
        this.responsePatterns = new Map();
        
        // Bot identity and knowledge
        this.identity = {
            creator: {
                username: '@hiyaok',
                role: 'Developer',
                skills: ['AI', 'Bot Development', 'Backend'],
                contact: 'https://t.me/hiyaok'
            },
            features: [
                'Continuous learning',
                'Natural conversation',
                'Group management',
                'Smart decision making'
            ]
        };
    }

    async trainNetwork(analysis) {
        try {
            // Convert analysis data to tensor format
            const inputData = tf.tensor2d([[
                analysis.sentiment.score,
                analysis.sentiment.intensity,
                analysis.complexity.avgLength,
                analysis.complexity.uniqueRatio,
                analysis.topics.length,
                analysis.informality
            ]]);

            // Create output tensor (adjust based on your needs)
            const outputData = tf.tensor2d([[1]]);

            // Train the model
            await this.model.fit(inputData, outputData, {
                epochs: 1,
                batchSize: 1,
                verbose: 0
            });

            // Clean up tensors
            inputData.dispose();
            outputData.dispose();
        } catch (error) {
            console.error('Training error:', error);
        }
    }

    async predict(input) {
        try {
            // Convert input to tensor
            const inputTensor = tf.tensor2d([input]);
            
            // Make prediction
            const prediction = await this.model.predict(inputTensor);
            const result = await prediction.data();
            
            // Clean up
            inputTensor.dispose();
            prediction.dispose();
            
            return result[0];
        } catch (error) {
            console.error('Prediction error:', error);
            return 0.5; // Default fallback value
        }
    }

    async learn(message, context) {
        const { chat, from, text } = message;
        
        // Comprehensive analysis
        const analysis = await this.analyzeContent(text, context);
        
        // Update various learning components
        await Promise.all([
            this.updateGroupLearning(chat.id, analysis),
            this.updateUserProfile(from.id, analysis),
            this.updateResponsePatterns(chat.id, text, analysis),
            this.trainNetwork(analysis)
        ]);

        return analysis;
    }

    async analyzeContent(text, context) {
        const tokens = tokenizer.tokenize(text.toLowerCase());
        
        return {
            tokens,
            intent: this.identifyIntent(text),
            sentiment: this.analyzeSentiment(tokens),
            complexity: this.calculateComplexity(tokens),
            topics: this.identifyTopics(text),
            informality: this.measureInformality(tokens)
        };
    }

    identifyIntent(text) {
        const intents = {
            dev_info: text.match(/buat|bikin|creator|dev|developer/i),
            identity: text.match(/siapa|who|lu|kamu|elo|gue|bot/i),
            greeting: text.match(/hai|halo|hi|hey|oy/i),
            question: text.match(/apa|siapa|kapan|dimana|mengapa|kenapa|gimana/i),
            math: text.match(/berapa|hitung|kali|bagi|tambah|kurang|\d+[\s+\-*/]/i),
            moderation: text.match(/kick|ban|mute|warn|toxic/i)
        };

        return Object.entries(intents)
            .filter(([_, match]) => match)
            .map(([intent]) => intent);
    }

    analyzeSentiment(tokens) {
        let score = 0;
        let intensity = 0;

        tokens.forEach(token => {
            // Positive indicators
            if (token.match(/bagus|keren|mantap|asik|suka|oke|good/)) {
                score += 1;
                intensity += 1;
            }
            // Negative indicators
            else if (token.match(/jelek|buruk|benci|ga(k)?suka|bad|poor/)) {
                score -= 1;
                intensity += 1;
            }
            // Slang modifiers
            else if (token.match(/anjir|anjay|wkwk|awok|bangsat|kontol/)) {
                intensity += 0.5;
            }
            // Intensity modifiers
            else if (token.match(/banget|sangat|very|really/)) {
                intensity += 0.5;
            }
        });

        return {
            score: score * (1 + intensity),
            intensity,
            isPositive: score > 0,
            isNegative: score < 0
        };
    }

    calculateComplexity(tokens) {
        return {
            avgLength: tokens.reduce((sum, token) => sum + token.length, 0) / tokens.length,
            uniqueRatio: new Set(tokens).size / tokens.length
        };
    }

    identifyTopics(text) {
        const topics = new Set();
        
        if (text.match(/bot|telegram|pesan|chat/i)) topics.add('telegram');
        if (text.match(/kick|ban|mute|admin|member/i)) topics.add('moderation');
        if (text.match(/\d+|hitung|matematika|math/i)) topics.add('math');
        if (text.match(/belajar|learn|pinter/i)) topics.add('learning');
        
        return Array.from(topics);
    }

    measureInformality(tokens) {
        const informalWords = tokens.filter(token => 
            token.match(/gw|lu|anjir|anjay|wkwk|bro|sis|cuy|gan|sob/)
        ).length;
        
        return informalWords / tokens.length;
    }

    async updateGroupLearning(groupId, analysis) {
        if (!this.groupPatterns.has(groupId)) {
            this.groupPatterns.set(groupId, {
                patterns: [],
                vocabulary: new Map(),
                sentiment: { positive: 0, negative: 0, neutral: 0 },
                lastUpdate: null
            });
        }

        const patterns = this.groupPatterns.get(groupId);
        patterns.patterns.push({
            analysis,
            timestamp: Date.now()
        });

        // Update group vocabulary
        analysis.tokens.forEach(token => {
            patterns.vocabulary.set(token, 
                (patterns.vocabulary.get(token) || 0) + 1
            );
        });

        // Update sentiment stats
        if (analysis.sentiment.isPositive) patterns.sentiment.positive++;
        else if (analysis.sentiment.isNegative) patterns.sentiment.negative++;
        else patterns.sentiment.neutral++;

        patterns.lastUpdate = Date.now();
    }

    async updateUserProfile(userId, analysis) {
        if (!this.userProfiles.has(userId)) {
            this.userProfiles.set(userId, {
                messageCount: 0,
                sentimentHistory: [],
                topicInterests: new Map(),
                activityPattern: [],
                warnings: 0,
                lastActive: null
            });
        }

        const profile = this.userProfiles.get(userId);
        profile.messageCount++;
        profile.sentimentHistory.push(analysis.sentiment);
        profile.lastActive = Date.now();

        analysis.topics.forEach(topic => {
            profile.topicInterests.set(topic,
                (profile.topicInterests.get(topic) || 0) + 1
            );
        });

        profile.activityPattern.push({
            hour: new Date().getHours(),
            sentiment: analysis.sentiment.score,
            topics: analysis.topics
        });
    }

    async updateResponsePatterns(groupId, text, analysis) {
        if (!this.responsePatterns.has(groupId)) {
            this.responsePatterns.set(groupId, []);
        }

        const patterns = this.responsePatterns.get(groupId);
        patterns.push({
            text,
            analysis,
            timestamp: Date.now()
        });

        // Keep only recent patterns
        const DAY = 86400000; // 24 hours in milliseconds
        const recentPatterns = patterns.filter(p => 
            Date.now() - p.timestamp < DAY
        );
        this.responsePatterns.set(groupId, recentPatterns);
    }

    async generateResponse(text, context) {
        const analysis = await this.analyzeContent(text, context);
        let response;

        // Handle developer/identity questions
        if (analysis.intent.includes('dev_info') || analysis.intent.includes('identity')) {
            response = await this.generateIdentityResponse(analysis);
        }
        // Handle moderation-related queries
        else if (analysis.intent.includes('moderation')) {
            response = await this.generateModerationResponse(analysis, context);
        }
        // Handle math calculations
        else if (analysis.intent.includes('math')) {
            response = await this.generateMathResponse(text, analysis);
        }
        // Handle general questions
        else if (analysis.intent.includes('question')) {
            response = await this.generateQuestionResponse(text, analysis, context);
        }
        // Handle general conversation
        else {
            response = await this.generateConversationalResponse(text, analysis, context);
        }

        return this.adaptResponseStyle(response, analysis, context);
    }

    async generateIdentityResponse(analysis) {
        const { creator } = this.identity;
        const responses = [
            `Gw dibuat sama ${creator.username} bang! Dia ${creator.role} yang jago soal ${creator.skills.join(', ')} 🚀`,
            `Oh, creator gw tuh ${creator.username}! Developer yang fokus di ${creator.skills.slice(0, 2).join(' sama ')} ✨`,
            `${creator.username} yang bikin gw! Kalo mau tau lebih lanjut bisa langsung contact dia aja 😎`
        ];

        return responses[Math.floor(Math.random() * responses.length)];
    }

    async generateMathResponse(text, analysis) {
        try {
            const expression = text
                .replace(/dikali/gi, '*')
                .replace(/dibagi/gi, '/')
                .replace(/ditambah/gi, '+')
                .replace(/dikurang/gi, '-')
                .replace(/[^0-9+\-*/().]/g, '');

            const result = math.evaluate(expression);
            
            const responses = [
                `Bentar gw itung... ${expression} = ${result} 🤓`,
                `Gas! Hasilnya ${result} ✨`,
                `Nih hasil itungannya ${result} 🔢`,
                `${result} bro! Gampang kan? 😎`
            ];

            return responses[Math.floor(Math.random() * responses.length)];
        } catch (error) {
            return "Duh sorry, gw ga ngerti itungannya. Coba yang lebih simple ya! 😅";
        }
    }

    adaptResponseStyle(response, analysis, context) {
        // Get group-specific patterns if available
        const groupPatterns = context.groupId ? 
            this.groupPatterns.get(context.groupId) : null;

        // Adapt formality based on group patterns
        if (groupPatterns && analysis.informality > 0.5) {
            response = this.makeInformal(response);
        }

        // Add contextual emoji based on sentiment
        const emoji = this.getContextualEmoji(analysis.sentiment);
        if (!response.includes(emoji)) {
            response = `${response} ${emoji}`;
        }

        return response;
    }

    makeInformal(text) {
        const informal = {
            'saya': 'gw',
            'kamu': 'lu',
            'anda': 'lu',
            'tidak': 'ga',
            'bagaimana': 'gimana'
        };

        Object.entries(informal).forEach(([formal, slang]) => {
            text = text.replace(new RegExp(formal, 'gi'), slang);
        });

        return text;
    }

    getContextualEmoji(sentiment) {
        if (sentiment.score > 1) return '🔥';
        if (sentiment.score > 0) return '✨';
        if (sentiment.score < -1) return '😅';
        if (sentiment.score < 0) return '😩';
        return '👀';
    }
}

/**
 * Advanced Group Manager with learning-based moderation
 */
class EnhancedGroupManager {
    constructor(botBrain) {
        this.brain = botBrain;
        this.actionHistory = new Map();
        this.warningSystem = new Map();
    }

    async analyzeUser(userId, message) {
        const profile = this.brain.userProfiles.get(userId) || {};
        const messageAnalysis = await this.brain.analyzeContent(message.text);
        
        // Convert analysis to tensor format for prediction
        const inputFeatures = [
            messageAnalysis.sentiment.score,
            messageAnalysis.sentiment.intensity,
            messageAnalysis.complexity.avgLength,
            profile.warningCount || 0,
            messageAnalysis.toxicity || 0,
            messageAnalysis.informality || 0
        ];

        // Get prediction from TensorFlow model
        const riskScore = await this.brain.predict(inputFeatures);
        
        return {
            toxicity: this.calculateToxicity(messageAnalysis),
            spamScore: await this.calculateSpamScore(userId),
            warningCount: this.getWarningCount(userId),
            overallRisk: riskScore
        };
    }

    async analyzeAndExecute(ctx) {
        if (!ctx.message.reply_to_message) {
            return ctx.reply("Reply dulu pesannya yang mau gw analisis dong! 🤔");
        }

        const targetUser = ctx.message.reply_to_message.from;
        const analysis = await this.analyzeUser(targetUser.id, ctx.message.reply_to_message);
        const decision = this.makeDecision(analysis);

        return this.executeDecision(ctx, targetUser, decision);
    }

    async analyzeUser(userId, message) {
        const profile = this.brain.userProfiles.get(userId) || {};
        const messageAnalysis = await this.brain.analyzeContent(message.text);
        
        return {
            toxicity: this.calculateToxicity(messageAnalysis),
            spamScore: await this.calculateSpamScore(userId),
            warningCount: this.getWarningCount(userId),
            overallRisk: this.calculateRisk(profile, messageAnalysis)
        };
    }

    calculateToxicity(analysis) {
        let score = 0;
        
        // Check for toxic words
        if (analysis.tokens.some(token => 
            token.match(/anjing|babi|tolol|goblok|bangsat|kontol/)
        )) score += 2;

        // Check sentiment
        if (analysis.sentiment.score < -1) score += 1;
        if (analysis.sentiment.intensity > 1) score += 1;

        return score;
    }

    async calculateSpamScore(userId) {
        const profile = this.brain.userProfiles.get(userId);
        if (!profile) return 0;

        const recentMessages = profile.activityPattern.filter(
            activity => Date.now() - activity.timestamp < 60000 // Last minute
        ).length;

        return recentMessages > 5 ? 'high' : 'normal';
    }

    calculateRisk(profile, analysis) {
        let risk = 0;

        if (analysis.toxicity > 2) risk += 3;
        if (profile.warningCount > 2) risk += 2;
        if (analysis.spamScore === 'high') risk += 2;
        if (analysis.sentiment.score < -2) risk += 1;

        return risk;
    }

    makeDecision(analysis) {
        if (analysis.toxicity > 3) return 'ban';
        if (analysis.toxicity > 2) return 'kick';
        if (analysis.spamScore === 'high') return 'mute';
        if (analysis.warningCount > 2) return 'kick';
        return 'warn';
    }

    async executeDecision(ctx, targetUser, decision) {
        try {
            switch (decision) {
                case 'ban':
                    await ctx.kickChatMember(targetUser.id);
                    return "Udah gw banned permanent! Soalnya udah kelewatan banget 🚫";

                case 'kick':
                    await ctx.kickChatMember(targetUser.id, {
                        until_date: Math.floor(Date.now() / 1000) + 60
                    });
                    return "Done! Udah gw kick. Bisa join lagi nanti kalo udah tobat 👋";

                case 'mute':
                    await ctx.restrictChatMember(targetUser.id, {
                        can_send_messages: false,
                        until_date: Math.floor(Date.now() / 1000) + 3600
                    });
                    return "Udah gw mute 1 jam! Biar adem dulu 🤫";

                case 'warn':
                    this.addWarning(targetUser.id);
                    return "Gw kasih warning dulu ya! Next time auto kick 🚨";

                default:
                    return "Gw pantau aja dulu, belum perlu tindakan keras 👀";
            }
        } catch (error) {
            console.error(`Decision execution error: ${error}`);
            if (error.message.includes('rights')) {
                return "Duh sorry, gw butuh admin access dulu nih buat eksekusi 😅";
            }
            return "Ada error nih! Coba lagi ntar ya 🙏";
        }
    }

    addWarning(userId) {
        if (!this.warningSystem.has(userId)) {
            this.warningSystem.set(userId, {
                count: 0,
                history: []
            });
        }

        const warnings = this.warningSystem.get(userId);
        warnings.count++;
        warnings.history.push({
            timestamp: Date.now(),
            count: warnings.count
        });
    }

    getWarningCount(userId) {
        return (this.warningSystem.get(userId) && this.warningSystem.get(userId).count) || 0;
    }
}

/**
 * Natural Language Response Generator
 */
class ResponseGenerator {
    constructor(botBrain) {
        this.brain = botBrain;
        this.responseMemory = new Map();
    }

    async generateResponse(text, context) {
        const analysis = await this.brain.analyzeContent(text, context);
        return this.constructResponse(analysis, context);
    }

    async constructResponse(analysis, context) {
        // Generate dynamic response based on analysis and context
        const baseResponse = await this.createBaseResponse(analysis);
        const enhancedResponse = this.enhanceWithContext(baseResponse, context);
        return this.finalizeResponse(enhancedResponse, analysis);
    }

    async createBaseResponse(analysis) {
        if (analysis.intent.includes('greeting')) {
            return this.createGreetingResponse(analysis);
        }
        if (analysis.intent.includes('question')) {
            return this.createQuestionResponse(analysis);
        }
        return this.createConversationalResponse(analysis);
    }

    enhanceWithContext(response, context) {
        // Add contextual elements based on group patterns
        if (context.groupId) {
            const groupPatterns = this.brain.groupPatterns.get(context.groupId);
            if (groupPatterns) {
                response = this.adaptToGroupStyle(response, groupPatterns);
            }
        }
        return response;
    }

    finalizeResponse(response, analysis) {
        // Add final touches based on sentiment and style
        const mood = this.determineResponseMood(analysis);
        return this.styleResponse(response, mood);
    }

    determineResponseMood(analysis) {
        if (analysis.sentiment.score > 1) return 'enthusiastic';
        if (analysis.sentiment.score > 0) return 'positive';
        if (analysis.sentiment.score < -1) return 'concerned';
        if (analysis.sentiment.score < 0) return 'cautious';
        return 'neutral';
    }

    styleResponse(response, mood) {
        const emojis = {
            enthusiastic: ['🔥', '✨', '💫'],
            positive: ['😊', '👍', '💪'],
            concerned: ['😅', '🤔', '😩'],
            cautious: ['👀', '🤨', '🧐'],
            neutral: ['👌', '💭', '✌️']
        };

        const emoji = emojis[mood][Math.floor(Math.random() * emojis[mood].length)];
        return `${response} ${emoji}`;
    }

    adaptToGroupStyle(response, groupPatterns) {
        // Adapt language style based on group patterns
        const commonPhrases = Array.from(groupPatterns.vocabulary.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([phrase]) => phrase);

        commonPhrases.forEach(phrase => {
            if (Math.random() > 0.7) { // 30% chance to use each phrase
                response = response.replace(/\b(oke|baik|ya)\b/i, phrase);
            }
        });

        return response;
    }
}

// Initialize core systems
const botBrain = new EnhancedBotBrain();
const groupManager = new EnhancedGroupManager(botBrain);
const responseGenerator = new ResponseGenerator(botBrain);

// Message handler
bot.on('message', async (ctx) => {
    try {
        const message = ctx.message;
        const chat = ctx.chat;

        if (message.text) {
            const isGroup = chat.type === 'group' || chat.type === 'supergroup';
            let text = message.text;

            // Handle group commands
            if (isGroup && !text.startsWith('.bot')) return;
            if (isGroup) text = text.slice(4).trim();

            // Learn from the message
            const context = {
                isGroup,
                groupId: chat.id,
                userId: message.from.id,
                isReply: !!message.reply_to_message,
                messageType: 'text'
            };

            await botBrain.learn(message, context);

            // Handle decision requests
            if (message.reply_to_message && 
                text.match(/apain|gimana|handle|serah|terserah/i)) {
                return await groupManager.analyzeAndExecute(ctx);
            }

            // Generate response
            const response = await responseGenerator.generateResponse(text, context);
            
            return ctx.reply(response, {
                reply_to_message_id: message.message_id
            });
        }
    } catch (error) {
        console.error('Error:', error);
        ctx.reply("Waduh error nih! Coba lagi ntar ya 😅", {
            reply_to_message_id: ctx.message.message_id
        });
    }
});

// New member handler
bot.on('new_chat_members', async (ctx) => {
    try {
        const newMember = ctx.message.new_chat_members.find(
            member => member.id === ctx.botInfo.id
        );
        
        if (newMember) {
            const welcomeResponses = [
                "Hai semuanya! Gw bot yang bisa belajar dari interaksi kalian. Semakin sering kalian ngobrol, semakin pinter gw! 🧠",
                "Yo! Salam kenal semuanya! Gw bot AI yang bakal terus belajar dari chat kalian. Let's have fun! ✨",
                "Halo gaes! Gw bot yang bisa adaptasi sama gaya bahasa kalian. Makin sering interaksi, makin natural juga gw! 💫"
            ];

            const response = welcomeResponses[Math.floor(Math.random() * welcomeResponses.length)];
            await ctx.reply(response);
        }
    } catch (error) {
        console.error('Welcome message error:', error);
    }
});

// Error handler
bot.catch((err, ctx) => {
    console.error('Bot error:', err);
    ctx.reply("Duh sorry, error nih! Bentar ya gw reboot dulu 🔄");
});

// Start bot
bot.launch()
    .then(() => console.log('Enhanced Learning Bot is running! 🧠'))
    .catch(err => console.error('Failed to start bot:', err));

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
