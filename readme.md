# SAP AI Week 3 — CAP + LLM + Embeddings + HANA Cloud

## What This Project Does
A CAP Node.js service deployed on SAP BTP that demonstrates
two core Gen AI integration patterns for enterprise SAP systems.

## Build 1 — LLM Chat via CAP
Ask any question in plain English and get an LLM response
flowing through a CAP OData action.

- CAP action receives natural language question
- Ollama llama3.2 generates the answer
- Response returned via OData

## Build 2 — Semantic Search with Embeddings + HANA Cloud
Search SAP support tickets by meaning — not by keywords.
"billing document not clearing" finds "GR IR account not clearing"
even though the words are completely different.

- Text converted to vectors via nomic-embed-text
- Vectors stored in SAP HANA Cloud embedding column
- HANA COSINE_SIMILARITY() finds semantically similar tickets
- Results ranked by similarity score

## Coming in Week 4 — RAG
Combining Build 1 and Build 2:
- HANA finds relevant tickets semantically
- LLM reads them and generates a human answer
- Grounded in real SAP historical data

## Tech Stack
- SAP CAP Node.js
- SAP HANA Cloud (BTP Trial)
- Ollama (local AI runtime)
- llama3.2 (LLM model)
- nomic-embed-text (embedding model)
- Cloud Foundry (BTP deployment)
- XSUAA (authentication)

## Architecture
User question
      ↓
CAP OData action (srv/)
      ↓
Ollama embedding model (localhost:11434)
      ↓
HANA COSINE_SIMILARITY search
      ↓
Ranked results returned

## How to Run Locally
- Install dependencies: npm install
- Start Ollama: ollama serve
- Pull models:
    ollama pull llama3.2
    ollama pull nomic-embed-text
- Bind HANA: cds bind -2 sap-ai-week3-db
- Run: cds watch

## How to Deploy to BTP
- Build: cds build
- Deploy: cf push

## API Endpoints
- POST /odata/v4/chat/ask
- POST /odata/v4/search/Tickets
- POST /odata/v4/search/generateEmbedding
- POST /odata/v4/search/semanticSearch

## Week 3 Learning Outcomes
- Understood difference between LLM and embedding model
- Built semantic search on real HANA Cloud
- Deployed CAP + HANA + XSUAA to BTP Cloud Foundry
- Understood RAG foundation — retrieval without generation