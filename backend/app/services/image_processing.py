import os
from datetime import datetime
from PIL import Image, ExifTags
from flask import current_app
from werkzeug.utils import secure_filename


class ImageProcessingService:

    @staticmethod
    def allowed_file(filename):
        allowed = current_app.config.get("ALLOWED_EXTENSIONS", {"jpg", "jpeg", "png"})
        return "." in filename and filename.rsplit(".", 1)[1].lower() in allowed

    @staticmethod
    def save_image(file, report_id):
        """Save uploaded image using path convention: uploads/{year}/{month}/{report_id}_{timestamp}.jpg
        UC001 – F1 requirement."""
        now = datetime.utcnow()
        sub_dir = os.path.join(
            current_app.config["UPLOAD_FOLDER"],
            str(now.year),
            str(now.month).zfill(2),
        )
        os.makedirs(sub_dir, exist_ok=True)

        ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else "jpg"
        timestamp = int(now.timestamp())
        file_name = f"{report_id}_{timestamp}.{ext}"
        file_path = os.path.join(sub_dir, file_name)

        file.stream.seek(0)
        img = Image.open(file.stream)
        # JPEG cannot encode RGBA or palette mode — convert to RGB first
        if img.mode in ("RGBA", "P", "LA"):
            img = img.convert("RGB")
        # Resize to YOLO-friendly size while preserving aspect ratio
        img.thumbnail((1280, 1280))
        img.save(file_path, optimize=True)

        return file_path, file_name

    @staticmethod
    def extract_exif_gps(file):
        """UC002 – Extract GPSLatitude/GPSLongitude from EXIF metadata.
        Returns (lat, lng) tuple or None if GPS data is absent."""
        try:
            file.stream.seek(0)
            img = Image.open(file.stream)
            exif_data = img._getexif()
            if not exif_data:
                return None

            tag_map = {ExifTags.TAGS[k]: k for k in ExifTags.TAGS}
            gps_info_tag = tag_map.get("GPSInfo")
            if not gps_info_tag or gps_info_tag not in exif_data:
                return None

            gps_info = exif_data[gps_info_tag]
            gps_tags = {ExifTags.GPSTAGS.get(k, k): v for k, v in gps_info.items()}

            def dms_to_decimal(dms, ref):
                degrees = float(dms[0])
                minutes = float(dms[1])
                seconds = float(dms[2])
                decimal = degrees + minutes / 60 + seconds / 3600
                if ref in ("S", "W"):
                    decimal = -decimal
                return decimal

            lat = dms_to_decimal(gps_tags["GPSLatitude"], gps_tags["GPSLatitudeRef"])
            lng = dms_to_decimal(gps_tags["GPSLongitude"], gps_tags["GPSLongitudeRef"])
            return lat, lng
        except Exception:
            return None
        finally:
            file.stream.seek(0)
