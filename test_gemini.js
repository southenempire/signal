const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
  console.error("No key provided to test script");
  process.exit(1);
}
const prompt = "test";
const imageBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="; // 1x1 pixel

async function test() {
  const gemResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
          contents: [{
              parts: [
                  { text: prompt },
                  { inline_data: { mime_type: "image/jpeg", data: imageBase64 } }
              ]
          }]
      })
  });
  const gemData = await gemResponse.json();
  console.log(JSON.stringify(gemData, null, 2));
}
test();
