import sqlite3
import os
import re
import traceback
import json
from datetime import datetime

# Configuration
SHEET_ID = '1qPfxy3ZF6ZISgPxRwNVYvHC9Qj57lgMeTd_FjN8cdF8'
R2_DOMAIN = 'https://img.822shop.com' # Cloudflare R2 custom domain

def find_service_account():
    """Service account 파일을 여러 경로에서 찾습니다 (로컬 및 Railway 대응)"""
    possible_paths = [
        os.path.join(os.getcwd(), 'service_account.json'),
        os.path.join(os.getcwd(), 'catalog_app_v2', 'server', 'service_account.json'),
        os.path.join(os.path.dirname(__file__), 'service_account.json'),
        os.path.join(os.path.dirname(__file__), '..', '..', 'service_account.json'),
        'service_account.json'
    ]
    for p in possible_paths:
        if os.path.exists(p):
            print(f"  [Init] Found service account at: {p}")
            return p
    return 'service_account.json' # Default fallback

SERVICE_ACCOUNT_FILE = find_service_account()

def extract_drive_id(text):
    if not text or str(text).lower() == 'nan': return None
    match = re.search(r'(?:id=|[d]/|file/d/|document/d/|folders/d/)([a-zA-Z0-9-_]{25,})', str(text))
    return match.group(1) if match else str(text).strip()

def fetch_from_google_sheets():
    print("Fetching data from Google Sheets (Index-based Dual Sheets)...")
    try:
        import gspread
        import json
        from google.oauth2.service_account import Credentials
        scopes = ["https://www.googleapis.com/auth/spreadsheets", "https://www.googleapis.com/auth/drive"]
        
        sa_json = os.environ.get('GOOGLE_SERVICE_ACCOUNT')
        if sa_json:
            creds = Credentials.from_service_account_info(json.loads(sa_json), scopes=scopes)
        else:
            creds = Credentials.from_service_account_file(SERVICE_ACCOUNT_FILE, scopes=scopes)
        client = gspread.authorize(creds)
        sh = client.open_by_key(SHEET_ID)
        
        # [NEW] '상품목록' 시트가 존재하지 않으면 사입품목 헤더를 그대로 복제하여 자동 생성
        worksheets = sh.worksheets()
        titles = [ws.title for ws in worksheets]
        if '상품목록' not in titles:
            try:
                print("  [Init] '상품목록' 시트를 발견하지 못했습니다. 자동 초기화 중...")
                source_ws = sh.worksheet('사입품목')
                headers = source_ws.row_values(1)
                new_ws = sh.add_worksheet(title='상품목록', rows=1000, cols=max(len(headers) + 5, 26))
                new_ws.append_row(headers)
                print("  [Init] '상품목록' 워크시트 자동 생성 및 헤더 동기화 성공!")
                # 새로 만들어졌으므로 워크시트 리스트 재갱신
                worksheets = sh.worksheets()
            except Exception as e:
                print(f"  [Warning] '상품목록' 시트 자동 생성 중 예외 발생: {e}")
        
        product_rows = []
        order_rows = []
        for ws in worksheets:
            # 사입품목(구형/사입용) 및 상품목록(신형/판매용) 두 곳 모두에서 긁어와 병합(Union)
            if ws.title in ['사입품목', '상품목록']:
                try:
                    data = ws.get_all_values()
                    if len(data) > 1:
                        product_rows.extend(data[1:])
                        print(f"  [INFO] Loaded {len(data)-1} product rows from: {ws.title}")
                except Exception as e:
                    print(f"  [Error] in product worksheet '{ws.title}': {e}")
            elif ws.title == '주문내역':
                try:
                    data = ws.get_all_values()
                    if len(data) > 1:
                        order_rows.extend(data[1:])
                        print(f"  [INFO] Loaded {len(data)-1} order rows from: {ws.title}")
                except Exception as e:
                    print(f"  [Error] in order worksheet '{ws.title}': {e}")
            elif ws.title == '등록고객':
                try:
                    data = ws.get_all_values()
                    if len(data) > 1:
                        customer_rows = data[1:]
                        print(f"  [INFO] Loaded {len(data)-1} customer rows from: {ws.title}")
                except Exception as e:
                    print(f"  [Error] in customer worksheet '{ws.title}': {e}")
        
        return product_rows, order_rows, globals().get('customer_rows', [])
    except Exception as e:
        print(f"Failed to fetch Google Sheets: {e}")
    return [], [], []

