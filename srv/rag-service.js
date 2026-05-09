const cds = require('@sap/cds')

module.exports = class RagService extends cds.ApplicationService {

  async init() {

    this.on('askTickets', async (req) => {
      const { question } = req.data

      console.log(`\n[RAG] Question received: "${question}"`)

      // ── Step 1: Embed the question ──────────────────────────
      const questionEmbedding = await this._embed(question)
      console.log(`[RAG] Question embedded — vector length: ${questionEmbedding.length}`)

      // ── Step 2: Search HANA for similar tickets ─────────────
      const tickets = await this._searchHana(questionEmbedding)
      console.log(`[RAG] Retrieved ${tickets.length} similar tickets from HANA`)

      // ── Step 3: Build the grounded prompt ───────────────────
      const prompt = this._buildPrompt(question, tickets)
      console.log(`[RAG] Prompt assembled — sending to LLM`)

      // ── Step 4: Ask the LLM ─────────────────────────────────
      const answer = await this._askLLM(prompt)
      console.log(`[RAG] Answer received from LLM`)

      // ── Step 5: Return answer + sources ─────────────────────
      return {
        answer,
        sources: tickets.map(t => ({
          id    : t.ID,
          title : t.TITLE,
          score : t.SCORE
        }))
      }
    })

    return super.init()
  }

  // ────────────────────────────────────────────────────────────
  // EMBED — turn text into a vector using Ollama
  // ────────────────────────────────────────────────────────────
  async _embed(text) {
    const res = await fetch('http://localhost:11434/api/embeddings', {
      method : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body   : JSON.stringify({
        model : 'nomic-embed-text',
        prompt : text
      })
    })

    if (!res.ok) throw new Error(`Ollama embed failed: ${res.statusText}`)

    const data = await res.json()
    return data.embedding  // float array — 768 numbers
  }

  // ────────────────────────────────────────────────────────────
  // SEARCH HANA — find top 3 most similar tickets
  // ────────────────────────────────────────────────────────────
  async _searchHana(embedding) {
    const db = await cds.connect.to('db')

    const result = await db.run(`
      SELECT TOP 3
        ID,
        TITLE,
        DESCRIPTION,
        STATUS,
        PRIORITY,
        COSINE_SIMILARITY(
          TO_REAL_VECTOR(EMBEDDING),
          TO_REAL_VECTOR(?)
        ) AS SCORE
      FROM SAP_SUPPORT_TICKETS
      ORDER BY SCORE DESC
    `, [JSON.stringify(embedding)])

    return result
  }

  // ────────────────────────────────────────────────────────────
  // BUILD PROMPT — inject tickets as context for the LLM
  // ────────────────────────────────────────────────────────────
  _buildPrompt(question, tickets) {
    const context = tickets.map((t, i) => `
[Ticket ${i + 1}]
ID         : ${t.ID}
Title      : ${t.TITLE}
Description: ${t.DESCRIPTION}
Status     : ${t.STATUS}
Priority   : ${t.PRIORITY}
Similarity : ${parseFloat(t.SCORE).toFixed(4)}
    `).join('\n')

    return `You are a helpful SAP support agent.
Your job is to answer the user's question using ONLY the SAP support tickets provided below.
If the answer cannot be found in the tickets, say "I could not find relevant information in the available tickets."
Do not make up information. Always refer to specific ticket details in your answer.

CONTEXT — SAP Support Tickets:
${context}

USER QUESTION:
${question}

ANSWER:`
  }

  // ────────────────────────────────────────────────────────────
  // ASK LLM — send the grounded prompt to Ollama llama3.2
  // ────────────────────────────────────────────────────────────
  async _askLLM(prompt) {
    const res = await fetch('http://localhost:11434/api/generate', {
      method : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body   : JSON.stringify({
        model  : 'llama3.2',
        prompt : prompt,
        stream : false
      })
    })

    if (!res.ok) throw new Error(`Ollama generate failed: ${res.statusText}`)

    const data = await res.json()
    return data.response
  }
}