const express = require("express");
const cors = require("cors");
const app = express();
const PORT = process.env.PORT || 8080;
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
// This is your test secret API key.
const stripe = require("stripe")(STRIPE_SECRET_KEY);

app.use(cors());
app.use(express.static("public"));
app.use(express.json());

const calculateOrderAmount = (items) => {
  return 1000;
};

const calculateConnectedDestinationAmount = (amount) => {
  return Math.floor(amount * 0.15);
}

app.get("/", (req, res) => {
  return res.send({ hello: 'worlds' })
})

app.post('/create-subscription', async (req, res) => {
  const customerId = req.body.customerId;
  const priceId = req.body.priceId;

  try {
    // Create the subscription. Note we're expanding the Subscription's
    // latest invoice and that invoice's payment_intent
    // so we can pass it to the front end to confirm the payment
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{
        price: priceId,
      }],
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      expand: ['latest_invoice.payment_intent'],
      transfer_data: {
        amount_percent: 15,
        destination: 'acct_1LSGuERVccEGysdI'
      }
    });

    res.send({
      subscriptionId: subscription.id,
      clientSecret: subscription.latest_invoice.payment_intent.client_secret,
    });
  } catch (error) {
    return res.status(400).send({ error: { message: error.message } });
  }
});

app.post("/create-payment-intent", async (req, res) => {
  const { items } = req.body;
  const { customer } = req.body;
  const amount = calculateOrderAmount(items);
  const { connectAccountId = 'acct_1LSGuERVccEGysdI' } = req.body;

  // Create a PaymentIntent with the order amount and currency
  const paymentIntent = await stripe.paymentIntents.create({
    amount: calculateOrderAmount(items),
    currency: "gbp",
    automatic_payment_methods: {
      enabled: true,
    },
    transfer_data: {
      amount: calculateConnectedDestinationAmount(amount),
      destination: connectAccountId,
    },
    customer
  });

  res.send({
    clientSecret: paymentIntent.client_secret,
  });
});

app.listen(PORT, () => console.log(`Node server listening on port ${PORT}!`));