import sys

def migrate(target_code=None):
    if target_code:
        print(f"Starting partial migration for code: {target_code}")
    else:
        print("Starting robust migration (Index 0 = Code)...")
        
    try:
        product_rows, order_rows, customer_rows = fetch_from_google_sheets()
        if not product_rows and not order_rows and not customer_rows: return

        def get_col(row, idx):
            return str(row[idx]).strip() if idx < len(row) else ''

        def is_real_product(row):
            code = get_col(row, 0)
            image_file_id = get_col(row, 20)  # T열 (19)
            img_id = extract_drive_id(image_file_id)
            
            # [NEW] A열(상품코드)이 빈 칸인 신규 사입 상품에 대해서도 
            # 구글 드라이브 이미지 ID가 존재한다면 유효한 '도착 예정' 상품으로 허용합니다.
            is_temp = False
            if not code or code.lower() == 'nan' or len(code) > 20: 
                if img_id and len(img_id) >= 10:
                    is_temp = True
                else:
                    return False
            
            if not is_temp and any(x in code for x in ['/', 'http', 'id=']): 
                return False
            
            # 숫자 코드를 가진 행에 대해서만 정밀 체크
            is_digit_code = code.replace('.0', '').isdigit() if not is_temp else False
            
            # 부분 동기화 시, 해당 코드만 필터링
            if target_code and not is_temp and str(code).replace('.0', '') != str(target_code):
                return False

            price_raw = get_col(row, 8).upper()  # I열 (8)
            name = get_col(row, 13)              # M열 (12)

            # 이름 체크 (필수)
            if not name or name == "0" or '개' in name or '합계' in name:
                if is_digit_code and name: 
                    print(f"  [DEBUG-SKIP] Code {code} skipped: Invalid name '{name}'")
                return False
            
            # 가격 체크 (완화: Empty/TBD/0 모두 허용하되, 숫자가 아예 없으면 TBD로 간주)
            if price_raw == 'TBD' or price_raw == '':
                return True
            
            try:
                # 숫자만 추출
                clean_price = re.sub(r'[^\d]', '', price_raw)
                if not clean_price:
                    # 숫자가 하나도 없는데 TBD도 아니면 (예: "판매완료") 
                    # 상황에 따라 판단해야 하지만 일단은 DB에 남김
                    return True
                
                price_numeric = int(clean_price)
                # 이전에는 0 이하를 버렸으나, 환불 직후 0일 수 있으므로 허용
                return True
            except:
                if is_digit_code:
                    print(f"  [DEBUG-SKIP] Code {code} skipped: Price parsing error '{price_raw}'")
                return False

        valid_rows = []
        for r in product_rows:
            code = get_col(r, 0).replace('.0', '')
            if is_real_product(r):
                valid_rows.append(r)

        if target_code:
            print(f"  [INFO] Targeted sync found: {len(valid_rows)} matches for {target_code}")
        else:
            print(f"  [INFO] Filtered: {len(product_rows)} -> {len(valid_rows)} real products.")
        
        if not valid_rows:
            print(f"  [INFO] No valid products found {'for target ' + target_code if target_code else ''}.")
            return

        # 더 이상 상위 카테고리 매핑이 필요 없습니다. 시트의 K열 값을 그대로 사용합니다.
        def map_upper_category(upper):
            return upper

        def parse_price(val):
            val_str = str(val).strip().upper()
            if val_str == 'TBD' or not val_str: return 'TBD'
            try:
                num_part = re.sub(r'[^\d]', '', val_str)
                return int(num_part) if num_part else 'TBD'
            except:
                return 'TBD'

        seen_codes = set()
        db_records = []
        
        parent_img_path = os.path.join("..", "..", "static", "images")
        existing_imgs = set(os.listdir(parent_img_path)) if os.path.exists(parent_img_path) else set()
        
        parent_thumb_path = os.path.join("..", "..", "static", "thumbnails")
        existing_thumbs = set(os.listdir(parent_thumb_path)) if os.path.exists(parent_thumb_path) else set()
        
        parent_thumb_scheduled_path = os.path.join("..", "..", "static", "thumbnails_scheduled")
        existing_thumbs_scheduled = set(os.listdir(parent_thumb_scheduled_path)) if os.path.exists(parent_thumb_scheduled_path) else set()
        
        scheduled_codes = set()

        # 제품 코드명 폴더 어닦 어도 싸이즈 맞는 이미지들이 있는지 확인
        # {code} 폴더 안에 1.jpg, 2.jpg... 식으로 저장된 신규 방식 대상
        existing_product_folders = set(
            d for d in existing_imgs
            if os.path.isdir(os.path.join(parent_img_path, d))
        ) if os.path.exists(parent_img_path) else set()

        # [Cache-Buster] 캐시 문제를 해결하기 위해 현재 시간 기반의 버전 문자열 생성
        timestamp = datetime.now().strftime("%Y%m%d%H%M")
        
        for row in valid_rows:
            code = get_col(row, 0).replace('.0', '')
            image_file_id = get_col(row, 20)  # T열 (19)
            img_id = extract_drive_id(image_file_id)
            
            # [NEW] A열(상품코드)이 빈 칸인 신규 사입품은 이미지 고유 ID 기반 TEMP_코드를 가상 부여합니다.
            is_temp_code = False
            if not code or code.lower() == 'nan':
                if img_id and len(img_id) >= 10:
                    code = f"TEMP_{img_id}"
                    is_temp_code = True
                else:
                    # 고유 식별자가 전혀 없으면 스킵
                    continue
            
            # [Deduplication] Skip if this code was already processed in this batch
            if code in seen_codes:
                print(f"  [SKIP] Duplicate product code found in sheet: {code}")
                continue
            seen_codes.add(code)
            
            brand = get_col(row, 10).title()  # K열 (10)
            
            # --- Format Detection (27-col vs 28+col) ---
            val_10 = get_col(row, 11).strip()
            val_11 = get_col(row, 12).strip()
            val_13 = get_col(row, 14).strip()
            
            is_old_format = False
            category_keywords = ['상의', '하의', '아우터', '원피스', '신발', '가방', '모자', '악세사리', '패션잡화', '기타', 'Tops', 'Bottoms', 'Outerwear', 'Dresses', 'Shoes', 'Bags', 'Hats', 'Accessories', 'Others']
            
            if val_10 in category_keywords or ' > ' in val_10:
                is_old_format = True
            elif val_11 in category_keywords or ' > ' in val_11:
                is_old_format = False
            else:
                # Fallback heuristics
                if val_10 in ['남성', '여성', '공용', 'Men', 'Women', 'Unisex']:
                    is_old_format = False
                elif ',' in val_13 or 'cm' in val_13.lower(): # 13(N)이 실측사이즈면 구형
                    is_old_format = True
                else:
                    is_old_format = False # 기본적으로 신형(28열)으로 간주
                
            if is_old_format:
                cat_raw = get_col(row, 11)     # L열
                name = get_col(row, 12)        # M열
                size = get_col(row, 13)        # N열
                actual_size = get_col(row, 14) # O열
                description = get_col(row, 17) # R열
            else:
                cat_raw = get_col(row, 12)     # M열
                name = get_col(row, 13)        # N열
                size = get_col(row, 14)        # O열
                actual_size = get_col(row, 15) # P열 (신규 28열 양식 실측사이즈)
                description = get_col(row, 18) # S열 (신규 28열 양식 제품설명)
            if ' > ' in cat_raw:
                upper_category = map_upper_category(cat_raw.split(' > ')[0].strip())
                category = cat_raw.split(' > ')[1].strip()
            else:
                upper_category = map_upper_category(cat_raw.strip())
                category = ""
            
            price = parse_price(get_col(row, 8))  # I열 (8)
            
            orig_price_raw = parse_price(get_col(row, 7))  # H열 (7) - 출고가
            original_price = orig_price_raw if isinstance(orig_price_raw, int) else 0
            
            stock_raw = get_col(row, 5)  # F열 (5) - 상태
            
            # [Normalization] 'out of stock' 또는 'Sold out' 등 모든 품절 표현을 'Sold Out'으로 통일
            if any(kw in stock_raw.lower() for kw in ['sold', 'out']):
                stock = 'Sold Out'
            else:
                if is_temp_code:
                    # 임시 코드 상품(도착 예정 상품)은 강제로 '도착예정' 상태를 부여해 예약 구매를 유도합니다.
                    stock = '도착예정' if not stock_raw else stock_raw
                else:
                    stock = stock_raw
                
            updated_at = stock  # 마지막 업데이트/상태 병용
            arrival_date = get_col(row, 25)  # Y열 (24) - 예상도착일
            
            col_t = get_col(row, 26).lower()  # Z열 (25) - 아카이브
            col_u = get_col(row, 27).lower()  # AA열 (26) - season
            flags = []
            if 'rare' in col_t or 'rare' in col_u: flags.append('rare')
            if 'w' == col_u or 'winter' in col_u: flags.append('Winter')
            u = ', '.join(flags) if flags else ''
            
            style = get_col(row, 24)       # X열 (23) - style
            hashtags = get_col(row, 23)    # W열 (22) - 해시태그
            image_file_id = get_col(row, 20) # T열 (19) - 이미지
            
            # [NEW] V열(index 21) = 정면누끼 이미지 URL
            # 왜: 상세페이지 첫 화면에 깔끔한 누끼 이미지를 보여주기 위해 별도 컬럼으로 저장
            nukki_raw = get_col(row, 21)
            nukki_id = extract_drive_id(nukki_raw) if nukki_raw else None
            if nukki_raw and nukki_raw.startswith('http') and 'img.822shop.com' in nukki_raw:
                # R2에 업로드된 누끼 URL은 그대로 사용
                nukki_url = nukki_raw
            elif nukki_id and len(nukki_id) >= 10:
                # 구글 드라이브 파일 ID → 고해상도 썸네일 URL로 변환
                nukki_url = f"https://drive.google.com/thumbnail?id={nukki_id}&sz=w1000"
            else:
                nukki_url = ''
            
            img_id = extract_drive_id(image_file_id)
            drive_thumb = f"https://drive.google.com/thumbnail?id={img_id}&sz=w1000" if img_id and len(img_id) >= 10 else "https://drive.google.com/thumbnail?id=1Wk4sdliFYg8I8TvyDkUFWgemxXKq9fwB&sz=w1000"

            if is_temp_code:
                scheduled_codes.add(code)
                # [NEW] 임시 가상코드 상품(도착예정 사입품)은 R2 스토리지에 이미지가 존재하지 않으므로,
                # 구글 드라이브 썸네일 URL을 매핑하거나 로컬 파일을 확인합니다.
                found_local_scheduled = False
                for ext in ['.jpg', '.JPG', '.png', '.PNG']:
                    if f"{code}{ext}" in existing_thumbs_scheduled:
                        file_path = os.path.join(parent_thumb_scheduled_path, f"{code}{ext}")
                        mtime = int(os.path.getmtime(file_path)) if os.path.exists(file_path) else 0
                        image_url = f"/static/thumbnails_scheduled/{code}{ext}?v={mtime}"
                        thumbnail_url = image_url
                        found_local_scheduled = True
                        break
                if not found_local_scheduled:
                    image_url = drive_thumb
                    thumbnail_url = drive_thumb
            else:
                if arrival_date:
                    scheduled_codes.add(code)
                    
                if os.environ.get('RAILWAY_ENVIRONMENT') or os.environ.get('R2_FORCE'):
                    image_url = f"{R2_DOMAIN}/thumbnails/{code}.jpg?v={timestamp}"
                    thumbnail_url = f"{R2_DOMAIN}/thumbnails/{code}.jpg?v={timestamp}"
                    if os.environ.get('DRIVE_FALLBACK') == 'true' and img_id:
                         image_url = drive_thumb
                         thumbnail_url = drive_thumb
                else:
                    found_local = False
                    for ext in ['.jpg', '.JPG', '.png', '.PNG']:
                        if f"{code}{ext}" in existing_imgs:
                            file_path = os.path.join(parent_img_path, f"{code}{ext}")
                            mtime = int(os.path.getmtime(file_path)) if os.path.exists(file_path) else 0
                            image_url = f"/static/images/{code}{ext}?v={mtime}"
                            found_local = True
                            break
                    if not found_local:
                        image_url = drive_thumb
                    
                    thumbnail_url = image_url
                    
                    # 도착예정 상품이면 thumbnails_scheduled 우선 확인, 아니면 thumbnails 확인
                    if arrival_date:
                        for ext in ['.jpg', '.JPG', '.png', '.PNG']:
                            if f"{code}{ext}" in existing_thumbs_scheduled:
                                file_path = os.path.join(parent_thumb_scheduled_path, f"{code}{ext}")
                                mtime = int(os.path.getmtime(file_path)) if os.path.exists(file_path) else 0
                                thumbnail_url = f"/static/thumbnails_scheduled/{code}{ext}?v={mtime}"
                                image_url = thumbnail_url # 도착예정은 원본/썸네일 경로 동일 처리
                                break
                    else:
                        for ext in ['.jpg', '.JPG', '.png', '.PNG']:
                            if f"{code}{ext}" in existing_thumbs:
                                file_path = os.path.join(parent_thumb_path, f"{code}{ext}")
                                mtime = int(os.path.getmtime(file_path)) if os.path.exists(file_path) else 0
                                thumbnail_url = f"/static/thumbnails/{code}{ext}?v={mtime}"
                                break
            
            # [NEW] Add multi-language columns
            name_en = get_col(row, 33)
            name_th = get_col(row, 34)
            description_en = get_col(row, 35)
            description_th = get_col(row, 36)
            
            season = get_col(row, 27).strip().lower()
            
            # product_images: 스프레드시트 AA열(Index 26)에서 가져오거나 로컬 폴더 감지
            # 왜: 서버 환경에서는 로컬 폴더가 없으므로 시트에 기록된 정보를 우선 사용
            # product_images: 스프레드시트에서 JSON 문자열이 포함된 열을 동적으로 탐색
            # 왜: 27열/32열 포맷 변경으로 인해 X열, AA열, AC열 등 위치가 가변적이기 때문
            # product_images: 스프레드시트에서 JSON 문자열이 포함된 열을 탐색 (안전성 강화)
            # 왜: 27열/32열 포맷 변경으로 위치가 X열(23) 또는 AA열(26) 등으로 가변적이므로,
            # 특정 범위(23~28) 내에서 확실한 이미지 JSON 배열 구조만 가져오도록 한정합니다.
            product_images_json = ""
            sheet_images_json = ""
            
            for i in [24, 25, 26, 27, 28, 29]:
                val = get_col(row, i).strip()
                if val.startswith('[') and ('/static/images/' in val or '.jpg' in val.lower() or 'img.822shop.com' in val):
                    sheet_images_json = val
                    break
                    break
            
            if sheet_images_json and sheet_images_json.startswith('['):
                # 시트에 기록된 목록이 있는 경우
                try:
                    paths = json.loads(sheet_images_json)
                    # 서버 환경이거나 강제 설정된 경우 클라우드 URL로 변환
                    if os.environ.get('RAILWAY_ENVIRONMENT') or os.environ.get('R2_FORCE') or True: # 항상 클라우드 우선
                        new_paths = []
                        for p in paths:
                            if p.startswith('/static/images/'):
                                new_paths.append(p.replace('/static/images/', f"{R2_DOMAIN}/images/") + f"?v={timestamp}")
                            elif not p.startswith('http'):
                                new_paths.append(f"{R2_DOMAIN}/images/{p.lstrip('/')}?v={timestamp}")
                            else:
                                new_paths.append(url_with_v := (p + (f"{'&' if '?' in p else '?'}v={timestamp}" if 'v=' not in p else "")))
                        paths = new_paths
                    product_images_json = json.dumps(paths, ensure_ascii=False)
                except Exception as e:
                    print(f"  [WARNING] 시트 이미지 JSON 파싱 실패 ({code}): {e}")
            
            if not product_images_json and code in existing_product_folders:
                # 시트에 기록이 없고 로컬 폴더가 있는 경우 (로컬 개발 환경 대응)
                product_folder = os.path.join(parent_img_path, code)
                try:
                    img_files = sorted(
                        [f for f in os.listdir(product_folder) if f.lower().endswith(('.jpg', '.jpeg', '.png'))],
                        key=lambda x: int(x.split('.')[0]) if x.split('.')[0].isdigit() else 999
                    )
                    if img_files:
                        paths = [f"/static/images/{code}/{f}" for f in img_files]
                        product_images_json = json.dumps(paths, ensure_ascii=False)
                except Exception as e:
                    print(f"  [WARNING] product_images 로컬 감지 실패 ({code}): {e}")

            if code in ['820', '821']:
                print(f"  [DEBUG] Record for {code}: stock='{stock}', price='{price}'")
                
            db_records.append((
                code, brand, name, upper_category, category, size,
                price, original_price, description, stock, updated_at,
                arrival_date, u, image_url, thumbnail_url, actual_size,
                style, hashtags, product_images_json, name_en, name_th, description_en, description_th,
                nukki_url, season
            ))

        # Database Update
        def find_db_path():
            # Railway 영구 볼륨 경로로 강제 고정
            if os.environ.get('RAILWAY_VOLUME_MOUNT_PATH'):
                return os.path.join(os.environ.get('RAILWAY_VOLUME_MOUNT_PATH'), 'database.sqlite')
            elif os.environ.get('DB_PATH'):
                return os.environ.get('DB_PATH')
            return os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', 'db', 'database.sqlite'))

        db_path = find_db_path()
        os.makedirs(os.path.dirname(db_path), exist_ok=True)
        print(f"  [DB] Using database at: {db_path}")
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # [CLEANUP] 기존 테이블 완전 삭제 (유령 데이터 방지)
        cursor.execute("DROP TABLE IF EXISTS products")
        
        cursor.execute('''CREATE TABLE products (
            code TEXT PRIMARY KEY, brand TEXT, name TEXT, upper_category TEXT, category TEXT, size TEXT,
            price TEXT, original_price INTEGER, description TEXT, stock TEXT, updated_at TEXT,
            arrival_date TEXT, u TEXT, image_url TEXT, thumbnail_url TEXT, actual_size TEXT,
            style TEXT, hashtags TEXT, product_images TEXT, name_en TEXT, name_th TEXT, description_en TEXT, description_th TEXT,
            nukki_url TEXT DEFAULT '', season TEXT DEFAULT ''
        )''')
        
        # [Added] Ensure code is unique by creating a unique index
        cursor.execute('CREATE UNIQUE INDEX IF NOT EXISTS idx_products_code ON products(code)')

        # [Added] product_images 콼럼이 없는 기존 DB에 안전하게 추가
        try:
            cursor.execute("ALTER TABLE products ADD COLUMN product_images TEXT DEFAULT ''")
            print("  [DB] product_images 콼럼 추가됨")
        except Exception:
            pass  # 이미 존재하면 무시

        # [Added] season 열이 없는 기존 DB에 안전하게 추가
        try:
            cursor.execute("ALTER TABLE products ADD COLUMN season TEXT DEFAULT ''")
            print("  [DB] season 컬럼 추가됨")
        except Exception:
            pass

        
        # [Added] Ensure missing tables for new features exist
        cursor.execute('''CREATE TABLE IF NOT EXISTS discount_products (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            product_code TEXT NOT NULL UNIQUE,
            discount_rate INTEGER NOT NULL DEFAULT 0,
            registered_at TEXT DEFAULT (datetime('now', 'localtime'))
        )''')
        
        cursor.execute('''CREATE TABLE IF NOT EXISTS page_views (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            path TEXT NOT NULL,
            referrer TEXT,
            user_agent TEXT,
            ip_address TEXT,
            created_at TEXT DEFAULT (datetime('now', 'localtime'))
        )''')
        
        cursor.execute('''CREATE TABLE IF NOT EXISTS site_settings (
            setting_key TEXT PRIMARY KEY,
            setting_value TEXT NOT NULL
        )''')

        
        if target_code:
            # 부분 업데이트: 기존 행 삭제
            cursor.execute("DELETE FROM products WHERE code = ?", (target_code,))
        else:
            # 전체 마이그레이션: 1333번 같은 유령 데이터를 확실히 한 번 더 지움
            cursor.execute("DELETE FROM products WHERE code = '1333'")
            # products 테이블에 값 채우기 (23개 필드)
            cursor.executemany('''
                INSERT INTO products (
                    code, brand, name, upper_category, category, size,
                    price, original_price, description, stock, updated_at,
                    arrival_date, u, image_url, thumbnail_url, actual_size,
                    style, hashtags, product_images, name_en, name_th, description_en, description_th,
                    nukki_url, season
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', db_records)
            
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_code ON products (code)")
        conn.commit()
        conn.close()
        
        print(f"SUCCESS: {len(db_records)} products {'updated' if target_code else 'migrated'}.")

        # --- Order Status Sync & Import ---
        if order_rows:
            conn = sqlite3.connect(db_path)
            cursor = conn.cursor()
            
            # Ensure orders table exists before sync
            cursor.execute('''CREATE TABLE IF NOT EXISTS orders (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                order_number TEXT NOT NULL UNIQUE,
                customer_id INTEGER NOT NULL,
                customer_name TEXT NOT NULL,
                line_id TEXT NOT NULL,
                phone TEXT NOT NULL,
                items_json TEXT NOT NULL,
                total_amount INTEGER NOT NULL,
                status TEXT NOT NULL DEFAULT 'pending',
                shipping_address TEXT NOT NULL,
                created_at TEXT DEFAULT (datetime('now', 'localtime')),
                tracking_number TEXT,
                login_id TEXT
            )''')
            
            print(f"\n[ORDER SYNC] Processing {len(order_rows)} rows from '주문내역' sheet...")
            
            status_map = {
                'pending': 'pending', 'confirmed': 'confirmed', 'shipped': 'shipped',
                'delivered': 'delivered', 'cancelled': 'cancelled', 'canceled': 'cancelled',
                'refunded': 'cancelled', 'refund': 'cancelled', '환불': 'cancelled',
                '취소': 'cancelled', '확인 완료': 'confirmed', '입금 확인': 'confirmed',
                '결제 완료': 'confirmed', '배송 중': 'shipped', '배송 완료': 'delivered',
                '처리 대기': 'pending'
            }

            def normalize_date(date_str):
                if not date_str: return datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                date_str = str(date_str).strip()
                # 2024. 03. 27. -> 2024-03-27
                clean = re.sub(r'[^0-9]', '-', date_str).strip('-')
                parts = [p for p in clean.split('-') if p]
                if len(parts) >= 3:
                    y, m, d = parts[0], parts[1], parts[2]
                    if len(y) == 2: y = "20" + y
                    hms = " ".join(parts[3:]) if len(parts) > 3 else "00:00:00"
                    return f"{y}-{int(m):02d}-{int(d):02d} {hms}"
                return date_str

            # Group rows by order number
            orders_data = {}
            for row in order_rows:
                if not row or len(row) < 1: continue
                order_num = str(row[0]).strip()
                if not order_num.startswith('822-'): continue
                
                if order_num not in orders_data:
                    orders_data[order_num] = {
                        'order_number': order_num,
                        'created_at': normalize_date(row[1] if len(row) > 1 else ''),
                        'customer_name': row[2] if len(row) > 2 else 'Unknown',
                        'line_id': row[3] if len(row) > 3 else '',
                        'phone': row[4] if len(row) > 4 else '',
                        'items': [],
                        'status': 'pending',
                        'shipping_address': row[11] if len(row) > 11 else '',
                    }
                
                # Status mapping
                if len(row) > 10:
                    raw_status = str(row[10]).strip().lower()
                    for k, v in status_map.items():
                        if k in raw_status:
                            orders_data[order_num]['status'] = v
                            break
                
                # Item mapping
                if len(row) > 9:
                    try:
                        qty = int(row[8]) if str(row[8]).isdigit() else 1
                        subtotal = int(re.sub(r'[^0-9]', '', str(row[9]))) if row[9] else 0
                        orders_data[order_num]['items'].append({
                            'code': str(row[5]).strip(),
                            'name': str(row[6]).strip(),
                            'brand': str(row[7]).strip(),
                            'quantity': qty,
                            'subtotal': subtotal
                        })
                    except: pass

            imported_count = 0
            updated_count = 0
            
            for o_num, data in orders_data.items():
                items_json = json.dumps(data['items'], ensure_ascii=False)
                total_amount = sum(it['subtotal'] for it in data['items'])
                
                cursor.execute("SELECT status FROM orders WHERE order_number = ?", (o_num,))
                db_row = cursor.fetchone()
                
                if not db_row:
                    # Import new order
                    cursor.execute("""
                        INSERT INTO orders (order_number, customer_id, customer_name, line_id, phone, 
                                          items_json, total_amount, status, shipping_address, created_at)
                        VALUES (?, 0, ?, ?, ?, ?, ?, ?, ?, ?)
                    """, (o_num, data['customer_name'], data['line_id'], data['phone'], 
                          items_json, total_amount, data['status'], data['shipping_address'], data['created_at']))
                    imported_count += 1
                elif db_row[0] != data['status']:
                    # Update status only
                    cursor.execute("UPDATE orders SET status = ? WHERE order_number = ?", (data['status'], o_num))
                    updated_count += 1

                # [Added] 결제 완료된 주문의 상품들은 카탈로그에서도 품절로 자동 동기화 (시트 간 불일치 보정)
                if data['status'] in ['confirmed', 'shipped', 'delivered']:
                    for item in data.get('items', []):
                        p_code = item.get('code')
                        if p_code:
                            cursor.execute("UPDATE products SET stock = 'Sold Out' WHERE code = ?", (p_code,))
            
            conn.commit()
            conn.close()
            print(f"[ORDER SYNC] Done. Imported: {imported_count}, Updated status: {updated_count}")
            log_sync(f"Order sync: Imported {imported_count}, Updated {updated_count}")

            # --- Managed Customer Sync ---
            if customer_rows:
                conn = sqlite3.connect(db_path)
                cursor = conn.cursor()
                
                # Ensure table exists
                cursor.execute('''CREATE TABLE IF NOT EXISTS managed_customers (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    customer_id TEXT NOT NULL UNIQUE,
                    phone TEXT,
                    address TEXT,
                    created_at TEXT DEFAULT (datetime('now', 'localtime')),
                    updated_at TEXT DEFAULT (datetime('now', 'localtime'))
                )''')
                
                print(f"\n[CUSTOMER SYNC] Processing {len(customer_rows)} rows from '등록고객' sheet...")
                
                # 시트의 데이터를 기반으로 SQLite 동기화 (간단하게 위해 삭제 후 재삽입 또는 REPLACE 사용)
                # 시트 구조: [customer_id, phone, address, updated_at]
                for c_row in customer_rows:
                    if len(c_row) < 1 or not str(c_row[0]).strip(): continue
                    c_id = str(c_row[0]).strip()
                    c_phone = str(c_row[1]).strip() if len(c_row) > 1 else ''
                    c_address = str(c_row[2]).strip() if len(c_row) > 2 else ''
                    c_updated_at = str(c_row[3]).strip() if len(c_row) > 3 else datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                    
                    # REPLACE INTO를 사용하여 이미 있으면 업데이트, 없으면 삽입
                    cursor.execute("""
                        INSERT OR REPLACE INTO managed_customers (customer_id, phone, address, updated_at)
                        VALUES (?, ?, ?, ?)
                    """, (c_id, c_phone, c_address, c_updated_at))
                
                conn.commit()
                conn.close()
                print(f"[CUSTOMER SYNC] Done. Processed {len(customer_rows)} customers.")
                log_sync(f"Customer sync: Processed {len(customer_rows)} entries")

    except Exception as e:
        print(f"FATAL ERROR: {e}")
        traceback.print_exc()

    # --- Garbage Collection for Scheduled Thumbnails ---
    try:
        if os.path.exists(parent_thumb_scheduled_path) and not target_code:
            deleted_count = 0
            for f in os.listdir(parent_thumb_scheduled_path):
                if not f.lower().endswith(('.jpg', '.jpeg', '.png')): continue
                file_code = os.path.splitext(f)[0]
                # is_temp_code는 code 자체가 TEMP_로 시작하고 arrival_date가 있을 것이므로 scheduled_codes에 추가되도록 위에서 처리해야 합니다.
                # 아까 is_temp_code일 때도 scheduled_codes에 추가하도록 로직을 약간 보완하겠습니다.
                if file_code not in scheduled_codes:
                    try:
                        os.remove(os.path.join(parent_thumb_scheduled_path, f))
                        deleted_count += 1
                        print(f"  [GC] Deleted orphaned scheduled thumbnail: {f}")
                    except: pass
            if deleted_count > 0:
                print(f"[GC] Deleted {deleted_count} orphaned scheduled thumbnails.")
    except Exception as e:
        print(f"[GC] Error cleaning up thumbnails: {e}")

def log_sync(message):
    log_file = os.path.join("db", "sync_history.log")
    os.makedirs(os.path.dirname(log_file), exist_ok=True)
    with open(log_file, "a", encoding="utf-8") as f:
        from datetime import datetime
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        f.write(f"[{timestamp}] {message}\n")

if __name__ == "__main__":
    target = sys.argv[1] if len(sys.argv) > 1 else None
    migrate(target)
