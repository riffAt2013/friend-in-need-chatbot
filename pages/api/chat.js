export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { query, session_id } = req.body; // Destructure session_id

  if (!query || !session_id) { // Check for session_id
    return res.status(400).json({ error: 'Query and session_id are required' });
  }

  try {
    const flaskResponse = await fetch('http://localhost:5000/chat', { // Your Flask backend URL
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      // Forward both query and session_id
      body: JSON.stringify({ query, session_id }),
    });

    if (!flaskResponse.ok) {
      // Forward error status/message from Flask if possible
      const errorData = await flaskResponse.json().catch(() => ({})); // Attempt to parse error
      console.error("Flask backend error:", flaskResponse.status, errorData);
      return res.status(flaskResponse.status).json({ error: errorData.error || 'Error from backend' });
    }

    const data = await flaskResponse.json();
    res.status(200).json(data); // Forward Flask response { "answer": "..." }

  } catch (error) {
    console.error('API route error:', error);
    res.status(500).json({ error: 'Internal Server Error in API route' });
  }
}