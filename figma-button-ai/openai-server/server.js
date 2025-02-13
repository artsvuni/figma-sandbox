require("dotenv").config();
const express = require("express");
const cors = require("cors");
const axios = require("axios");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.post("/generate", async (req, res) => {
  try {
    const { prompt } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: "Prompt is required" });
    }

    // Set OpenAI model
    const model = "gpt-3.5-turbo"; // Changed from "gpt-4o" to "gpt-3.5-turbo"

    // Send request to OpenAI API
    console.log(`Sending request to OpenAI: ${prompt}`);

    const openaiResponse = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: model,
        messages: [{ role: "user", content: prompt }],
      },
      {
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        },
      }
    );

    console.log("OpenAI full response:", JSON.stringify(openaiResponse.data, null, 2));

    // Ensure correct response handling
    if (!openaiResponse.data.choices || !openaiResponse.data.choices.length) {
      throw new Error("Invalid response from OpenAI");
    }

    // Extract message content from OpenAI response
    const chatMessage = openaiResponse.data.choices[0].message.content;
    res.json({ message: chatMessage });

  } catch (error) {
    console.error("OpenAI Error:", error.message);
    res.status(500).json({ error: "Error communicating with OpenAI" });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

