DROP TABLE IF EXISTS Paper_Chunks CASCADE;
DROP FUNCTION IF EXISTS match_paper_chunks;


-- Table to store vector embededings of table
CREATE TABLE Paper_Chunks (
    id SERIAL PRIMARY KEY, 
    
    chunk_index INT NOT NULL, 
    
    version_id INT REFERENCES Paper_Versions(version_id) ON DELETE CASCADE,
    paper_id INT REFERENCES Papers(paper_id) ON DELETE CASCADE,
    
    chunk_content TEXT NOT NULL,
    chunk_metadata JSONB DEFAULT '{}'::jsonb,
    
    embedding vector(1536), 
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE (version_id, chunk_index)
);

CREATE INDEX ON Paper_Chunks USING hnsw (embedding vector_cosine_ops);
CREATE INDEX ON Paper_Chunks (version_id);
CREATE INDEX ON Paper_Chunks (paper_id);


-- pg_vector search function
CREATE OR REPLACE FUNCTION match_paper_chunks (
  query_embedding vector(1536), 
  match_threshold float,
  match_count int,
  filter_paper_id int DEFAULT NULL,
  filter_version_id int DEFAULT NULL
)
RETURNS TABLE (
  id int,          
  chunk_index int,   
  content text,
  metadata jsonb,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    pc.id,
    pc.chunk_index,
    pc.chunk_content as content,
    pc.chunk_metadata as metadata,
    1 - (pc.embedding <=> query_embedding) as similarity
  FROM Paper_Chunks pc
  WHERE 1 - (pc.embedding <=> query_embedding) > match_threshold
  AND (filter_paper_id IS NULL OR pc.paper_id = filter_paper_id)
  AND (filter_version_id IS NULL OR pc.version_id = filter_version_id)
  ORDER BY pc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;