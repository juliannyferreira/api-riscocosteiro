const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(cors());

// Coordenadas das nossas praias para a Maré
const coordenadasPraias = {
  "1": { nome: "Pina", lat: -8.0944, lon: -34.8805 },
  "2": { nome: "Boa Viagem", lat: -8.1250, lon: -34.9011 },
  "3": { nome: "Piedade", lat: -8.1808, lon: -34.9163 }
};

// Rota para o Clima (Mantida igualzinha, pois já funciona perfeitamente)
app.get('/clima', async (req, res) => {
  const { lat, lon } = req.query;
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&hourly=relativehumidity_2m,apparent_temperature`;
    const response = await axios.get(url);
    
    const climaLimpo = {
      temperatura: response.data.current_weather.temperature,
      vento: response.data.current_weather.windspeed,
      umidade: response.data.hourly.relativehumidity_2m[0],
      sensacao: response.data.hourly.apparent_temperature[0],
      descricao: "Céu Limpo"
    };
    res.json(climaLimpo);
  } catch (error) {
    res.status(500).json({ error: "Erro ao buscar clima" });
  }
});

// NOVA Rota para a Maré (Agora buscando DADOS REAIS E GRATUITOS)
app.get('/mare', async (req, res) => {
  const { id } = req.query; 
  const praia = coordenadasPraias[id];
  
  if (!praia) {
    return res.status(404).json({ error: "Praia não encontrada" });
  }

  try {
    // Busca o nível do mar na Open-Meteo Marine (com fuso horário do Recife)
    const url = `https://marine-api.open-meteo.com/v1/marine?latitude=${praia.lat}&longitude=${praia.lon}&hourly=sea_level&timezone=America/Recife`;
    const response = await axios.get(url);
    
    const times = response.data.hourly.time;
    const levels = response.data.hourly.sea_level;
    
    // Descobre qual é a hora atual para pegar a maré de "AGORA"
    const now = new Date();
    let currentIndex = 0;
    let minDiff = Infinity;

    times.forEach((timeStr, index) => {
      const timeData = new Date(timeStr);
      const diff = Math.abs(timeData - now);
      if (diff < minDiff) {
        minDiff = diff;
        currentIndex = index;
      }
    });

    const mareAtual = levels[currentIndex];
    const tendencia = levels[currentIndex + 1] > mareAtual ? "Subindo" : "Baixando";

    // Procura na lista a próxima Maré Alta (Pico) e Baixa (Vale)
    let proximaAlta = "--:--";
    let proximaBaixa = "--:--";

    for (let i = currentIndex; i < levels.length - 1; i++) {
      const prev = levels[i - 1] || levels[i];
      const curr = levels[i];
      const next = levels[i + 1];

      // Se o nível atual é maior que o anterior e maior que o próximo = Alta
      if (proximaAlta === "--:--" && curr > prev && curr > next) {
        proximaAlta = times[i].split("T")[1]; // Pega só a hora (ex: 14:00)
      }
      // Se o nível atual é menor que o anterior e menor que o próximo = Baixa
      if (proximaBaixa === "--:--" && curr < prev && curr < next) {
        proximaBaixa = times[i].split("T")[1];
      }

      if (proximaAlta !== "--:--" && proximaBaixa !== "--:--") break;
    }

    // Envia os dados mastigados para o celular
    res.json({
      praia: praia.nome,
      mareAtual: mareAtual.toFixed(2), // Mostra com duas casas decimais
      tendencia: tendencia,
      proximaAlta: proximaAlta,
      proximaBaixa: proximaBaixa
    });

  } catch (error) {
    console.error("Erro na maré:", error);
    res.status(500).json({ error: "Erro ao buscar maré" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT} 🚀`);
});