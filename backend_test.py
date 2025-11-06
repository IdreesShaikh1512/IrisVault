import requests
import sys
import json
from datetime import datetime
import base64
import time

class IrisVaultAPITester:
    def __init__(self, base_url="https://biometric-banking.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []
        self.test_user_data = {
            "name": "Test User",
            "account_number": f"TEST{int(time.time())}",
            "email": "[email protected]",
            "consent": True
        }

    def log_test(self, name, success, details="", error=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name} - PASSED")
        else:
            print(f"❌ {name} - FAILED: {error}")
        
        self.test_results.append({
            "test": name,
            "success": success,
            "details": details,
            "error": error
        })

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        default_headers = {'Content-Type': 'application/json'}
        if headers:
            default_headers.update(headers)

        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=default_headers, timeout=30)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=default_headers, timeout=30)

            success = response.status_code == expected_status
            
            if success:
                self.log_test(name, True, f"Status: {response.status_code}")
                try:
                    return True, response.json()
                except:
                    return True, response.text
            else:
                error_msg = f"Expected {expected_status}, got {response.status_code}"
                try:
                    error_detail = response.json()
                    error_msg += f" - {error_detail}"
                except:
                    error_msg += f" - {response.text}"
                self.log_test(name, False, error=error_msg)
                return False, {}

        except Exception as e:
            self.log_test(name, False, error=str(e))
            return False, {}

    def generate_synthetic_iris_frames(self, count=5):
        """Generate synthetic iris frames for testing with variance"""
        print(f"\n🎨 Generating {count} synthetic iris frames with variance...")
        frames = []
        
        # Use different seeds to create variance for liveness detection
        seeds = [100, 250, 400, 550, 700, 850, 1000]
        
        for i in range(count):
            try:
                # Use varied seeds to create different images
                seed = seeds[i % len(seeds)] + (i * 50)
                success, response = self.run_test(
                    f"Generate Synthetic Iris {i+1}",
                    "GET",
                    f"generate-synthetic-iris?seed={seed}",
                    200
                )
                if success and 'image' in response:
                    frames.append(response['image'])
                else:
                    # Fallback: create a simple base64 image
                    frames.append("data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA/8A8A")
            except Exception as e:
                print(f"   Failed to generate frame {i+1}: {e}")
                # Use fallback frame
                frames.append("data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA/8A8A")
        
        print(f"   Generated {len(frames)} frames with varied seeds")
        return frames

    def test_api_root(self):
        """Test API root endpoint"""
        return self.run_test("API Root", "GET", "", 200)

    def test_enrollment_flow(self):
        """Test complete enrollment flow"""
        print(f"\n📝 Testing Enrollment Flow for account: {self.test_user_data['account_number']}")
        
        # Generate synthetic frames
        frames = self.generate_synthetic_iris_frames(5)
        
        # Test enrollment
        enrollment_data = {
            **self.test_user_data,
            "frames": frames
        }
        
        success, response = self.run_test(
            "User Enrollment",
            "POST",
            "enroll",
            200,
            enrollment_data
        )
        
        if success:
            print(f"   Enrollment ID: {response.get('enrollment_id', 'N/A')}")
            print(f"   Quality Score: {response.get('quality_score', 'N/A')}")
            return True, response
        return False, {}

    def test_verification_flow(self):
        """Test iris verification"""
        print(f"\n👁️ Testing Verification Flow")
        
        # Generate verification frames (fewer frames)
        frames = self.generate_synthetic_iris_frames(3)
        
        verification_data = {
            "account_number": self.test_user_data["account_number"],
            "frames": frames
        }
        
        success, response = self.run_test(
            "Iris Verification",
            "POST",
            "verify",
            200,
            verification_data
        )
        
        if success:
            print(f"   Match: {response.get('match', False)}")
            print(f"   Confidence: {response.get('confidence', 0)}")
        
        return success, response

    def test_account_balance(self):
        """Test balance retrieval"""
        return self.run_test(
            "Get Account Balance",
            "GET",
            f"account/{self.test_user_data['account_number']}/balance",
            200
        )

    def test_transactions(self):
        """Test transaction operations"""
        print(f"\n💰 Testing Transaction Operations")
        
        # Test deposit
        deposit_success, deposit_response = self.run_test(
            "Deposit Transaction",
            "POST",
            "transaction",
            200,
            {
                "account_number": self.test_user_data["account_number"],
                "type": "deposit",
                "amount": 500.0
            }
        )
        
        # Test withdrawal
        withdraw_success, withdraw_response = self.run_test(
            "Withdraw Transaction",
            "POST",
            "transaction",
            200,
            {
                "account_number": self.test_user_data["account_number"],
                "type": "withdraw",
                "amount": 100.0
            }
        )
        
        # Test balance check
        check_success, check_response = self.run_test(
            "Check Balance Transaction",
            "POST",
            "transaction",
            200,
            {
                "account_number": self.test_user_data["account_number"],
                "type": "check",
                "amount": 0
            }
        )
        
        return all([deposit_success, withdraw_success, check_success])

    def test_fallback_authentication(self):
        """Test fallback PIN authentication"""
        print(f"\n🔐 Testing Fallback Authentication")
        
        # Get demo PIN
        pin_success, pin_response = self.run_test(
            "Get Demo PIN",
            "GET",
            f"fallback/pin/{self.test_user_data['account_number']}",
            200
        )
        
        if pin_success and 'demo_pin' in pin_response:
            demo_pin = pin_response['demo_pin']
            print(f"   Demo PIN: {demo_pin}")
            
            # Test fallback verification
            fallback_success, fallback_response = self.run_test(
                "Fallback Verification",
                "POST",
                "fallback/verify",
                200,
                {
                    "account_number": self.test_user_data["account_number"],
                    "fingerprint_pin": demo_pin
                }
            )
            
            return fallback_success
        
        return False

    def test_admin_endpoints(self):
        """Test admin endpoints"""
        print(f"\n👨‍💼 Testing Admin Endpoints")
        
        # Test get all users
        users_success, users_response = self.run_test(
            "Admin - Get All Users",
            "GET",
            "admin/users",
            200
        )
        
        # Test get audit logs
        logs_success, logs_response = self.run_test(
            "Admin - Get Audit Logs",
            "GET",
            "admin/audit-logs?limit=10",
            200
        )
        
        # Test get biometrics metadata
        bio_success, bio_response = self.run_test(
            "Admin - Get Biometrics Metadata",
            "GET",
            "admin/biometrics",
            200
        )
        
        return all([users_success, logs_success, bio_success])

    def test_transaction_history(self):
        """Test transaction history retrieval"""
        return self.run_test(
            "Get Transaction History",
            "GET",
            f"transactions/{self.test_user_data['account_number']}?limit=10",
            200
        )

    def run_all_tests(self):
        """Run complete test suite"""
        print("🚀 Starting IRISVAULT Backend API Tests")
        print(f"   Base URL: {self.base_url}")
        print(f"   Test Account: {self.test_user_data['account_number']}")
        print("=" * 60)
        
        # Test API availability
        api_success, _ = self.test_api_root()
        if not api_success:
            print("❌ API is not accessible. Stopping tests.")
            return False
        
        # Test enrollment (prerequisite for other tests)
        enrollment_success, _ = self.test_enrollment_flow()
        if not enrollment_success:
            print("❌ Enrollment failed. Some tests may fail.")
        
        # Test verification
        self.test_verification_flow()
        
        # Test account operations
        self.test_account_balance()
        self.test_transactions()
        self.test_transaction_history()
        
        # Test fallback authentication
        self.test_fallback_authentication()
        
        # Test admin endpoints
        self.test_admin_endpoints()
        
        # Print summary
        print("\n" + "=" * 60)
        print(f"📊 Test Summary: {self.tests_passed}/{self.tests_run} tests passed")
        success_rate = (self.tests_passed / self.tests_run * 100) if self.tests_run > 0 else 0
        print(f"   Success Rate: {success_rate:.1f}%")
        
        if success_rate >= 80:
            print("✅ Backend API tests mostly successful!")
        elif success_rate >= 60:
            print("⚠️ Backend API has some issues but core functionality works")
        else:
            print("❌ Backend API has significant issues")
        
        return success_rate >= 60

def main():
    tester = IrisVaultAPITester()
    success = tester.run_all_tests()
    
    # Save detailed results
    with open('/app/backend_test_results.json', 'w') as f:
        json.dump({
            'timestamp': datetime.now().isoformat(),
            'success_rate': (tester.tests_passed / tester.tests_run * 100) if tester.tests_run > 0 else 0,
            'tests_passed': tester.tests_passed,
            'tests_run': tester.tests_run,
            'test_results': tester.test_results
        }, f, indent=2)
    
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())