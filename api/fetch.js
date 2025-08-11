export default async function handler(req, res) {
  const url = req.query.url;

  if (!url) {
    return res.status(400).json({ error: 'Missing URL' });
  }

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      },
    });
    const text = await response.text();
    res.status(200).send(text);
  } catch (error) {
    res.status(500).json({ error: 'Fetch failed', details: error.message });
  }
}
