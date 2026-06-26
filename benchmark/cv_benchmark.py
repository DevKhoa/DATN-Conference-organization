import os
import sys
import json
import glob
from pathlib import Path

# Thêm đường dẫn tới server/src để import trực tiếp các module có sẵn của bạn
SERVER_SRC_DIR = Path(__file__).resolve().parent.parent / "server" / "src"
sys.path.append(str(SERVER_SRC_DIR))

# Load biến môi trường từ server/.env nếu cần (utils.py đã có load_dotenv() nhưng cứ cẩn thận)
from dotenv import load_dotenv
load_dotenv(SERVER_SRC_DIR.parent / ".env")

# Sửa lại đường dẫn tương đối của Google Credentials vì file này chạy ở thư mục benchmark thay vì server
if "GOOGLE_APPLICATION_CREDENTIALS" in os.environ:
    cred_path = os.environ["GOOGLE_APPLICATION_CREDENTIALS"]
    if not os.path.isabs(cred_path):
        os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = str((SERVER_SRC_DIR / cred_path).resolve())

# Import các hàm xử lý cốt lõi từ dự án của bạn
from packages.utils import extract_text_from_pdf, clean_text, format_cv_profile, CV_RETRIEVER, genai_client, MODEL
from packages.schema import CVBaseModel

def process_cv_directory(directory_path: str, output_file: str):
    """
    Quét toàn bộ file PDF trong directory_path, trích xuất dữ liệu thô (RAW)
    và dùng LLM xử lý ra dữ liệu chuẩn (PROCESSED), sau đó lưu vào file JSON.
    """
    pdf_files = glob.glob(os.path.join(directory_path, "*.pdf"))
    print(f"🔍 Tìm thấy {len(pdf_files)} file PDF trong thư mục '{directory_path}'\n")
    
    results = []
    
    for pdf_path in pdf_files:
        filename = os.path.basename(pdf_path)
        print(f"⏳ Đang xử lý: {filename} ...")
        try:
            # 1. BƯỚC RAW: Đọc và dọn dẹp text thô từ PDF
            raw_text = extract_text_from_pdf(pdf_path)
            cleaned_text = clean_text(raw_text)
            
            if not cleaned_text.strip():
                print(f"  ❌ Cảnh báo: Không thể trích xuất chữ từ {filename} (Có thể là PDF ảnh)")
                continue
                
            # 2. BƯỚC PROCESSED: Đưa qua LLM để trích xuất & chuẩn hóa
            print("  🤖 Đang gọi LLM Inference...")
            response = genai_client.models.generate_content(
                model=MODEL, 
                contents=[CV_RETRIEVER, cleaned_text],
                config={
                    "response_mime_type": "application/json",
                    "response_json_schema": CVBaseModel.model_json_schema(),
                },
            )
            
            response_json = json.loads(response.text)
            processed_text = format_cv_profile(response_json)
            
            # 3. LƯU TRỮ CẶP RAW - PROCESSED
            results.append({
                "filename": filename,
                "raw_text": cleaned_text,       # Văn bản gốc để giám khảo đối chiếu
                "processed_text": processed_text # Văn bản AI làm ra để giám khảo chấm điểm
            })
            print(f"  ✅ Thành công!")
            
        except Exception as e:
            print(f"  ❌ Lỗi khi xử lý {filename}: {e}")
            
    # Ghi toàn bộ ra file JSON
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=4)
    print(f"\n🎉 Hoàn thành! Đã lưu kết quả tại: {output_file}")

if __name__ == "__main__":
    # Tự động tạo thư mục sample nếu chưa có
    sample_dir = os.path.join(os.path.dirname(__file__), "sample_cvs")
    output_json = os.path.join(os.path.dirname(__file__), "cv_benchmark_results.json")
    
    if not os.path.exists(sample_dir):
        os.makedirs(sample_dir)
        print(f"Đã tạo thư mục: {sample_dir}. Vui lòng copy 10-20 file PDF vào đây và chạy lại script.")
    else:
        process_cv_directory(sample_dir, output_json)
