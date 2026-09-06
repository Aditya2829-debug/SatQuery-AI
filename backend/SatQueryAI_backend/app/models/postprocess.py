import cv2
import numpy as np

def extract_change_regions(mask, min_area=20):
    """Extract connected changed regions from a 2D binary mask."""
    mask = np.asarray(mask)
    if mask.ndim != 2: raise ValueError(f"Expected 2D mask, got {mask.shape}")
    
    binary = (mask > 0).astype(np.uint8)
    _, _, stats, centroids = cv2.connectedComponentsWithStats(binary, connectivity=8)
    
    regions = []
    for i in range(1, len(stats)):
        area = int(stats[i, cv2.CC_STAT_AREA])
        if area < min_area: continue
        
        x, y, w, h = stats[i, :4]
        cx, cy = centroids[i]
        regions.append({
            "bbox": [int(x), int(y), int(x + w), int(y + h)],
            "area_pixels": area,
            "center": [float(cx), float(cy)]
        })
    return sorted(regions, key=lambda r: r["area_pixels"], reverse=True)
