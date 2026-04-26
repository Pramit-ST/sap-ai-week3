const cds = require('@sap/cds')

async function getEmbedding(text) {
  const response = await fetch('http://localhost:11434/api/embeddings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'nomic-embed-text',
      prompt: text
    })
  })
  if (!response.ok) throw new Error(`Ollama error: ${response.statusText}`)
  const data = await response.json()
  return data.embedding
}

module.exports = cds.service.impl(async function () {
  const { Tickets } = this.entities

  // Action 1 — generate and store embedding for one ticket
  this.on('generateEmbedding', async (req) => {
    const { ID } = req.data

    console.log('generateEmbedding called for:', ID)

    const db = await cds.connect.to('db')

    const ticket = await db.run(
      SELECT.one.from('sap.support.Tickets').where({ ID })
    )

    if (!ticket) return req.error(404, `Ticket ${ID} not found`)

    const text = `${ticket.title}. ${ticket.description}`
    const vector = await getEmbedding(text)
    const vectorString = JSON.stringify(vector)

    await db.run(
      UPDATE('sap.support.Tickets')
        .set({ embedding: vectorString })
        .where({ ID })
    )

    console.log('Embedding saved for:', ticket.title)
    return `Embedding generated for: ${ticket.title}`
  })

  // Action 2 — semantic search
  this.on('semanticSearch', async (req) => {
    const { query, topK = 5 } = req.data

    if (!query) return req.error(400, 'Query is required')

    console.log('semanticSearch called for:', query)

    let queryVector
    try {
      queryVector = await getEmbedding(query)
    } catch (err) {
      return req.error(502, `Embedding error: ${err.message}`)
    }

    const db = await cds.connect.to('db')
    const vectorString = JSON.stringify(queryVector)

    const results = await db.run(`
      SELECT TOP ${Number(topK)}
        ID,
        TITLE,
        COSINE_SIMILARITY(
          TO_REAL_VECTOR(EMBEDDING),
          TO_REAL_VECTOR('${vectorString}')
        ) AS SCORE
      FROM SAP_SUPPORT_TICKETS
      WHERE EMBEDDING IS NOT NULL
      ORDER BY SCORE DESC
    `)

    if (results.length === 0) return []

    return results.map(row => ({
      ID:    row.ID,
      title: row.TITLE,
      score: Math.round(row.SCORE * 1000) / 1000
    }))
  })
})