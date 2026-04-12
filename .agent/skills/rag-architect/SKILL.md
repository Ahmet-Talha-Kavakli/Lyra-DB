---
name: rag-architect
description: Best practices for Retrieval-Augmented Generation. Designing, implementing, and optimizing production-grade RAG pipelines.
---

# RAG Architect - POWERFUL

The RAG (Retrieval-Augmented Generation) Architect skill provides comprehensive tools and knowledge for designing, implementing, and optimizing production-grade RAG pipelines. This skill covers the entire RAG ecosystem from document chunking strategies to evaluation frameworks, enabling you to build scalable, efficient, and accurate retrieval systems.

## Core Competencies

### 3. Vector Database Selection
#### Pinecone
- Managed service: Fully hosted, auto-scaling
- Best for: Production applications, when managed service is preferred

#### Weaviate
- Open source: Self-hosted or cloud options available
- Best for: Complex data types, when GraphQL API is preferred

#### pgvector (PostgreSQL)
- SQL integration: Leverage existing PostgreSQL infrastructure
- Best for: When you already use PostgreSQL, need ACID compliance

### 4. Retrieval Strategies
#### Hybrid Retrieval
- Combination approach: Dense + sparse retrieval with score fusion
- Benefits: Combines semantic understanding with exact matching

#### Reranking
- Two-stage approach: Initial retrieval followed by reranking
- Benefits: Higher precision, can use more sophisticated models for final ranking

### 5. Query Transformation Techniques
#### HyDE (Hypothetical Document Embeddings)
- Approach: Generate hypothetical answer, embed answer instead of query
- Benefits: Improves retrieval by matching document style

#### Multi-Query Generation
- Approach: Generate multiple query variations, retrieve for each, merge results
- Benefits: Increases recall, handles query ambiguity

## Implementation Best Practices

### Development Workflow
1. Requirements gathering
2. Data analysis
3. Prototype development
4. Chunking optimization
5. Retrieval tuning
6. Evaluation setup
7. Production deployment

### Monitoring & Observability
- Query analytics: Track query patterns
- Retrieval metrics: Monitor precision, recall, and latency
- Generation quality: Track faithfulness and relevance
- Cost tracking: Monitor embedding and vector database costs
