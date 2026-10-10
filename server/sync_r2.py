import os
import io
import boto3
from botocore.config import Config
from pathlib import Path
import argparse
import sys

# Pillow 媛?몄삤湲?(?놁쑝硫?諛⑺뼢 援먯젙 ?놁씠 吏꾪뻾)
try:
    from PIL import Image, ExifTags, ImageOps
    PILLOW_AVAILABLE = True
except ImportError:
    PILLOW_AVAILABLE = False
    print("[WARNING] Pillow not installed. Image orientation will NOT be corrected.")
    print("[WARNING] Run: pip install Pillow")

# R2 Credentials
ACCESS_KEY = "196e4de55b3db99dc00a2177b3626e92"
SECRET_KEY = "23a9e2c238cd0b8db76ccbc359aa9a57c0d65122cc3d2f6d1afe885325774997"
ENDPOINT_URL = "https://b9ab11af03674fa47290a8f80d1e6b1e.r2.cloudflarestorage.com"
BUCKET_NAME = "822shop-images"


def fix_image_orientation(file_path):
    """
    ?대?吏??EXIF orientation ?뺣낫瑜??쎌뼱 ?ㅼ젣 ?쎌????щ컮瑜?諛⑺뼢?쇰줈 ?뚯쟾?쒗궢?덈떎 (洹쇰낯???닿껐).
    ?ъ슜???뺤씤 寃곌낵 紐⑤뱺 ?ъ쭊? '?몃줈'?대?濡? 援먯젙 ?꾩뿉??媛濡쒖씤 寃쎌슦 媛뺤젣 ?뚯쟾?⑸땲??
    """
    if not PILLOW_AVAILABLE:
        with open(file_path, 'rb') as f:
            return f.read()

    try:
        img = Image.open(file_path)
        
        # 1. EXIF 湲곕컲 ?먮룞 ?뚯쟾 (媛€???쒖??곸씠怨?洹쇰낯?곸씤 ?닿껐梨?
        # ???⑥닔??EXIF ?쒓렇瑜??쎌뼱 90?? 180?? 270???뚯쟾 諛?諛섏쟾??紐⑤몢 ?먮룞?쇰줈 泥섎━?⑸땲??
        img = ImageOps.exif_transpose(img)
        
        # 회전된 이미지를 메모리 버퍼에 저장
        buf = io.BytesIO()
        ext = file_path.suffix.lower()
        fmt = 'PNG' if ext == '.png' else 'JPEG'
        
        if img.mode != 'RGB' and fmt == 'JPEG':
            img = img.convert('RGB')
            
        img.save(buf, format=fmt, quality=95, optimize=True)
        return buf.getvalue()

    except Exception as e:
        print(f"  [WARNING] ?대?吏€ 泥섎━ ?ㅽ뙣 ({file_path.name}): {e}")
        with open(file_path, 'rb') as f:
            return f.read()


def get_r2_client():
    return boto3.client(
        service_name='s3',
        endpoint_url=ENDPOINT_URL,
        aws_access_key_id=ACCESS_KEY,
        aws_secret_access_key=SECRET_KEY,
        config=Config(signature_version='s3v4'),
        region_name='auto'
    )


