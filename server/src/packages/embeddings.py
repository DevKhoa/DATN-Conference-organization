from packages.utils import Logger, CHUNK_SIZE, CHUNK_OVERLAP,  embedding_model, supabase_client
from packages.utils import load_file_local, clean_documents

from typing import List

from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter


class EmbeddingPipeline:
    def __init__(self, chunk_size = CHUNK_SIZE, chunk_overlap = CHUNK_OVERLAP, embeddings = embedding_model, supabase= supabase_client):
        self.embeddings = embeddings
        self.supabase = supabase
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap
        self.logger = Logger()

    def split_documents(self, docs: List[Document]) -> List[Document]:
        try:
            text_splitter = RecursiveCharacterTextSplitter(
                chunk_size=self.chunk_size,
                chunk_overlap=self.chunk_overlap,
                separators=["\n\n", ".", "?", "!", " ", ""],
                length_function=len,
            )
            
            chunks = text_splitter.split_documents(docs)
            self.logger.info(f"Document splitted into {len(chunks)} chunks")
            return chunks
        except Exception as e:
            self.logger.error(f"Error when splitting document: {e}")
            return None
        
    def upload_chunk_data(self, chunks, paper_id, version_id):
        try:
            texts =[chunk.page_content for chunk in chunks]
            vectors = self.embeddings.embed_documents(texts)

            embedding_data = []
            for i, chunk in enumerate(chunks):
                embedding_data.append({
                    "chunk_index": i, 
                    "version_id": version_id,
                    "paper_id": paper_id,
                    "chunk_content": chunk.page_content,
                    "chunk_metadata": chunk.metadata,
                    "embedding": vectors[i]
                })

            self.supabase.table('paper_chunks').insert(embedding_data).execute()
            return True
        
        except Exception as e:
            self.logger.error(f"Failed to upload data for paper {paper_id} version {version_id}: {e}")
            return False
        
    def run_pipeline(self, paper_id, version_id, file_path):
        self.logger.info(f"Start embedding document for {paper_id}, version {version_id}, path {file_path}")
        try:
            docs = load_file_local(file_path)
            if docs:
                docs = clean_documents(docs) 
                chunks = self.split_documents(docs)

                if chunks:
                    upload_status = self.upload_chunk_data(chunks, paper_id, version_id)
                    if upload_status:
                        self.logger.info(f"Embedding document sucessfully")
                        return True
                    else:
                        return False

        except Exception as e:
            self.logger.error(f"Error when embedding documet {e}")
            return False

    def check_plagiarism_db(self, paper_id, version_id, threshold=0.8):
        self.logger.info(f"Checking plagiarism using DB chunks for Paper {paper_id} - Ver {version_id}")

        try:
           
            response = self.supabase.table("paper_chunks")\
                .select("chunk_index, chunk_content, embedding")\
                .eq("paper_id", paper_id)\
                .eq("version_id", version_id)\
                .order("chunk_index")\
                .execute()
            
            chunks = response.data

            if not chunks:
                return {"error": "No embeddings found. Please run Embedding pipeline first."}

            total_chunks = len(chunks)
            flagged_chunks = []
            
            self.logger.info(f"Found {total_chunks} chunks. Starting cross-check...")

            for chunk in chunks:
                current_vector = chunk['embedding']
                current_text = chunk['chunk_content']
                idx = chunk['chunk_index']

                rpc_res = self.supabase.rpc('match_all_chunks', {
                    'query_embedding': current_vector,
                    'match_threshold': threshold,
                    'match_count': 5, 
                    'filter_paper_id': None,
                    'filter_version_id': None
                }).execute()

                if rpc_res.data:
                    best_match = None
                    for match in rpc_res.data:
                        if str(match['paper_id']) != str(paper_id):
                            best_match = match
                            break
                    
                    if best_match:
                        flagged_chunks.append({
                            "input_chunk_index": idx,
                            "raw_text": current_text, 
                            "source_text": best_match['content'],
                            "source_chunk_inex": best_match['chunk_index'],
                            "source_paper_id": best_match['paper_id'],
                            "source_version_id": best_match['version_id'],
                            "source_similarity": best_match['similarity']
                        })

            plagiarism_percentage = (len(flagged_chunks) / total_chunks) * 100 if total_chunks > 0 else 0

            return {
                "total_chunks": total_chunks,
                "flagged_chunks_count": len(flagged_chunks),
                "plagiarism_percentage": round(plagiarism_percentage, 2),
                "details": flagged_chunks,
                "status": "WARNING" if plagiarism_percentage > 20 else "CLEAN"
            }

        except Exception as e:
            self.logger.error(f"DB Plagiarism Check Error: {e}")
            return {"error": str(e)}

    def check_plagiarism(self, file_path, threshold=0.8):
        self.logger.info(f"Checking plagiarism for file: {file_path}")
        
        docs = load_file_local(file_path)
        if not docs: 
            return {"error": "Cannot load file"}
        docs = clean_documents(docs)
        chunks = self.split_documents(docs)
        if not chunks: 
            return {"error": "No chunks created"}

        try:
            texts = [chunk.page_content for chunk in chunks]
            vectors = self.embeddings.embed_documents(texts)
        except Exception as e:
            self.logger.error(f"Embedding failed: {e}")
            return {"error": str(e)}

        flagged_chunks = []
        total_chunks = len(chunks)
        
        for i, vector in enumerate(vectors):
            try:
                response = self.supabase.rpc('match_all_chunks', {
                    'query_embedding': vector,
                    'match_threshold': threshold,
                    'match_count': 1,        
                    'filter_paper_id': None,
                    'filter_version_id': None
                }).execute()
                
                if response.data:
                    match = response.data[0]
                    flagged_chunks.append({
                        "input_chunk_index": i,
                        "raw_text": texts[i],           
                        "source_text": match['content'],
                        "source_paper_id": match['paper_id'],
                        "source_version_id": match['version_id'],
                        "source_similarity": match['similarity']
                    })
                    
            except Exception as e:
                self.logger.error(f"Error checking chunk {i}: {e}")

        plagiarism_percentage = (len(flagged_chunks) / total_chunks) * 100 if total_chunks > 0 else 0
        
        result = {
            "total_chunks": total_chunks,
            "flagged_chunks_count": len(flagged_chunks),
            "plagiarism_percentage": round(plagiarism_percentage, 2),
            "details": flagged_chunks,
            "status": "WARNING" if plagiarism_percentage > 20 else "CLEAN"
        }
        
        return result