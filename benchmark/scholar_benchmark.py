import os
import sys
import json
import re
import serpapi
from pathlib import Path

# Thêm đường dẫn tới server/src để import trực tiếp các module có sẵn của bạn
SERVER_SRC_DIR = Path(__file__).resolve().parent.parent / "server" / "src"
sys.path.append(str(SERVER_SRC_DIR))

# Load biến môi trường từ server/.env
from dotenv import load_dotenv
load_dotenv(SERVER_SRC_DIR.parent / ".env")

# Sửa lại đường dẫn tương đối của Google Credentials vì file này chạy ở thư mục benchmark thay vì server
if "GOOGLE_APPLICATION_CREDENTIALS" in os.environ:
    cred_path = os.environ["GOOGLE_APPLICATION_CREDENTIALS"]
    if not os.path.isabs(cred_path):
        os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = str((SERVER_SRC_DIR / cred_path).resolve())

# Import các hàm xử lý cốt lõi từ dự án của bạn
from packages.utils import SCHOLAR_PROMPT, genai_client, MODEL, SERP_API_KEY
from packages.schema import ScholarAuthor

def process_scholar_urls(urls: list[str], output_file: str):
    """
    Duyệt qua danh sách URL Scholar, lấy dữ liệu gốc từ SerpApi (RAW) 
    và dùng LLM xử lý ra dữ liệu suy luận chuyên ngành (PROCESSED), lưu vào JSON.
    """
    print(f"🔍 Bắt đầu xử lý {len(urls)} URL Google Scholar...\n")
    results = []
    
    for url in urls:
        print(f"⏳ Đang xử lý: {url}")
        try:
            # Trích xuất Author ID
            m = re.search(r"user=([^&]+)", url)
            author_id = m.group(1) if m else None
            
            if not author_id:
                print(f"  ❌ Lỗi: URL không hợp lệ (Không tìm thấy ID).")
                continue
                
            # 1. BƯỚC RAW: Lấy dữ liệu thô từ SerpApi
            print(f"  🌐 Đang cào dữ liệu SerpApi (Author ID: {author_id})...")
            params = {
                "engine": "google_scholar_author",
                "author_id": author_id,
                "api_key": SERP_API_KEY
            }
            api_response = serpapi.search(params)
            
            if 'error' in api_response:
                print(f"  ❌ Lỗi SerpApi: {api_response['error']}")
                continue
                
            author_info = api_response.get('author', {})
            articles_list = api_response.get('articles', [])
            
            author_name = author_info.get('name', 'Unknown')
            author_affiliations = author_info.get('affiliations', 'None')
            interests = [interest['title'] for interest in author_info.get('interests', [])]
            
            # Tổ chức dữ liệu RAW thành text để LLM giám khảo có thể đọc được dễ dàng
            raw_articles_info = [{'title': article.get('title'), 'venues': article.get('publication')} for article in articles_list]
            raw_text = f"Author Name: {author_name}\n" \
                       f"Affiliations: {author_affiliations}\n" \
                       f"Interests: {', '.join(interests)}\n\n" \
                       f"Articles Published:\n{json.dumps(raw_articles_info, indent=2)}"
            
            # 2. BƯỚC PROCESSED: Đưa qua LLM để suy luận lĩnh vực nghiên cứu (Inference)
            print("  🤖 Đang gọi LLM Inference suy luận chuyên môn...")
            articles_str = json.dumps(raw_articles_info, indent=2)
            
            response = genai_client.models.generate_content(
                model=MODEL,
                contents=[SCHOLAR_PROMPT, articles_str],
                config={
                    "response_mime_type": "application/json",
                    "response_json_schema": ScholarAuthor.model_json_schema(),
                },
            )
            
            research_bio = json.loads(response.text)
            
            # Định dạng thành Markdown chuẩn y hệt như trong backend
            articles_md = '\n'.join([
                f"- [{article.get('title', 'No title')}]({article.get('link', '#')}) — {article.get('publication', 'Unknown venue')}"
                for article in articles_list
            ])

            processed_text = f"""
## {author_name.upper()}

**Affiliations:** {author_affiliations}

### Research Interests
{', '.join(interests).title()}

### Research Fields
{'\n'.join([f"- {field}" for field in research_bio.get('research_fields', [])])}

### Research Directions
{'\n'.join([f"- {direction}" for direction in research_bio.get('research_directions', [])])}

### Research Themes
{'\n'.join([f"- {theme}" for theme in research_bio.get('research_themes', [])])}

### Articles
{articles_md}
            """.strip()
            
            # 3. LƯU TRỮ CẶP RAW - PROCESSED
            results.append({
                "url": url,
                "author_name": author_name,
                "raw_text": raw_text,       # Thông tin thô từ Scholar để giám khảo chấm điểm suy luận
                "processed_text": processed_text # Profile cuối cùng có sự can thiệp của AI
            })
            print(f"  ✅ Thành công (Tác giả: {author_name})")
            
        except Exception as e:
            print(f"  ❌ Lỗi khi xử lý URL {url}: {e}")
            
    # Ghi toàn bộ ra file JSON
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=4)
    print(f"\n🎉 Hoàn thành! Đã lưu kết quả tại: {output_file}")

if __name__ == "__main__":
    urls_file = os.path.join(os.path.dirname(__file__), "scholar_urls.txt")
    output_json = os.path.join(os.path.dirname(__file__), "scholar_benchmark_results.json")
    
    # Tự động tạo file mẫu nếu chưa có
    if not os.path.exists(urls_file):
        with open(urls_file, "w", encoding="utf-8") as f:
            f.write("https://scholar.google.com/citations?user=Y1Mow0AAAAAJ&hl=vi\n")
        print(f"Đã tạo file chứa link mẫu tại: {urls_file}")
        print("Vui lòng mở file này lên, dán các link Scholar vào (mỗi link 1 dòng) và chạy lại script.")
    else:
        # Đọc danh sách URL từ file text (mỗi dòng 1 URL)
        with open(urls_file, "r", encoding="utf-8") as f:
            sample_urls = [line.strip() for line in f if line.strip()]
            
        if not sample_urls:
            print(f"❌ File {urls_file} đang trống. Vui lòng thêm URL vào file và chạy lại.")
        else:
            process_scholar_urls(sample_urls, output_json)
