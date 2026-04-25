const cds = require('@sap/cds')

module.exports = cds.service.impl(async function () {

  this.on('ask', async (req) => {
    const { question } = req.data

    if (!question) return req.error(400, 'Please provide a question')

    const response = await fetch('http://localhost:11434/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama3.2',
        messages: [
          { role: 'system', content: 'You are a helpful assistant.' },
          { role: 'user',   content: question }
        ],
        stream: false
      })
    })

    if (!response.ok) {
      return req.error(502, `Ollama error: ${response.statusText}`)
    }

    const data = await response.json()
    return data.message.content
  })

})