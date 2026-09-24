import httpx
import time
from backend.config import GROQ_API_KEY

candidates = ['openai/gpt-oss-20b', 'qwen/qwen3.6-27b', 'openai/gpt-oss-120b', 'groq/compound-mini']
for c in candidates:
    t0 = time.time()
    try:
        r = httpx.post(
            'https://api.groq.com/openai/v1/chat/completions',
            headers={'Authorization': f'Bearer {GROQ_API_KEY}', 'Content-Type': 'application/json'},
            json={
                'model': c, 
                'messages': [{'role': 'user', 'content': 'Return a valid json object with key status equal to ok'}],
                'response_format': {'type': 'json_object'}
            },
            timeout=10.0
        )
        print(f'{c}: Status={r.status_code}, Time={time.time()-t0:.2f}s, Response={r.text[:60]}')
    except Exception as e:
        print(f'{c}: Error={e}')
