const https = require('https');

const getSuggestions = (title, description) => {
  return new Promise((resolve, reject) => {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) return reject(new Error('No Gemini API key'));

    const prompt = `You are an AI assistant for a community help platform called Helplytics AI.
Analyze this help request and return ONLY a valid JSON object with no markdown, no code blocks, no explanation.

Title: "${title}"
Description: "${description}"

Return exactly this JSON structure:
{
  "category": "tech",
  "urgency": "medium",
  "tags": ["tag1", "tag2", "tag3"],
  "rewrite": "improved description here",
  "aiSummary": "one sentence summary here"
}

category must be one of: tech, design, career, health, legal, finance, education, other
urgency must be one of: low, medium, high`;

    const body = JSON.stringify({
      contents: [{
        parts: [{ text: prompt }]
      }],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 500,
      }
    });

    const options = {
      hostname: 'generativelanguage.googleapis.com',
      path: `/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);

          // Check for API errors
          if (parsed.error) {
            return reject(new Error(parsed.error.message || 'Gemini API error'));
          }

          const text = parsed?.candidates?.[0]?.content?.parts?.[0]?.text || '';
          if (!text) return reject(new Error('Empty response from Gemini'));

          // Strip any markdown code blocks
          const clean = text
            .replace(/```json\s*/gi, '')
            .replace(/```\s*/gi, '')
            .trim();

          // Extract JSON from response
          const jsonMatch = clean.match(/\{[\s\S]*\}/);
          if (!jsonMatch) return reject(new Error('No JSON found in response'));

          const result = JSON.parse(jsonMatch[0]);
          resolve(result);
        } catch (e) {
          reject(new Error('Failed to parse Gemini response: ' + e.message));
        }
      });
    });

    req.on('error', (e) => reject(new Error('Network error: ' + e.message)));
    req.setTimeout(15000, () => {
      req.destroy();
      reject(new Error('Gemini request timed out'));
    });

    req.write(body);
    req.end();
  });
};

module.exports = { getSuggestions };
