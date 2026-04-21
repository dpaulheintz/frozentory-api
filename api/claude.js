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

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' });
  }

  let systemPrompt;
  let messages;

  if (type === 'scan') {
    if (!image) {
      return res.status(400).json({ error: 'Missing "image" field for scan request' });
    }

    systemPrompt = 'You are a receipt and grocery item scanner. Extract all frozen food items from this image. For each item, provide: name, category, quantity (default 1 if not clear), and weight if visible. Categories are: beef, pork, chicken, fishSeafood, deerVenisonGame, frozenMeals, iceCreamDesserts, other. Respond ONLY in JSON format: { "items": [{ "name": "Pork Tenderloin", "category": "pork", "quantity": 2, "weight": "1.5 lbs" }] }';

    messages = [{
      role: 'user',
      content: [
        {
          type: 'image',
          source: {
            type: 'base64',
            media_type: 'image/jpeg',
            data: image,
          },
        },
        {
          type: 'text',
          text: 'Please scan this image and extract all frozen food items.',
        },
      ],
    }];

  } else {
    if (!item) {
      return res.status(400).json({ error: 'Missing "item" field for recipe request' });
    }

    systemPrompt = 'You are a professional chef and recipe creator. Generate a recipe based on the provided frozen food item and preferences. Respond ONLY in JSON format: { "title": "Recipe Title", "description": "Brief 1-2 sentence description", "difficulty": "Easy/Medium/Hard", "cookTime": "30 minutes", "servings": 4, "ingredients": ["1.5 lbs pork tenderloin (thawed)", "2 cloves garlic, minced"], "instructions": ["Preheat oven to 400°F.", "Season the pork tenderloin with..."], "proTips": ["For best results, thaw the meat overnight in the fridge."] }';

    const parts = [`Generate a recipe for: ${item}`];
    if (difficulty) parts.push(`Difficulty: ${difficulty}`);
    if (cookTime) parts.push(`Cook time preference: ${cookTime}`);
    if (servings) parts.push(`Servings: ${servings}`);
    if (cuisine) parts.push(`Cuisine style: ${cuisine}`);

    messages = [{
      role: 'user',
      content: parts.join('\n'),
    }];
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        system: systemPrompt,
        messages,
      }),
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
        error: 'Claude API error',
        details: errorBody,
      });
    }

    const data = await response.json();
    return res.status(200).json(data);

  } catch (error) {
    console.error('Error calling Claude API:', error);
    return res.status(500).json({ error: 'Internal server error', message: error.message });
  }
};
