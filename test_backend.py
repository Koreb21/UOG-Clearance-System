#!/usr/bin/env python
import requests
import json

base_url = "http://127.0.0.1:8080"

# Test health endpoint
print("=" * 60)
print("Testing Backend Health Endpoint")
print("=" * 60)
try:
    resp = requests.get(f"{base_url}/api/v1/health", timeout=5)
    print(f"Status: {resp.status_code}")
    print(f"Response: {resp.text}")
except Exception as e:
    print(f"Error: {e}")

print("\n" + "=" * 60)
print("Testing Backend Login Endpoint (Admin)")
print("=" * 60)
try:
    resp = requests.post(
        f"{base_url}/api/v1/auth/login",
        json={"username": "admin", "password": "admin@123"},
        timeout=5
    )
    print(f"Status: {resp.status_code}")
    if resp.status_code == 200:
        data = resp.json()
        print(f"Response: {json.dumps(data, indent=2)}")
        token = data.get("accessToken", "")
        if token:
            print(f"\nToken generated (first 30 chars): {token[:30]}...")
            # Test current user endpoint
            print("\n" + "=" * 60)
            print("Testing Current User Endpoint with Token")
            print("=" * 60)
            resp2 = requests.get(
                f"{base_url}/api/v1/auth/me",
                headers={"Authorization": f"Bearer {token}"},
                timeout=5
            )
            print(f"Status: {resp2.status_code}")
            print(f"Response: {resp2.text}")
    else:
        print(f"Response: {resp.text}")
except Exception as e:
    print(f"Error: {e}")

print("\n" + "=" * 60)
print("Backend Testing Complete")
print("=" * 60)
