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
    
    def download_paper_local(self, paper_id: str, version_id: str, destination_dir: str) -> str:
       
        try:
            prefix = f"papers/{paper_id}/{version_id}/"
            bucket = self.storage_client.bucket(self.bucket_name)
            
            blobs = list(bucket.list_blobs(prefix=prefix))
            
            pdf_blob = None
            for blob in blobs:
                if blob.name.lower().endswith(".pdf"):
                    pdf_blob = blob
                    break
            
            if not pdf_blob:
                self.logger.error(f"No PDF found in GCS for {prefix}")
                return None

            filename = os.path.basename(pdf_blob.name)
            local_path = os.path.join(destination_dir, filename)

            self.logger.info(f"⬇️ Downloading {pdf_blob.name} from GCS...")
            pdf_blob.download_to_filename(local_path)
            self.logger.info(f"✅ Downloaded to {local_path}")

            return local_path

        except Exception as e:
            self.logger.error(f"❌ Error downloading file from GCS: {e}")
            return None
        
    def upload_user_avatar(self, user_id: int, file_path: str, original_filename: str) -> str:
        """
        Upload user avatar to GCS path: users/{user_id}/assets/profile.{ext}
        """
        try:
            _, ext = os.path.splitext(original_filename)
            ext = ext.lower()
            
            if not ext:
                ext = ".jpg"

            destination_path = f"users/{user_id}/assets/profile{ext}"
            
            public_url = self.upload_blob(file_path, destination_path)
            
            if public_url:
                self.logger.info(f"✅ Avatar uploaded specifically for user {user_id}: {public_url}")
                return public_url
            else:
                return None

        except Exception as e:
            self.logger.error(f"❌ Error uploading avatar: {e}")
            return None

    def upload_generic_file(self, local_file_path: str, gcs_destination_path: str) -> str:
        try:
            if gcs_destination_path.endswith("/"):
                base_name = os.path.basename(local_file_path)
                final_path = f"{gcs_destination_path}{base_name}"
            else:
                final_path = gcs_destination_path

            public_url = self.upload_blob(local_file_path, final_path)
            
            if public_url:
                self.logger.info(f"✅ Generic file uploaded successfully: {public_url}")
                return public_url
            else:
                return None

        except Exception as e:
            self.logger.error(f"❌ Error in generic upload: {e}")
            return None

    def delete_file(self, file_url: str):
        try:
            
            if self.bucket_name not in file_url:
                self.logger.error(f"❌ URL does not belong to bucket {self.bucket_name}")
                return False

           
            blob_name = file_url.split(f"{self.bucket_name}/")[-1]
            
            from urllib.parse import unquote
            blob_name = unquote(blob_name)

            bucket = self.storage_client.bucket(self.bucket_name)
            blob = bucket.blob(blob_name)

            if blob.exists():
                blob.delete()
                self.logger.info(f"🗑️ Deleted blob: {blob_name}")
                return True
            else:
                self.logger.warning(f"⚠️ Blob not found to delete: {blob_name}")
                return False 

        except Exception as e:
            self.logger.error(f"❌ Error deleting file: {e}")
            return False
