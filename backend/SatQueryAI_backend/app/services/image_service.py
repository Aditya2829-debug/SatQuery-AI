import hashlib
import io
import math
import re
import uuid
from datetime import date, datetime, timezone
from typing import Any, Dict, List, Optional, Tuple
from fastapi import UploadFile
from PIL import Image
from PIL.ExifTags import GPSTAGS, TAGS


import tifffile

from app.core.config import settings
from app.core.exceptions import NotFoundException, ValidationException
from app.core.logging import get_logger
from app.integrations.supabase import get_supabase_client
from app.repositories.image_repository import image_repository
from app.schemas.image import (
    ImageContext,
    ImageListResponse,
    ImageResponseData,
    ImageUploadParams,
    ImageUploadResponse,
)

logger = get_logger(__name__)

# TIFF magic byte signatures
TIFF_MAGIC_BYTES = (
    b"II*\x00",  # Little-endian standard TIFF
    b"MM\x00*",  # Big-endian standard TIFF
    b"II+\x00",  # Little-endian BigTIFF
    b"MM\x00+",  # Big-endian BigTIFF
)


class ImageService:
    """
    Service handling satellite imagery detection, Rasterio-based GeoTIFF parsing,
    Pillow-based standard image processing, storage, and persistence into the
    `satellite_images` table.
    """

    def __init__(self):
        self.repository = image_repository

    async def process_image_upload(
        self,
        file: UploadFile,
        params: Optional[ImageUploadParams] = None,
    ) -> ImageUploadResponse:
        """
        Validates, processes, extracts geospatial data from GeoTIFF / EXIF,
        persists to the `satellite_images` table, and returns the ImageUploadResponse.
        Uses Rasterio for TIFF/GeoTIFF files and Pillow for PNG/JPEG files.
        """
        filename = file.filename or "unknown_image.png"
        logger.info(f"Processing upload for file: '{filename}', declared content_type: {file.content_type}")

        # 1. Read binary content
        content = await file.read()
        size_bytes = len(content)

        if size_bytes == 0:
            raise ValidationException(
                message="Uploaded file is empty.",
                details={"filename": filename, "size_bytes": 0},
            )

        # 2. Check maximum size (10 MB configured)
        if size_bytes > settings.MAX_IMAGE_SIZE_BYTES:
            max_mb = settings.MAX_IMAGE_SIZE_BYTES // (1024 * 1024)
            raise ValidationException(
                message=f"File size exceeds maximum allowed limit of {max_mb}MB.",
                details={"filename": filename, "size_bytes": size_bytes, "max_bytes": settings.MAX_IMAGE_SIZE_BYTES},
            )

        # 3. Compute cryptographic SHA-256 checksum
        checksum_sha256 = hashlib.sha256(content).hexdigest()

        # 4. Check if file is TIFF / GeoTIFF
        is_tiff = self._is_tiff_format(filename=filename, content_type=file.content_type, content=content)

        # 5. Extract dimensions, format, and geospatial metadata
        if is_tiff:
            logger.info(f"Routing '{filename}' to Rasterio TIFF engine.")
            extracted = self._process_tiff_rasterio(content=content, filename=filename)
        else:
            logger.info(f"Routing '{filename}' to Pillow standard image engine.")
            extracted = self._process_standard_image_pillow(content=content, filename=filename)

        width = extracted["width"]
        height = extracted["height"]
        channels = extracted["channels"]
        img_format = extracted["format"]
        geo_data = extracted["geo_data"]

        # 6. Validate content type against configured allowed types
        content_type = file.content_type or f"image/{img_format.lower()}"
        is_allowed = any(content_type.lower() == allowed.lower() for allowed in settings.ALLOWED_IMAGE_TYPES)
        if not is_allowed and img_format not in ["PNG", "JPEG", "JPG", "TIFF", "TIF"]:
            raise ValidationException(
                message=f"Unsupported image type '{content_type}'. Allowed types: {settings.ALLOWED_IMAGE_TYPES}",
                details={"content_type": content_type, "detected_format": img_format},
            )

        # 7. Merge with user-supplied form parameters
        upload_params = params or ImageUploadParams()

        latitude = upload_params.latitude if upload_params.latitude is not None else geo_data.get("latitude")
        longitude = upload_params.longitude if upload_params.longitude is not None else geo_data.get("longitude")
        resolution_m = (
            upload_params.resolution_m if upload_params.resolution_m is not None else geo_data.get("resolution_m")
        )
        source = upload_params.source or geo_data.get("source")
        capture_date = upload_params.capture_date or geo_data.get("capture_date")

        # Auxiliary satellite metadata
        cloud_cover = None
        satellite_bands = []
        if upload_params.satellite_metadata:
            sm = upload_params.satellite_metadata
            if sm.satellite_name and not source:
                source = sm.satellite_name
            if sm.resolution_meters and resolution_m is None:
                resolution_m = sm.resolution_meters
            if sm.coordinates:
                if latitude is None:
                    latitude = sm.coordinates.latitude
                if longitude is None:
                    longitude = sm.coordinates.longitude
            if sm.acquisition_date and capture_date is None:
                capture_date = sm.acquisition_date.date()
            cloud_cover = sm.cloud_cover_percentage
            satellite_bands = sm.bands

        # 8. Generate identifiers and storage paths
        image_id = str(uuid.uuid4())
        safe_name = re.sub(r"[^a-zA-Z0-9_.-]", "_", filename)
        stored_filename = f"{image_id[:8]}_{safe_name}"

        # 9. Store in Supabase Storage
        storage_path, public_url = self._store_image_file(stored_filename, content, content_type)

        # 10. Construct structured JSONB `metadata`
        jsonb_metadata = {
            "original_filename": filename,
            "format": img_format,
            "checksum_sha256": checksum_sha256,
            "dimensions": {
                "width": width,
                "height": height,
                "channels": channels,
            },
            "public_url": public_url,
            "specialist_compatibility": ["VQA", "ChangeDetection"],
        }

        # Include raster/geo properties if available
        if geo_data.get("bounding_box"):
            jsonb_metadata["bounding_box"] = geo_data["bounding_box"]
        if geo_data.get("crs"):
            jsonb_metadata["crs"] = geo_data["crs"]
        if geo_data.get("raster_meta"):
            jsonb_metadata["raster_meta"] = geo_data["raster_meta"]
        if cloud_cover is not None:
            jsonb_metadata["cloud_cover_percentage"] = cloud_cover
        if satellite_bands:
            jsonb_metadata["bands"] = satellite_bands
        if upload_params.title:
            jsonb_metadata["title"] = upload_params.title
        if upload_params.description:
            jsonb_metadata["description"] = upload_params.description
        if upload_params.tags:
            jsonb_metadata["tags"] = upload_params.tags
        if upload_params.custom_metadata:
            jsonb_metadata["custom_metadata"] = upload_params.custom_metadata

        # 11. Create ImageResponseData strictly adhering to satellite_images schema
        image_data = ImageResponseData(
            image_id=image_id,
            file_name=stored_filename,
            storage_path=storage_path,
            file_type=content_type,
            file_size=size_bytes,
            source=source,
            capture_date=capture_date,
            latitude=latitude,
            longitude=longitude,
            resolution_m=resolution_m,
            metadata=jsonb_metadata,
            created_at=datetime.now(timezone.utc),
        )

        # 12. Persist to database table `satellite_images`
        self.repository.save(image_data)
        logger.info(f"Satellite image {image_id} successfully persisted to 'satellite_images' table.")

        # 13. Return structured response
        return ImageUploadResponse(
            status="success",
            message="Image uploaded and processed successfully.",
            data=image_data,
        )

    def get_image(self, image_id: str) -> ImageResponseData:
        """Retrieves image record from `satellite_images` table or cache."""
        image = self.repository.get_by_id(image_id)
        if not image:
            raise NotFoundException(
                message=f"Image with ID '{image_id}' was not found in satellite_images.",
                details={"image_id": image_id},
            )
        return image

    def list_images(self, limit: int = 50, offset: int = 0) -> ImageListResponse:
        """Returns paginated list of satellite images."""
        items = self.repository.list_all(limit=limit, offset=offset)
        total = self.repository.count()
        return ImageListResponse(
            status="success",
            total=total,
            items=items,
        )

    def get_image_context(self, image_id: str) -> ImageContext:
        """
        Retrieves a fully-populated ImageContext for downstream AI specialist
        workflows (VQA, Change Detection).

        This is the single entry point that:
        1. Fetches the image record from the satellite_images table
           (reuses existing get_image with 404 handling).
        2. Downloads the actual image bytes from Supabase Storage
           using the record's storage_path.
        3. Returns a unified ImageContext containing both metadata
           and image binary data.

        Raises NotFoundException if the image_id does not exist.
        """
        # Step 1: Retrieve DB record (raises NotFoundException if missing)
        image_data = self.get_image(image_id)

        # Step 2: Download actual image bytes from Supabase Storage
        image_bytes = self.repository.download_image_bytes(image_data.storage_path)
        if image_bytes:
            logger.info(
                f"ImageContext for '{image_id}': downloaded {len(image_bytes)} bytes "
                f"from '{image_data.storage_path}'."
            )
        else:
            logger.warning(
                f"ImageContext for '{image_id}': could not download image bytes "
                f"from '{image_data.storage_path}'. Context will have image_bytes=None."
            )

        # Step 3: Build unified ImageContext
        return ImageContext(
            image_id=image_data.image_id,
            file_name=image_data.file_name,
            file_type=image_data.file_type,
            file_size=image_data.file_size,
            storage_path=image_data.storage_path,
            image_bytes=image_bytes,
            source=image_data.source,
            capture_date=image_data.capture_date,
            latitude=image_data.latitude,
            longitude=image_data.longitude,
            resolution_m=image_data.resolution_m,
            metadata=image_data.metadata,
            created_at=image_data.created_at,
        )

    def _is_tiff_format(self, filename: str, content_type: Optional[str], content: bytes) -> bool:
        """Determines if the uploaded file is a TIFF / GeoTIFF."""
        lower_name = filename.lower()
        if lower_name.endswith((".tif", ".tiff")):
            return True
        if content_type and content_type.lower() in ["image/tiff", "image/tif"]:
            return True
        if len(content) >= 4 and content[:4] in TIFF_MAGIC_BYTES:
            return True
        return False

    def _process_tiff_rasterio(self, content: bytes, filename: str) -> Dict[str, Any]:
        """
        Parses TIFF / GeoTIFF imagery using Rasterio.
        Extracts width, height, spectral bands (channels), CRS, bounds, resolution,
        and reprojects coordinates to WGS84 decimal degrees.
        Falls back to tifffile if Rasterio encounters an unhandled edge-case.
        """
        try:
            import rasterio
            from rasterio.io import MemoryFile
            from rasterio.warp import transform
            with MemoryFile(content) as memfile:
                with memfile.open() as src:
                    width = src.width
                    height = src.height
                    channels = src.count

                    # Extract CRS, Bounds, and Resolution
                    crs_str = src.crs.to_string() if src.crs else None
                    bounds = src.bounds
                    res = src.res

                    lat = None
                    lon = None
                    res_m = None
                    bbox = None

                    # Compute center coordinate
                    center_x = (bounds.left + bounds.right) / 2.0
                    center_y = (bounds.bottom + bounds.top) / 2.0

                    if src.crs:
                        if src.crs.is_geographic:
                            lon = round(float(center_x), 6)
                            lat = round(float(center_y), 6)
                            res_m = round(float(res[0]) * 111320.0 * math.cos(math.radians(lat)), 2)
                            bbox = {
                                "min_lon": round(float(bounds.left), 6),
                                "max_lon": round(float(bounds.right), 6),
                                "min_lat": round(float(bounds.bottom), 6),
                                "max_lat": round(float(bounds.top), 6),
                            }
                        else:
                            # Projected coordinate system (e.g. UTM)
                            try:
                                xs, ys = transform(src.crs, "EPSG:4326", [center_x], [center_y])
                                lon = round(float(xs[0]), 6)
                                lat = round(float(ys[0]), 6)
                                res_m = round(float(res[0]), 2)

                                c_xs, c_ys = transform(
                                    src.crs,
                                    "EPSG:4326",
                                    [bounds.left, bounds.right, bounds.left, bounds.right],
                                    [bounds.bottom, bounds.bottom, bounds.top, bounds.top],
                                )
                                bbox = {
                                    "min_lon": round(float(min(c_xs)), 6),
                                    "max_lon": round(float(max(c_xs)), 6),
                                    "min_lat": round(float(min(c_ys)), 6),
                                    "max_lat": round(float(max(c_ys)), 6),
                                }
                            except Exception as e:
                                logger.warning(f"Rasterio reprojection error: {e}")
                    elif -180.0 <= center_x <= 180.0 and -90.0 <= center_y <= 90.0:
                        # Implicit WGS84 geographic degrees
                        lon = round(float(center_x), 6)
                        lat = round(float(center_y), 6)
                        res_m = round(float(res[0]) * 111320.0 * math.cos(math.radians(lat)), 2)
                        bbox = {
                            "min_lon": round(float(bounds.left), 6),
                            "max_lon": round(float(bounds.right), 6),
                            "min_lat": round(float(bounds.bottom), 6),
                            "max_lat": round(float(bounds.top), 6),
                        }

                    # Extract tags (DateTime, Description, Software)
                    tags = src.tags()
                    capture_date = None
                    source = None

                    dt_val = tags.get("TIFFTAG_DATETIME")
                    if dt_val:
                        capture_date = self._parse_tiff_date(str(dt_val))

                    desc_val = tags.get("TIFFTAG_IMAGEDESCRIPTION")
                    if desc_val and not str(desc_val).strip().startswith(("{", "[")):
                        source = str(desc_val).strip()[:100]

                    soft_val = tags.get("TIFFTAG_SOFTWARE")
                    if not source and soft_val and not str(soft_val).strip().startswith(("{", "[")):
                        if "tifffile" not in soft_val.lower():
                            source = str(soft_val).strip()[:100]

                    raster_meta = {
                        "driver": src.driver,
                        "dtypes": [str(dt) for dt in src.dtypes],
                        "nodata": src.nodata,
                        "bounds": {
                            "left": bounds.left,
                            "bottom": bounds.bottom,
                            "right": bounds.right,
                            "top": bounds.top,
                        },
                    }

                    return {
                        "width": width,
                        "height": height,
                        "channels": channels,
                        "format": "TIFF",
                        "geo_data": {
                            "latitude": lat,
                            "longitude": lon,
                            "resolution_m": res_m,
                            "bounding_box": bbox,
                            "crs": crs_str,
                            "source": source,
                            "capture_date": capture_date,
                            "raster_meta": raster_meta,
                        },
                    }
        except Exception as rasterio_err:
            logger.warning(f"Rasterio could not parse '{filename}': {rasterio_err}. Trying tifffile fallback.")
            # Fallback to tifffile
            try:
                with tifffile.TiffFile(io.BytesIO(content)) as tif:
                    page = tif.pages[0]
                    width = page.shape[1] if len(page.shape) >= 2 else page.shape[0]
                    height = page.shape[0]
                    channels = page.shape[2] if len(page.shape) >= 3 else 1

                    return {
                        "width": width,
                        "height": height,
                        "channels": channels,
                        "format": "TIFF",
                        "geo_data": {
                            "latitude": None,
                            "longitude": None,
                            "resolution_m": None,
                            "bounding_box": None,
                            "crs": None,
                            "source": None,
                            "capture_date": None,
                            "raster_meta": None,
                        },
                    }
            except Exception as tifffile_err:
                logger.error(f"Both Rasterio and tifffile failed for '{filename}': {tifffile_err}")
                raise ValidationException(
                    message=f"The uploaded TIFF file '{filename}' is corrupt or could not be read.",
                    details={"filename": filename, "rasterio_error": str(rasterio_err), "tifffile_error": str(tifffile_err)},
                )

    def _process_standard_image_pillow(self, content: bytes, filename: str) -> Dict[str, Any]:
        """
        Parses standard visual imagery (PNG, JPEG, WebP) using Pillow.
        Extracts width, height, channels, and any EXIF GPS coordinates.
        """
        try:
            with Image.open(io.BytesIO(content)) as img:
                width, height = img.size
                img_format = (img.format or "UNKNOWN").upper()
                bands = img.getbands()
                channels = len(bands) if bands else None

                exif_gps, exif_date = self._extract_exif_data(img)

                geo_data = {
                    "latitude": exif_gps[0] if exif_gps else None,
                    "longitude": exif_gps[1] if exif_gps else None,
                    "resolution_m": None,
                    "bounding_box": None,
                    "crs": "EPSG:4326" if exif_gps else None,
                    "source": None,
                    "capture_date": exif_date,
                    "raster_meta": None,
                }

                return {
                    "width": width,
                    "height": height,
                    "channels": channels,
                    "format": img_format,
                    "geo_data": geo_data,
                }
        except Exception as e:
            logger.warning(f"Failed to decode standard image '{filename}' with Pillow: {e}")
            raise ValidationException(
                message=f"The uploaded file '{filename}' could not be parsed as a valid image.",
                details={"filename": filename, "error": str(e)},
            )

    def _extract_exif_data(self, img: Image.Image) -> Tuple[Optional[Tuple[float, float]], Optional[date]]:
        """Extracts GPS coordinates and capture date from EXIF tags for JPEG/PNG images."""
        exif_gps = None
        exif_date = None

        try:
            exif = img.getexif()
            if not exif:
                return None, None

            for tag_id, value in exif.items():
                tag_name = TAGS.get(tag_id, tag_id)
                if tag_name in ["DateTime", "DateTimeOriginal", "DateTimeDigitized"]:
                    parsed = self._parse_tiff_date(str(value))
                    if parsed:
                        exif_date = parsed
                        break

            gps_ifd = exif.get_ifd(0x8825)
            if gps_ifd:
                gps_tags = {GPSTAGS.get(k, k): v for k, v in gps_ifd.items()}
                lat_tuple = gps_tags.get("GPSLatitude")
                lat_ref = gps_tags.get("GPSLatitudeRef", "N")
                lon_tuple = gps_tags.get("GPSLongitude")
                lon_ref = gps_tags.get("GPSLongitudeRef", "E")

                if lat_tuple and lon_tuple:
                    lat = self._convert_dms_to_dd(lat_tuple, lat_ref)
                    lon = self._convert_dms_to_dd(lon_tuple, lon_ref)
                    if lat is not None and lon is not None:
                        exif_gps = (round(lat, 6), round(lon, 6))

                date_stamp = gps_tags.get("GPSDateStamp")
                if date_stamp and not exif_date:
                    parsed = self._parse_tiff_date(str(date_stamp))
                    if parsed:
                        exif_date = parsed
        except Exception as e:
            logger.debug(f"Could not parse EXIF GPS data: {e}")

        return exif_gps, exif_date

    def _convert_dms_to_dd(self, dms: Any, ref: str) -> Optional[float]:
        """Converts Degrees/Minutes/Seconds tuple to decimal degrees."""
        try:
            d = float(dms[0])
            m = float(dms[1])
            s = float(dms[2])
            dd = d + (m / 60.0) + (s / 3600.0)
            if ref.upper() in ["S", "W"]:
                dd = -dd
            return dd
        except Exception:
            return None

    def _parse_tiff_date(self, date_str: str) -> Optional[date]:
        """Parses 'YYYY:MM:DD HH:MM:SS' or 'YYYY-MM-DD' date string into Python date object."""
        try:
            clean = date_str.strip()
            if ":" in clean[:10]:
                clean = clean[:10].replace(":", "-")
            elif "/" in clean[:10]:
                clean = clean[:10].replace("/", "-")
            return date.fromisoformat(clean[:10])
        except Exception:
            return None

    def _store_image_file(
        self,
        stored_filename: str,
        content: bytes,
        content_type: str,
    ) -> Tuple[str, Optional[str]]:
        """
        Stores image binary in Supabase Storage bucket.
        Returns a tuple of (storage_path, public_url).
        """
        client = get_supabase_client()
        bucket_name = settings.SUPABASE_STORAGE_BUCKET
        object_path = f"uploads/{stored_filename}"

        if client:
            try:
                client.storage.from_(bucket_name).upload(
                    path=object_path,
                    file=content,
                    file_options={"content-type": content_type},
                )
                public_url_res = client.storage.from_(bucket_name).get_public_url(object_path)
                public_url = public_url_res if isinstance(public_url_res, str) else None
                logger.info(f"Stored file in Supabase storage: {bucket_name}/{object_path}")
                return f"{bucket_name}/{object_path}", public_url
            except Exception as e:
                logger.warning(
                    f"Supabase storage upload failed for '{object_path}': {e}. Using fallback path."
                )

        fallback_path = f"{bucket_name}/{object_path}"
        return fallback_path, None


# Global singleton instance
image_service = ImageService()
