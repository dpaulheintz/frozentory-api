module.exports = async function handler(req, res) {
  // CORS headers for iOS app
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { type, image, item, difficulty, cookTime, servings, cuisine } = req.body || {};

  if (!type || (type !== 'scan' && type !== 'recipe')) {
    return res.status(400).json({ error: 'Missing or invalid "type" field. Must be "scan" or "recipe".' });
  }

  const apiKey = process.env.FrozeNventory_ChatGPT_Key;
  if (!apiKey) {
    return res.status(500).json({ error: 'FrozeNventory_ChatGPT_Key not configured' });
  }

  let model;
  let messages;

  if (type === 'scan') {
    if (!image) {
      return res.status(400).json({ error: 'Missing "image" field for scan request' });
    }

    model = 'gpt-4o';
    messages = [
      {
        role: 'system',
        content: 'You are a receipt and grocery item scanner. Extract all frozen food items from this image. For each item, provide: name, category, quantity (default 1 if not clear), and weight if visible. Categories are: beef, pork, chicken, fishSeafood, deerVenisonGame, frozenMeals, iceCreamDesserts, other. Respond ONLY in JSON format: { "items": [{ "name": "Pork Tenderloin", "category": "pork", "quantity": 2, "weight": "1.5 lbs" }] }',
      },
      {
        role: 'user',
        content: [
          {
            type: 'image_url',
            image_url: { url: `data:image/jpeg;base64,${image}` },
          },
          {
            type: 'text',
            text: 'Extract the frozen food items from this receipt or image.',
          },
        ],
      },
    ];

  } else {
    if (!item) {
      return res.status(400).json({ error: 'Missing "item" field for recipe request' });
    }

    model = 'gpt-4o-mini';
    messages = [
      {
        role: 'system',
        content: 'You are a professional chef and recipe creator. Generate a recipe based on the provided frozen food item and preferences. Respond ONLY in JSON format: { "title": "Recipe Title", "description": "Brief 1-2 sentence description", "difficulty": "Easy/Medium/Hard", "cookTime": "30 minutes", "servings": 4, "ingredients": ["1.5 lbs pork tenderloin (thawed)", "2 cloves garlic, minced"], "instructions": ["Preheat oven to 400°F.", "Season the pork tenderloin with..."], "proTips": ["For best results, thaw the meat overnight in the fridge."] }',
      },
      {
        role: 'user',
        content: `Generate a recipe using: ${item}. Difficulty: ${difficulty || 'Medium'}. Max cooking time: ${cookTime || '30 min'}. Servings: ${servings || 4}. Cuisine style: ${cuisine || 'American'}.`,
      },
    ];
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ model, messages }),
    });

    if (response.status === 429) {
      const retryAfter = response.headers.get('retry-after') || '60';
      return res.status(429).json({
        error: 'Rate limit exceeded',
        retryAfter: parseInt(retryAfter, 10),
      });
    }

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      return res.status(response.status).json({
        error: 'OpenAI API error',
        details: errorBody,
      });
    }

    const data = await response.json();
    const rawText = data.choices?.[0]?.message?.content;

    if (!rawText) {
      return res.status(500).json({ error: 'Empty response from OpenAI' });
    }

    // Strip markdown code fences if the model wrapped the JSON in ```json ... ```
    const cleaned = rawText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      console.error('Failed to parse OpenAI JSON response:', rawText);
      return res.status(500).json({ error: 'Could not parse OpenAI response as JSON', raw: rawText });
    }

    // Return the shape the iOS app expects
    if (type === 'scan') {
      // App expects: { items: [...] }
      return res.status(200).json({ items: parsed.items || [] });
    } else {
      // App expects: { recipe: { title, description, ingredients, instructions, proTips, ... } }
      return res.status(200).json({ recipe: parsed });
    }

  } catch (error) {
    console.error('Error calling OpenAI API:', error);
    return res.status(500).json({ error: 'Internal server error', message: error.message });
  }
};
