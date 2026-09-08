require('dotenv').config();

export { baseUrl: `https://graph.facebook.com/${process.env.WHATSAPP_API_VERSION || 'v21.0' };`,
  phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
  accessToken: process.env.WHATSAPP_ACCESS_TOKEN
};
