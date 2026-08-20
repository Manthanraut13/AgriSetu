"""Soil data fetch service — SoilGrids (ISRIC)."""
import logging
from typing import Optional
import httpx

logger = logging.getLogger("agrisetu.soil")

SOILGRIDS_BASE = "https://rest.isric.org/soilgrids/v2.0/properties/query"


async def fetch_soil(lat: float, lon: float) -> Optional[dict]:
    """
    Fetch soil data from SoilGrids API (ISRIC).

    Returns dict with N, P, K, pH, moisture_pct, organic_carbon_pct.
    Note: SoilGrids provides depth-wise data. We use the 0-5cm layer (topsoil).
    """
    logger.info(f"Fetching SoilGrids data for ({lat}, {lon})")

    # SoilGrids properties we need
    properties = ["clay", "sand", "silt", "phh2o", "soc", "nitrogen"]

    # Use the statistical endpoint for a specific depth
    depth = "0-5cm"

    all_data = {}
    for prop in properties:
        params = {
            "lon": round(lon, 4),
            "lat": round(lat, 4),
            "property": prop,
            "depth": depth,
            "value": "mean",
        }

        async with httpx.AsyncClient() as client:
            try:
                resp = await client.get(SOILGRIDS_BASE, params=params, timeout=15)
                resp.raise_for_status()
                data = resp.json()
            except httpx.HTTPStatusError as e:
                logger.warning(f"SoilGrids {prop} error: {e.response.status_code}")
                continue
            except Exception as e:
                logger.error(f"SoilGrids request failed for {prop}: {e}")
                continue

        try:
            layer = data["properties"]["layers"][0]
            depth_info = layer["depths"][0]
            value = depth_info["values"]["mean"]

            # SoilGrids returns values in specific units:
            # pH: pHx10 (divide by 10)
            # SOC: dg/kg (divide by 10 for %)
            # Nitrogen: cg/kg (divide by 100 for g/kg)
            # Clay/Sand/Silt: % (g/kg * 10)

            all_data[prop] = value
        except (KeyError, IndexError) as e:
            logger.warning(f"Failed to parse SoilGrids {prop}: {e}")
            continue

    if not all_data:
        logger.error("No soil data returned from SoilGrids")
        return None

    # Convert SoilGrids units to agricultural units
    ph = all_data.get("phh2o")
    if ph is not None:
        ph = round(ph / 10, 2)  # pHx10 → pH

    soc = all_data.get("soc")
    if soc is not None:
        soc = round(soc / 10, 2)  # dg/kg → %

    nitrogen = all_data.get("nitrogen")
    if nitrogen is not None:
        nitrogen = round(nitrogen / 100, 2)  # cg/kg → g/kg

    # Estimate NPK from soil properties
    # SoilGrids doesn't directly give NPK, so we use proxies:
    # N ≈ from nitrogen content
    # P, K are not available from SoilGrids — use typical ranges
    result = {
        "N": round(nitrogen * 100, 1) if nitrogen else 50.0,  # Convert g/kg to mg/kg approximate
        "P": 40.0,  # Default moderate P (not available from SoilGrids)
        "K": 45.0,  # Default moderate K (not available from SoilGrids)
        "pH": ph if ph else 6.5,
        "moisture_pct": round(
            (all_data.get("clay", 30) / 100) * 40,  # Rough estimate from clay content
            1,
        ),
        "organic_carbon_pct": soc if soc else 1.0,
        "texture": {
            "clay_pct": round(all_data.get("clay", 0) / 10, 1),
            "sand_pct": round(all_data.get("sand", 0) / 10, 1),
            "silt_pct": round(all_data.get("silt", 0) / 10, 1),
        },
        "source": "SoilGrids",
        "depth": depth,
    }

    logger.info(f"Soil data for ({lat}, {lon}): pH={result['pH']}, SOC={result['organic_carbon_pct']}%, N={result['N']}")
    return result