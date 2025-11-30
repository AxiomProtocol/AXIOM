/**
 * Stripe Payment Processing for SWF Platform
 * Handles payments for courses, enterprise services, tokenization fees, and consulting
 */

const express = require('express');
const Stripe = require('stripe');
const { revenueManager } = require('./revenue-api');
const router = express.Router();

// Initialize Stripe with secret key
let stripe;
if (process.env.STRIPE_SECRET_KEY) {
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
        apiVersion: '2023-10-16'
    });
    console.log('Stripe initialized for revenue processing');
} else {
    console.log('STRIPE_SECRET_KEY not configured - using demo mode for revenue endpoints');
}

// Course pricing structure
const COURSE_PRICING = {
    'advanced-defi': {
        name: 'Advanced DeFi Strategies',
        price: 497,
        description: 'Master advanced DeFi strategies and yield farming techniques'
    },
    'real-estate-tokenization': {
        name: 'Real Estate Tokenization Mastery',
        price: 697,
        description: 'Complete guide to tokenizing real estate investments'
    },
    'enterprise-blockchain': {
        name: 'Enterprise Blockchain Integration',
        price: 1497,
        description: 'Corporate-level blockchain and DeFi implementation'
    },
    'wealth-sovereignty': {
        name: 'Wealth Sovereignty Bootcamp',
        price: 397,
        description: 'Build true financial independence through decentralized finance'
    }
};

// Enterprise service pricing
const ENTERPRISE_SERVICES = {
    'liquidity-management': {
        name: 'Corporate Liquidity Management',
        monthly_price: 15000,
        description: 'Professional DeFi liquidity management for corporations'
    },
    'treasury-operations': {
        name: 'Cross-Chain Treasury Operations',
        monthly_price: 25000,
        description: 'Multi-chain treasury management and optimization'
    },
    'tokenization-platform': {
        name: 'White-Label Tokenization Platform',
        monthly_price: 35000,
        description: 'Custom tokenization platform for enterprise clients'
    },
    'consulting-services': {
        name: 'DeFi Strategy Consulting',
        hourly_rate: 500,
        description: 'Expert DeFi strategy and implementation consulting'
    }
};

