const { Router } = require("express");
const { config } = require("dotenv");
config();
const routes = Router();

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const stripe = require("stripe")(STRIPE_SECRET_KEY);

routes.post("/:connectId/onboarding-link", async (req, res) => {
    const account = req.params.connectId;

    const accountLink = await stripe.accountLinks.create({
        account,
        refresh_url: 'https://stripe-demo-sndjoy.netlify.app/',
        return_url: 'https://stripe-demo-sndjoy.netlify.app/',
        type: 'account_onboarding',
    });

    return res.send({ accountLink });
})

module.exports = routes;