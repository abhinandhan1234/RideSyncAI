"""Download real OSM roads and POIs for a Belagavi city-centred study area.

Output: belagavi_roads.graphml, belagavi_pois.csv, boundary_of_study_area.geojson.
The study area is NOT a verified set of Belagavi administrative zones; get verified KGIS
polygons separately. Run on a computer with internet access (Overpass is public and rate limited).
"""
import argparse
from pathlib import Path
import osmnx as ox
import geopandas as gpd
from shapely.geometry import Point

p=argparse.ArgumentParser()
p.add_argument('--out',default='data/osm')
p.add_argument('--lat',type=float,default=15.8497)
p.add_argument('--lon',type=float,default=74.4977)
p.add_argument('--radius-m',type=int,default=9000)
a=p.parse_args(); out=Path(a.out);out.mkdir(parents=True,exist_ok=True)
print('Downloading OSM driving network (this requires internet) ...')
G=ox.graph_from_point((a.lat,a.lon),dist=a.radius_m,network_type='drive',simplify=True)
ox.save_graphml(G,filepath=out/'belagavi_roads.graphml')
print('Graph saved:',len(G.nodes),'nodes,',len(G.edges),'edges')
print('Downloading OSM points of interest ...')
tags={'amenity':True,'railway':['station'],'public_transport':True,'shop':True}
poi=ox.features_from_point((a.lat,a.lon),tags=tags,dist=a.radius_m)
if not poi.empty:
    poi=poi.to_crs(4326)
    # Accurate point-on-surface estimate: use projected representative point for polygons
    geom_proj=poi.to_crs(poi.estimate_utm_crs()).geometry.representative_point()
    geom=geom_proj.to_crs(4326)
    rows=[]
    for (osm_type,osm_id), (_,item),pt in zip(poi.index,poi.iterrows(),geom):
        rows.append({'osm_type':str(osm_type),'osm_id':str(osm_id),
                     'name':str(item.get('name','')) if item.get('name') is not None else '',
                     'amenity':str(item.get('amenity','')),
                     'railway':str(item.get('railway','')),
                     'shop':str(item.get('shop','')),
                     'lat':pt.y,'lng':pt.x,'source':'OPENSTREETMAP'})
    import pandas as pd
    pd.DataFrame(rows).to_csv(out/'belagavi_pois.csv',index=False)
    print('POIs:',len(rows))
else:
    (out/'belagavi_pois.csv').write_text('osm_type,osm_id,name,amenity,railway,shop,lat,lng,source\n')
# Output study extent, not fabricated 8-zone official boundaries
study=gpd.GeoDataFrame({'name':['Belagavi study buffer'],'verified_admin_zone':[False]},
    geometry=[Point(a.lon,a.lat)],crs='EPSG:4326').to_crs(32643)
study.geometry=study.buffer(a.radius_m)
study.to_crs(4326).to_file(out/'study_area_only.geojson',driver='GeoJSON')
print('Done. study_area_only.geojson is not a verified administrative boundary.')