def upload_folder(local_folder, r2_prefix, force_reupload=True): # ?대쾲 ??踰덉? 媛뺤젣濡??꾩껜 ?낅줈??吏꾪뻾
    """
    濡쒖뺄 ?대뜑瑜?R2???숆린?뷀빀?덈떎.
    諛⑺뼢???섎せ???ъ쭊??諛쒓껄?섎㈃ 濡쒖뺄 ?뚯씪???섏젙?섍퀬 ?대씪?곕뱶?먮룄 ?낅줈?쒗빀?덈떎.
    """
    s3 = get_r2_client()
    local_path = Path(local_folder)

    if not local_path.exists():
        print(f"[SKIP] Local folder not found: {local_folder}")
        return

    print(f"\n[SYNC START] {local_folder} -> Cloud ({r2_prefix})")

    # 1. R2 硫뷀??곗씠??議고쉶
    existing_meta = {}
    try:
        paginator = s3.get_paginator('list_objects_v2')
        for page in paginator.paginate(Bucket=BUCKET_NAME, Prefix=r2_prefix):
            if 'Contents' in page:
                for obj in page['Contents']:
                    existing_meta[obj['Key']] = obj['Size']
        print(f"  [INFO] ?대씪?곕뱶??湲곗〈 ?뚯씪 {len(existing_meta)}媛??뺤씤??")
    except Exception as e:
        print(f"  [WARNING] ?대씪?곕뱶 紐⑸줉 議고쉶 ?ㅽ뙣: {e}")

    # 2. ?뚯씪 ?쒗쉶
    files = [f for f in local_path.glob('**/*') if f.is_file() and f.suffix.lower() in ['.jpg', '.jpeg', '.png']]
    total_files = len(files)
    upload_count = 0
    skip_count = 0

    print(f"  [INFO] 珥?{total_files}媛쒖쓽 濡쒖뺄 ?뚯씪??寃€?ы빀?덈떎...")

    for file in files:
        relative_path = file.relative_to(local_path)
        r2_key = f"{r2_prefix}/{relative_path.as_posix()}"
        local_size = file.stat().st_size
        
        # 1. ?대씪?곕뱶???숈씪 ?ъ씠利??뚯씪???대? ?덉쑝硫??ㅽ궢 (留ㅼ슦 鍮좊쫫)
        if not force_reupload and r2_key in existing_meta and existing_meta[r2_key] == local_size:
            skip_count += 1
            continue

        # 2. 이미지 방향 교정 및 업로드 준비
        try:
            # 諛⑺뼢 泥댄겕 諛?援먯젙
            image_bytes = fix_image_orientation(file)
            
            # 濡쒖뺄 ?뚯씪 ?낅뜲?댄듃 (援먯젙??寃쎌슦 諛붿씠?멸? ?ㅻ쫫)
            with open(file, 'rb') as f:
                original_bytes = f.read()
            
            if len(image_bytes) != len(original_bytes) or image_bytes != original_bytes:
                print(f"  [ROTATE] {relative_path}")
                with open(file, 'wb') as f:
                    f.write(image_bytes)
                local_size = len(image_bytes) 
            else:
                print(f"  [UPLOAD] {relative_path}")

            # 3. 클라우드 업로드
            content_type = 'image/png' if file.suffix.lower() == '.png' else 'image/jpeg'
            s3.put_object(
                Bucket=BUCKET_NAME,
                Key=r2_key,
                Body=image_bytes,
                ContentType=content_type
            )
            upload_count += 1
            
        except Exception as e:
            print(f"  [ERROR] {relative_path} 泥섎━ ?ㅽ뙣: {e}")

    print(f"  [SUCCESS] 珥?{total_files}媛?以?{upload_count}媛??낅줈???꾨즺 (嫄대꼫?€: {skip_count})")


def main():
    parser = argparse.ArgumentParser(description="Sync images to R2")
    parser.add_argument("--mode", choices=["skip", "fast", "force"], default="fast", help="Sync mode: skip, fast (changed only), force (all)")
    args = parser.parse_args()

    if args.mode == "skip":
        print("\n[SKIP] ?대?吏€ ?숆린???④퀎瑜?嫄대꼫?곷땲??")
        return

    force = (args.mode == "force")
    root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

    # 1. 원본 이미지 동기화
    img_dir = os.path.join(root_dir, "static", "images")
    upload_folder(img_dir, "images", force_reupload=force)

    # 2. 썸네일 동기화
    thumb_dir = os.path.join(root_dir, "static", "thumbnails")
    # ?몃꽕?쇱? ??긽 鍮좊Ⅸ ?숆린??False)濡?吏꾪뻾?섍굅??紐⑤뱶???곕쫫
    # ?ш린?쒕뒗 ?대?吏€ 紐⑤뱶?€ ?숈씪?섍쾶 留욎떠以?(?? skip?€ ?대? ?꾩뿉??嫄몃윭吏?
    upload_folder(thumb_dir, "thumbnails", force_reupload=force)


if __name__ == "__main__":
    main()
