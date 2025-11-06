import requests
import json

# Test enrollment with debug info
base_url = "https://biometric-banking.preview.emergentagent.com"
api_url = f"{base_url}/api"

# Generate a single synthetic iris
print("Generating synthetic iris...")
response = requests.get(f"{api_url}/generate-synthetic-iris?seed=100")
if response.status_code == 200:
    frame1 = response.json()['image']
    print("✅ Frame 1 generated")
else:
    print(f"❌ Failed to generate frame 1: {response.status_code}")
    exit(1)

# Generate more frames with different seeds
frames = [frame1]
for seed in [200, 300, 400, 500]:
    response = requests.get(f"{api_url}/generate-synthetic-iris?seed={seed}")
    if response.status_code == 200:
        frames.append(response.json()['image'])
        print(f"✅ Frame with seed {seed} generated")
    else:
        print(f"❌ Failed to generate frame with seed {seed}")

print(f"Total frames: {len(frames)}")

# Test enrollment
enrollment_data = {
    "name": "Debug User",
    "account_number": "DEBUG123",
    "email": "[email protected]",
    "consent": True,
    "frames": frames
}

print("\nTesting enrollment...")
response = requests.post(f"{api_url}/enroll", json=enrollment_data)
print(f"Status: {response.status_code}")
print(f"Response: {response.text}")

if response.status_code != 200:
    print("\n❌ Enrollment failed. Let's check what's in the response...")
    try:
        error_data = response.json()
        print(f"Error detail: {error_data}")
    except:
        print(f"Raw response: {response.text}")