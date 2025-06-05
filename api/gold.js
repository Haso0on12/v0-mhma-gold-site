export default async function handler(req, res) {
  try {
    const response = await fetch("https://api.metalpriceapi.com/v1/latest?api_key=01b928f933da5df8aea4fa0eee5054cb&base=USD&currencies=XAU,SAR");
    const data = await response.json();

    const pricePerOunceUSD = 1 / data.rates.XAU;
    const sarRate = data.rates.SAR;
    const pricePerOunceSAR = pricePerOunceUSD * sarRate;
    const pricePerGram24K = pricePerOunceSAR / 31.1035;

    res.status(200).json({
      oz: pricePerOunceUSD.toFixed(2),
      "24": (pricePerGram24K).toFixed(2),
      "22": (pricePerGram24K * 0.916).toFixed(2),
      "21": (pricePerGram24K * 0.875).toFixed(2),
      "18": (pricePerGram24K * 0.750).toFixed(2)
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch gold prices" });
  }
}
