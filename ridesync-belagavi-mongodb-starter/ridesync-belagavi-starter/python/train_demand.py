"""Chronological evaluation of Gradient Boosting trained on synthetic zone-hour demand.
Input expected: CSV exported with `npm run export:demand -- ../python/demand_history_export.csv`
Or use --csv with compatible column names.
Outputs predictions.json and model_report.json to --out folder.
"""
import argparse,json
from pathlib import Path
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import HistGradientBoostingRegressor
from sklearn.metrics import mean_absolute_error,mean_squared_error
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OrdinalEncoder

parser=argparse.ArgumentParser()
parser.add_argument('--csv',required=True)
parser.add_argument('--out',default='python')
a=parser.parse_args();out=Path(a.out);out.mkdir(parents=True,exist_ok=True)
df=pd.read_csv(a.csv)
required={'zone_code','bucket_start','local_hour','local_day_of_week','request_count'}
if required-set(df.columns):raise ValueError(f'Missing columns: {sorted(required-set(df.columns))}')
df=df.dropna(subset=list(required)).copy()
df['bucket_start']=pd.to_datetime(df['bucket_start'],utc=True)
df=df.sort_values('bucket_start')
if df['zone_code'].nunique()<2 or len(df)<500:raise ValueError('Need multiple zones and at least 500 history rows')
features=['zone_code','local_hour','local_day_of_week']
pre=ColumnTransformer([('zone',OrdinalEncoder(handle_unknown='use_encoded_value',unknown_value=-1),['zone_code'])],remainder='passthrough')
model=Pipeline([('prep',pre),('boost',HistGradientBoostingRegressor(max_iter=90,max_leaf_nodes=13,l2_regularization=2,random_state=42))])
cutoff=df['bucket_start'].max()-pd.Timedelta(days=7)
train=df[df.bucket_start<=cutoff]
test=df[df.bucket_start>cutoff]
if train.empty or test.empty:raise ValueError('Need >7 days of history for chronological holdout')
model.fit(train[features],train['request_count'])
pred=model.predict(test[features]).clip(min=0)
# Same-zone, same-hour baseline from TRAIN ONLY. No future data leakage.
lookup=train.groupby(['zone_code','local_hour'])['request_count'].mean()
global_avg=float(train.request_count.mean())
baseline=[float(lookup.get((row.zone_code,row.local_hour),global_avg)) for row in test.itertuples()]
report={'trainingData':'SYNTHETIC','evaluation':'chronological final 7 days','trainRows':len(train),'testRows':len(test),
   'testMAE':round(float(mean_absolute_error(test.request_count,pred)),3),
   'testRMSE':round(float(mean_squared_error(test.request_count,pred)**.5),3),
   'baselineMAE':round(float(mean_absolute_error(test.request_count,baseline)),3),
   'method':'HistGradientBoostingRegressor','limitations':'Performance on synthetic demand does not prove real-world Belagavi accuracy.'}
(out/'model_report.json').write_text(json.dumps(report,indent=2))
# Retrain using all observed synthetic history after evaluating held-out periods.
model.fit(df[features],df['request_count'])
next_hour=pd.Timestamp.now(tz='Asia/Kolkata').ceil('h')
rows=[]
for dt in pd.date_range(next_hour,periods=24,freq='h'):
  for zone in sorted(df.zone_code.unique()):
    rows.append({'zone_code':str(zone),'local_hour':dt.hour,'local_day_of_week':(dt.dayofweek+1)%7,
       'forecastFor':dt.tz_convert('UTC').isoformat()})
future=pd.DataFrame(rows)
values=model.predict(future[features]).clip(min=0)
forecasts=[{'zoneCode':r.zone_code,'forecastFor':r.forecastFor,
            'predictedRequests':round(float(v),2),'modelVersion':'hgb-synthetic-v1'}
           for r,v in zip(future.itertuples(index=False),values)]
(out/'predictions.json').write_text(json.dumps(forecasts,indent=2))
print(json.dumps(report,indent=2));print('Wrote predictions:',len(forecasts))
