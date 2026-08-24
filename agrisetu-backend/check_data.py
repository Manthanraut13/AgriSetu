from config import settings
from supabase import create_client
supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)

print("=== FARM PLOTS ===")
plots = supabase.table("farm_plots").select("*").execute()
for p in plots.data[:3]:
    pid = p["id"][:8]
    print(f"  {pid}... | crop={p.get('current_crop')} | {p.get('district')}, {p.get('state')} | area={p.get('area_ha')}ha | lat={p.get('center_lat')} lon={p.get('center_lon')}")
print(f"  Total: {len(plots.data)}")

print("\n=== NDVI ===")
ndvi = supabase.table("ndvi_snapshots").select("*").execute()
for n in ndvi.data[:3]:
    pid = n["plot_id"][:8]
    print(f"  {pid}... | ndvi={n.get('ndvi')} | ndmi={n.get('ndmi')} | {n.get('source')}")
print(f"  Total: {len(ndvi.data)}")

print("\n=== SOIL ===")
soil = supabase.table("soil_data").select("*").execute()
for s in soil.data[:3]:
    pid = s["plot_id"][:8]
    print(f"  {pid}... | N={s.get('N')} P={s.get('P')} K={s.get('K')} pH={s.get('pH')} moisture={s.get('moisture_pct')}")
print(f"  Total: {len(soil.data)}")

print("\n=== WEATHER ===")
weather = supabase.table("weather_cache").select("*").execute()
for w in weather.data[:3]:
    pid = w["plot_id"][:8]
    print(f"  {pid}... | temp={w.get('temp_c')}C humidity={w.get('humidity_pct')}% rain={w.get('rainfall_mm')}mm desc={w.get('description')}")
print(f"  Total: {len(weather.data)}")

print("\n=== DISEASE REPORTS ===")
disease = supabase.table("disease_reports").select("*").execute()
for d in disease.data[:3]:
    pid = (d.get("plot_id") or "N/A")[:8]
    print(f"  {pid}... | disease={d.get('disease_name')} | conf={d.get('confidence')} | severity={d.get('severity')}")
print(f"  Total: {len(disease.data)}")

print("\n=== ADVISORIES ===")
adv = supabase.table("advisories").select("*").execute()
for a in adv.data[:3]:
    pid = (a.get("plot_id") or "N/A")[:8]
    print(f"  {pid}... | crop={a.get('recommended_crop')} | conf={a.get('confidence')} | practices={a.get('regenerative_practices')}")
print(f"  Total: {len(adv.data)}")

print("\n=== FARMERS ===")
farmers = supabase.table("farmers").select("*").execute()
for f in farmers.data[:3]:
    fid = f["id"][:8]
    print(f"  {fid}... | name={f.get('name')} | phone={f.get('phone')} | lang={f.get('language_pref')}")
print(f"  Total: {len(farmers.data)}")
