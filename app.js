const express = require("express");
const cors = require("cors");
const randomWords = require("random-words");
const { config } = require("dotenv");
config();
const app = express();
const { errorMiddleware } = require("./middleware/errorMiddleware");
const PORT = process.env.PORT || 8080;
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const STRIPE_CONNECT_ACCOUNT = process.env.STRIPE_CONNECT_ACCOUNT;
const CALLBACK_URL = process.env.CALLBACK_URL || "http://localhost:5173";
// This is your test secret API key.
const stripe = require("stripe")(STRIPE_SECRET_KEY);
const ConnectedAccountsRoutes = require("./routes/connectedAccounts");

app.use(cors());
app.use(express.static("public"));
app.use(express.json());

const calculateOrderAmount = (items) => {
    return 500;
};

const calculateConnectedDestinationAmount = (amount) => {
    return Math.floor(amount * 0.15);
};

app.get("/", (req, res) => {
    return res.send({ hello: "worlds" });
});

app.post("/create-subscription", async (req, res) => {
    const customerId = req.body.customerId;
    const priceId = req.body.priceId;

    try {
        // Create the subscription. Note we're expanding the Subscription's
        // latest invoice and that invoice's payment_intent
        // so we can pass it to the front end to confirm the payment
        const subscription = await stripe.subscriptions.create({
            customer: customerId,
            items: [
                {
                    price: priceId,
                },
            ],
            payment_behavior: "default_incomplete",
            payment_settings: {
                save_default_payment_method: "on_subscription",
            },
            expand: ["latest_invoice.payment_intent"],
            transfer_data: {
                amount_percent: 15,
                destination: STRIPE_CONNECT_ACCOUNT,
            },
        });

        res.send({
            subscriptionId: subscription.id,
            clientSecret:
                subscription.latest_invoice.payment_intent.client_secret,
        });
    } catch (error) {
        return res.status(400).send({ error: { message: error.message } });
    }
});

app.post("/create-payment-intent", async (req, res) => {
    const { items } = req.body;
    const {
        customer,
        email = "",
        name = "",
        amount = calculateOrderAmount(items),
    } = req.body;
    const { connectAccountId = STRIPE_CONNECT_ACCOUNT } = req.body;
    const { currency = "eur" } = req.body;

    // Create a PaymentIntent with the order amount and currency
    const paymentIntent = await stripe.paymentIntents.create({
        amount: Number(amount),
        currency,
        automatic_payment_methods: {
            enabled: true,
        },
        transfer_data: {
            amount: calculateConnectedDestinationAmount(amount),
            destination: connectAccountId,
        },
        customer,
        description: `${name} - ${email}`,
        metadata: {
            name,
            email,
        },
    });
    console.log("payment intent: ", paymentIntent);

    res.send({
        clientSecret: paymentIntent.client_secret,
        paymentIntent,
    });
});
app.post("/create-payment-intent-on-behalf-of", async (req, res) => {
    const { items } = req.body;
    const { customer, email = "", name = "" } = req.body;
    const amount = calculateOrderAmount(items);
    const { connectAccountId = STRIPE_CONNECT_ACCOUNT } = req.body;
    const { currency = "eur" } = req.body;

    console.log("connectAccountId: ", connectAccountId);
    console.log("customer: ", customer);
    console.log("email: ", email);
    console.log("currency: ", currency);

    // Create a PaymentIntent with the order amount and currency
    const paymentIntent = await stripe.paymentIntents.create({
        amount,
        currency,
        automatic_payment_methods: {
            enabled: true,
        },
        on_behalf_of: connectAccountId,
        customer,
        description: `${name} - ${email}`,
        metadata: {
            name,
            email,
        },
    });

    res.send({
        clientSecret: paymentIntent.client_secret,
    });
});

