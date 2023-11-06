curl https://api.stripe.com/v1/transfers \
  -u "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:" \
  -d amount=900 \
  -d currency=eur \
  -d source_transaction="ch_3NlVx9FOS4sWgoAt0exnUJ6h" \
  -d destination="acct_1MjNHNFavSWD9tKq"

  curl https://api.stripe.com/v1/accounts \
  -u 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: \
  -d type=custom \
  -d country=GB \
  --data-urlencode email="medandreatorres@gmail.com" \
  -d "tos_acceptance[date]"=1695809903 \
  -d "tos_acceptance[ip]"="90.160.218.31" \
  -d "capabilities[transfers][requested]"=true \
  -d "tos_acceptance[service_agreement]"="recipient"

  curl https://api.stripe.com/v1/accounts \
  -u pk: \
  -d type=custom \
  -d country=GB \
  --data-urlencode email="elon@musk.com" \
  -d "tos_acceptance[date]"=1695809903 \
  -d "tos_acceptance[ip]"="90.160.218.31" \
  -d "capabilities[transfers][requested]"=true \
  -d "tos_acceptance[service_agreement]"="recipient"

  curl https://api.stripe.com/v1/accounts \
  -u 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: \
  -d type=custom \
  -d country=US \
  --data-urlencode email="cjameshill@gmail.com" \
  -d "tos_acceptance[date]"=1695809903 \
  -d "tos_acceptance[ip]"="90.160.218.31" \
  -d "capabilities[card_payments][requested]"=true \
  -d "capabilities[transfers][requested]"=true

  curl https://api.stripe.com/v1/accounts \
  -u "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:" \
  -d country=ES \
  -d type=custom \
  --data-urlencode email="cjameshill@me.com" \
  -d "capabilities[transfers][requested]"=true \
  -d "tos_acceptance[service_agreement]"=recipient