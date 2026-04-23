const express = require('express');
const cors = require('cors');
const axios = require('axios');
const maresData = require('./mares.json');

const app = express();
app.use(cors());

// Rota para o Clima (Buscando da Open-Meteo)
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

// Rota para a Maré (Lendo do nosso JSON)
app.get('/mare', (req, res) => {
  const { id } = req.query; 
  const mare = maresData[id];
  
  if (mare) {
    res.json(mare);
  } else {
    res.status(404).json({ error: "Praia não encontrada" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT} 🚀`);
});