#!/usr/bin/env python3
import os, sys, json, subprocess, shlex
from pathlib import Path

SECRETS = Path(__file__).resolve().parents[1]/'.secrets.env'
CLIENT_ID=None; CLIENT_SECRET=None; REFRESH_TOKEN=None
for line in SECRETS.read_text().splitlines():
    line=line.strip()
    if not line or line.startswith('#'): continue
    if line.startswith('GOOGLE_OAUTH_CLIENT_ID='): CLIENT_ID=line.split('=',1)[1]
    elif line.startswith('GOOGLE_OAUTH_CLIENT_SECRET='): CLIENT_SECRET=line.split('=',1)[1]
    elif line.startswith('GOOGLE_OAUTH_REFRESH_TOKEN='): REFRESH_TOKEN=line.split('=',1)[1]
if not (CLIENT_ID and CLIENT_SECRET and REFRESH_TOKEN):
    print(json.dumps({'error':'missing_env','have':{
        'client_id':bool(CLIENT_ID),'client_secret':bool(CLIENT_SECRET),'refresh_token':bool(REFRESH_TOKEN)
    }}, indent=2))
    sys.exit(1)

def curl_json(args, data=None):
    cmd = ["curl","-sS"] + args
    if data is not None:
        cmd += ["--data", data]
    out = subprocess.check_output(cmd)
    return json.loads(out.decode())

def post_token():
    data = f"client_id={CLIENT_ID}&client_secret={CLIENT_SECRET}&refresh_token={REFRESH_TOKEN}&grant_type=refresh_token"
    return curl_json(["-H","Content-Type: application/x-www-form-urlencoded","-X","POST","https://oauth2.googleapis.com/token"], data)

def values_get(spreadsheet_id, rng):
    tok = post_token()
    at = tok.get('access_token')
    if not at:
        return {'error':'no_access_token','token':tok}
    url = f"https://sheets.googleapis.com/v4/spreadsheets/{spreadsheet_id}/values/{rng}"
    return curl_json(["-H", f"Authorization: Bearer {at}", url])

if __name__=='__main__':
    sheet_id=sys.argv[1] if len(sys.argv)>1 else None
    rng=sys.argv[2] if len(sys.argv)>2 else 'A1:D5'
    if not sheet_id:
        print('usage: google-sheets-test.py <spreadsheetId> [A1:D5]')
        sys.exit(2)
    try:
        out=values_get(sheet_id, rng)
        print(json.dumps(out, ensure_ascii=False, indent=2))
    except subprocess.CalledProcessError as e:
        print(json.dumps({'error':'curl_failed','detail':e.output.decode() if e.output else str(e)}))
        sys.exit(1)