// Create payment intent for premium courses
router.post('/create-course-payment', async (req, res) => {
    if (!stripe) {
        return res.status(200).json({ 
            clientSecret: 'demo_client_secret_for_testing',
            amount: 497,
            courseName: 'Demo Course',
            description: 'Demo mode - Stripe not configured'
        });
    }

    try {
        const { courseId, userId, userEmail } = req.body;
        const course = COURSE_PRICING[courseId];

        if (!course) {
            return res.status(400).json({ error: 'Invalid course ID' });
        }

        const paymentIntent = await stripe.paymentIntents.create({
            amount: course.price * 100, // Convert to cents
            currency: 'usd',
            description: `SWF Course: ${course.name}`,
            metadata: {
                courseId,
                userId,
                userEmail,
                type: 'course_payment'
            }
        });

        res.json({
            clientSecret: paymentIntent.client_secret,
            amount: course.price,
            courseName: course.name,
            description: course.description
        });

        console.log(`Course payment intent created: ${course.name} - $${course.price}`);
    } catch (error) {
        console.error('Course payment intent error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Create payment for enterprise services
router.post('/create-enterprise-payment', async (req, res) => {
    if (!stripe) {
        return res.status(200).json({ 
            clientSecret: 'demo_client_secret_for_testing',
            amount: 15000,
            serviceName: 'Demo Enterprise Service',
            description: 'Demo mode - Stripe not configured'
        });
    }

    try {
        const { serviceId, companyName, contactEmail, customAmount } = req.body;
        const service = ENTERPRISE_SERVICES[serviceId];

        if (!service && !customAmount) {
            return res.status(400).json({ error: 'Invalid service or custom amount required' });
        }

        const amount = customAmount || service.monthly_price;

        const paymentIntent = await stripe.paymentIntents.create({
            amount: amount * 100, // Convert to cents
            currency: 'usd',
            description: service ? `SWF Enterprise: ${service.name}` : 'SWF Custom Enterprise Service',
            metadata: {
                serviceId: serviceId || 'custom',
                companyName,
                contactEmail,
                type: 'enterprise_payment'
            }
        });

        res.json({
            clientSecret: paymentIntent.client_secret,
            amount: amount,
            serviceName: service ? service.name : 'Custom Enterprise Service',
            description: service ? service.description : 'Custom enterprise DeFi service'
        });

        console.log(`Enterprise payment intent created: ${companyName} - $${amount}`);
    } catch (error) {
        console.error('Enterprise payment intent error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Process tokenization transaction fees
router.post('/process-tokenization-fee', async (req, res) => {
    if (!stripe) {
        const { transactionAmount } = req.body;
        const feeAmount = (transactionAmount * 3.0) / 100;
        return res.status(200).json({ 
            feeAmount: feeAmount,
            feePercentage: 3.0,
            originalAmount: transactionAmount,
            demo: true,
            message: 'Demo mode - fee calculated but not processed'
        });
    }

    try {
        const { tribeId, tribeName, transactionAmount, userWallet } = req.body;
        const feePercentage = 3.0;
        const feeAmount = (transactionAmount * feePercentage) / 100;

        if (feeAmount >= 1) { // Only process if fee is $1 or more
            const paymentIntent = await stripe.paymentIntents.create({
                amount: Math.round(feeAmount * 100), // Convert to cents
                currency: 'usd',
                description: `SWF Tokenization Fee: ${tribeName}`,
                metadata: {
                    tribeId,
                    tribeName,
                    originalAmount: transactionAmount,
                    feePercentage,
                    userWallet,
                    type: 'tokenization_fee'
                }
            });

            res.json({
                clientSecret: paymentIntent.client_secret,
                feeAmount: feeAmount,
                feePercentage: feePercentage,
                originalAmount: transactionAmount
            });
        } else {
            // For small amounts, just track the fee without processing payment
            await revenueManager.trackTokenizationFee(tribeId, tribeName, transactionAmount, userWallet, 'small_amount_waived');
            res.json({
                waived: true,
                feeAmount: feeAmount,
                message: 'Fee waived for small transactions'
            });
        }

        console.log(`Tokenization fee processed: ${tribeName} - $${feeAmount}`);
    } catch (error) {
        console.error('Tokenization fee processing error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Webhook to handle successful payments
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    if (!stripe) {
        return res.status(200).json({ received: true, demo: true });
    }

    const sig = req.headers['stripe-signature'];
    let event;

    try {
        event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
        console.error('Webhook signature verification failed:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === 'payment_intent.succeeded') {
        const paymentIntent = event.data.object;
        const { type, courseId, userId, serviceId, companyName, tribeId, tribeName } = paymentIntent.metadata;

        try {
            switch (type) {
                case 'course_payment':
                    const course = COURSE_PRICING[courseId];
                    await revenueManager.trackCoursePayment(
                        userId,
                        courseId,
                        course.name,
                        paymentIntent.amount / 100,
                        paymentIntent.id
                    );
                    break;

                case 'enterprise_payment':
                    const service = ENTERPRISE_SERVICES[serviceId];
                    await revenueManager.trackEnterpriseRevenue(
                        companyName,
                        service ? service.name : 'Custom Service',
                        paymentIntent.amount / 100,
                        { email: paymentIntent.metadata.contactEmail }
                    );
                    break;

                case 'tokenization_fee':
                    await revenueManager.trackTokenizationFee(
                        tribeId,
                        tribeName,
                        parseFloat(paymentIntent.metadata.originalAmount),
                        paymentIntent.metadata.userWallet,
                        paymentIntent.id
                    );
                    break;
            }

            console.log(`Payment successful: ${type} - $${paymentIntent.amount / 100}`);
        } catch (error) {
            console.error('Payment webhook processing error:', error);
        }
    }

    res.json({ received: true });
});

// Get available courses and pricing
router.get('/courses', (req, res) => {
    res.json(COURSE_PRICING);
});

// Get enterprise services and pricing
router.get('/enterprise-services', (req, res) => {
    res.json(ENTERPRISE_SERVICES);
});

module.exports = router;