app.post("/charged-saved-payment-method", async (req, res, next) => {
    try {
        const { customer } = req.body;
        const { amount = 1000 } = req.body;
        const id = randomWords({ exactly: 2, join: "-" });
        const paymentMethods = await stripe.customers
            .listPaymentMethods(customer, { type: "card" })
            .catch((e) => {
                throw e;
            });
        console.log("payment methods: ", paymentMethods);
        if (paymentMethods.data.length === 0) {
            throw new Error("customer doesn't have any payment methods");
        }

        // Create a PaymentIntent with the order amount and currency
        const paymentIntent = await stripe.paymentIntents
            .create({
                amount,
                currency: "gbp",
                confirm: true,
                customer,
                payment_method: paymentMethods.data[0].id,
                off_session: true,
                description: `Payment - ${id}`,
            })
            .catch((e) => {
                throw e;
            });

        res.send({
            paymentName: id,
            clientSecret: paymentIntent.client_secret,
        });
    } catch (error) {
        next(error);
    }
});

app.post("/create-payment-intent-hold", async (req, res) => {
    const { amount = 1000 } = req.body;
    const { customer } = req.body;
    const { connectAccountId = STRIPE_CONNECT_ACCOUNT } = req.body;

    // Create a PaymentIntent with the order amount and currency
    const paymentIntent = await stripe.paymentIntents.create({
        amount,
        currency: "gbp",
        payment_method_types: ["card"],
        capture_method: "manual",
        setup_future_usage: "off_session",
        customer,
    });

    res.send({
        clientSecret: paymentIntent.client_secret,
    });
});

app.post("/confirm-hold/:intent", async (req, res) => {
    try {
        const { intent } = req.params;

        const { amount = 1000 } = req.body;
        // Create a PaymentIntent with the order amount and currency
        const paymentIntent = await stripe.paymentIntents.capture(intent, {
            amount_to_capture: amount,
        });

        res.send({
            clientSecret: paymentIntent.client_secret,
        });
    } catch (error) {
        console.log("error: ", error);
        res.status(400).send({ error: error.message });
    }
});

app.delete("/refund-payment-with-connect", async (req, res) => {
    try {
        const { chargeId = null, paymentIntentId = null } = req.body;
        // Create a PaymentIntent with the order amount and currency
        const refund = await stripe.refunds.create({
            metadata: {
                orderId: "6735",

            },
            payment_intent: paymentIntentId,
            reverse_transfer: true,
            reason: "requested_by_customer",
            refund_application_fee: true,
        });
        res.send({
            refund,
        });
    } catch (error) {
        console.log("error: ", error);
        res.status(400).send({ error: error.message });
    }
});

app.post('/create-subscription-checkout-session', async (req, res) => {
    const prices = await stripe.prices.list({
        lookup_keys: [req.body.lookup_key],
        expand: ['data.product'],
    });
    let createSessionData = {
        billing_address_collection: 'auto',
        line_items: [
            {
                price: prices.data[0].id,
                // For metered billing, do not pass quantity
                quantity: 1,

            },
        ],
        mode: 'subscription',
        success_url: `${CALLBACK_URL}/?success=true&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${CALLBACK_URL}?canceled=true`,
    }
    if (req.body?.customer) {
        createSessionData.customer = req.body.customer;
    }
    const session = await stripe.checkout.sessions.create(createSessionData);

    console.log("session: ", JSON.stringify(session, null, 2));

    res.send({ paymentLink: session.url, lookupKey: req.body.lookup_key });
});

app.post('/create-one-time-checkout-session', async (req, res) => {
    const prices = await stripe.prices.list({
        lookup_keys: [req.body.lookup_key],
        expand: ['data.product'],
    });
    let createSessionData = {
        billing_address_collection: 'auto',
        line_items: [
            {
                price: prices.data[0].id,
                // For metered billing, do not pass quantity
                quantity: 1,

            },
        ],
        mode: 'payment',
        success_url: `${CALLBACK_URL}/?success=true&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${CALLBACK_URL}?canceled=true`,
    }
    if (req.body?.customer) {
        createSessionData.customer = req.body.customer;
    }
    const session = await stripe.checkout.sessions.create(createSessionData);

    console.log("session: ", JSON.stringify(session, null, 2));

    res.send({ paymentLink: session.url, lookupKey: req.body.lookup_key });
});


app.use("/connect", ConnectedAccountsRoutes);
app.use(errorMiddleware);

app.listen(PORT, () => console.log(`Node server listening on port ${PORT}!`));
