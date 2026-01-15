import os
from utils import Logger


class StorageClient:
    def __init__(self, client, bucket_name):
        self.bucket_name = bucket_name
        self.storage_client = client
        self.logger = Logger()
    
    def get_paper_files(self, paper_id: str, version_id: str = None):
        try:
        
            prefix = f"papers/{paper_id}/"
            
            if version_id:
                prefix = f"{prefix}{version_id}/"

            self.logger.info(f"🔍 Listing files with prefix: {prefix}")

            bucket = self.storage_client.bucket(self.bucket_name)
            blobs = bucket.list_blobs(prefix=prefix)

            file_list = []
            for blob in blobs:
                if blob.name.endswith("/"):
                    continue
                    
                file_info = {
                    "file_name": os.path.basename(blob.name),
                    "full_path": blob.name,
                    "public_url": blob.public_url, 
                    "size": blob.size,
                    "updated_at": blob.updated
                }
                file_list.append(file_info)

            self.logger.info(f"✅ Found {len(file_list)} files for paper_id: {paper_id}")
            return file_list

        except Exception as e:
            self.logger.error(f"❌ Error getting files: {e}")
            return []
        
    def upload_blob(self, file_path: str, destination_path: str) -> str:
        """
        Upload file to GCS and return Public URL
        """
        try:
            if not os.path.exists(file_path):
                self.logger.error(f"❌ File not found: {file_path}")
                return None

            self.logger.info(f"🚀 Starting upload: {file_path} -> gs://{self.bucket_name}/{destination_path}")

            bucket = self.storage_client.bucket(self.bucket_name)
            blob = bucket.blob(destination_path)

            blob.upload_from_filename(file_path)

            return blob.public_url

        except Exception as e:
            self.logger.error(f"❌ Unexpected error during upload: {e}")
            return None

    def upload_paper_storage(self, version_id, paper_id, file_path):
        try:
            base_name = os.path.basename(file_path)
            destination_path = f"papers/{paper_id}/{version_id}/{base_name}"
            public_url = self.upload_blob(file_path, destination_path)
            
            if public_url:
                self.logger.info(f"Paper uploaded successfully: {public_url}")
                return public_url 
            else:
                return None

        except Exception as e:
            self.logger.error(f"Error in upload wrapper: {e}")
            return None

    
