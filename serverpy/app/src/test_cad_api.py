"""
Test script for CAD API - validates the Python rewrite functionality
"""
import requests
import json
import time
from typing import Dict, Any


class CADAPITester:
    """Test client for CAD API endpoints"""
    
    def __init__(self, base_url: str = "http://localhost:8080"):
        self.base_url = base_url
        self.session_id = f"test_session_{int(time.time())}"
        self.created_shapes = []
    
    def test_health_check(self) -> bool:
        """Test health check endpoint"""
        try:
            response = requests.get(f"{self.base_url}/api/v1/health")
            
            if response.status_code == 200:
                data = response.json()
                print(f"✅ Health check: {data['data']['status']}")
                return True
            else:
                print(f"❌ Health check failed: {response.status_code}")
                return False
                
        except Exception as e:
            print(f"❌ Health check error: {e}")
            return False
    
    def test_create_box(self) -> str:
        """Test box creation"""
        try:
            payload = {
                "type": "box",
                "parameters": {
                    "width": 20.0,
                    "height": 15.0,
                    "depth": 10.0
                },
                "session_id": self.session_id
            }
            
            response = requests.post(
                f"{self.base_url}/api/v1/models",
                json=payload
            )
            
            if response.status_code == 200:
                data = response.json()
                if data["success"]:
                    model_id = data["data"]["model_id"]
                    mesh_data = data["data"]["mesh_data"]
                    print(f"✅ Box created: {model_id}")
                    print(f"   📊 Vertices: {mesh_data['metadata']['vertex_count']}")
                    print(f"   📊 Faces: {mesh_data['metadata']['face_count']}")
                    self.created_shapes.append(model_id)
                    return model_id
                else:
                    print(f"❌ Box creation failed: {data.get('error', 'Unknown error')}")
                    return ""
            else:
                print(f"❌ Box creation failed: HTTP {response.status_code}")
                return ""
                
        except Exception as e:
            print(f"❌ Box creation error: {e}")
            return ""
    
    def test_create_sphere(self) -> str:
        """Test sphere creation"""
        try:
            payload = {
                "type": "sphere",
                "parameters": {
                    "radius": 8.0,
                    "center": {"x": 5.0, "y": 0.0, "z": 0.0}
                },
                "session_id": self.session_id
            }
            
            response = requests.post(
                f"{self.base_url}/api/v1/models",
                json=payload
            )
            
            if response.status_code == 200:
                data = response.json()
                if data["success"]:
                    model_id = data["data"]["model_id"]
                    mesh_data = data["data"]["mesh_data"]
                    print(f"✅ Sphere created: {model_id}")
                    print(f"   📊 Vertices: {mesh_data['metadata']['vertex_count']}")
                    print(f"   📊 Faces: {mesh_data['metadata']['face_count']}")
                    self.created_shapes.append(model_id)
                    return model_id
                else:
                    print(f"❌ Sphere creation failed: {data.get('error', 'Unknown error')}")
                    return ""
            else:
                print(f"❌ Sphere creation failed: HTTP {response.status_code}")
                return ""
                
        except Exception as e:
            print(f"❌ Sphere creation error: {e}")
            return ""
    
    def test_boolean_operation(self, shape1_id: str, shape2_id: str, operation: str = "union") -> str:
        """Test boolean operations"""
        try:
            payload = {
                "operation": operation,
                "parameters": {
                    "shape1_id": shape1_id,
                    "shape2_id": shape2_id,
                    "result_id": f"{operation}_result_{int(time.time())}"
                },
                "session_id": self.session_id
            }
            
            response = requests.post(
                f"{self.base_url}/api/v1/operations",
                json=payload
            )
            
            if response.status_code == 200:
                data = response.json()
                if data["success"]:
                    result_id = data["data"]["result_id"]
                    mesh_data = data["data"]["mesh_data"]
                    print(f"✅ {operation.capitalize()} completed: {result_id}")
                    print(f"   📊 Vertices: {mesh_data['metadata']['vertex_count']}")
                    print(f"   📊 Faces: {mesh_data['metadata']['face_count']}")
                    self.created_shapes.append(result_id)
                    return result_id
                else:
                    print(f"❌ {operation.capitalize()} failed: {data.get('error', 'Unknown error')}")
                    return ""
            else:
                print(f"❌ {operation.capitalize()} failed: HTTP {response.status_code}")
                return ""
                
        except Exception as e:
            print(f"❌ {operation.capitalize()} error: {e}")
            return ""
    
    def test_tessellate(self, shape_id: str) -> bool:
        """Test tessellation endpoint"""
        try:
            payload = {
                "shape_id": shape_id,
                "deflection": 0.05,
                "session_id": self.session_id
            }
            
            response = requests.post(
                f"{self.base_url}/api/v1/tessellate",
                json=payload
            )
            
            if response.status_code == 200:
                data = response.json()
                if data["success"]:
                    mesh_data = data["data"]["mesh_data"]
                    print(f"✅ Tessellation completed for {shape_id}")
                    print(f"   📊 Vertices: {mesh_data['metadata']['vertex_count']}")
                    print(f"   📊 Faces: {mesh_data['metadata']['face_count']}")
                    print(f"   📊 Quality: {mesh_data['metadata']['tessellation_quality']}")
                    return True
                else:
                    print(f"❌ Tessellation failed: {data.get('error', 'Unknown error')}")
                    return False
            else:
                print(f"❌ Tessellation failed: HTTP {response.status_code}")
                return False
                
        except Exception as e:
            print(f"❌ Tessellation error: {e}")
            return False
    
    def test_session_info(self) -> bool:
        """Test session info endpoint"""
        try:
            response = requests.get(f"{self.base_url}/api/v1/sessions/{self.session_id}")
            
            if response.status_code == 200:
                data = response.json()
                if data["success"]:
                    info = data["data"]
                    print(f"✅ Session info retrieved:")
                    print(f"   📝 Session ID: {info['session_id']}")
                    print(f"   📊 Shape count: {info['shape_count']}")
                    print(f"   🔧 Shapes: {', '.join(info['shape_ids'])}")
                    return True
                else:
                    print(f"❌ Session info failed: {data.get('error', 'Unknown error')}")
                    return False
            else:
                print(f"❌ Session info failed: HTTP {response.status_code}")
                return False
                
        except Exception as e:
            print(f"❌ Session info error: {e}")
            return False
    
    def run_full_test(self) -> bool:
        """Run comprehensive API test"""
        print("🧪 Starting CAD API Test Suite")
        print("=" * 50)
        
        # Test health
        if not self.test_health_check():
            return False
        
        print("\n📦 Testing primitive creation...")
        
        # Create shapes
        box_id = self.test_create_box()
        if not box_id:
            return False
        
        sphere_id = self.test_create_sphere()
        if not sphere_id:
            return False
        
        print("\n🔀 Testing boolean operations...")
        
        # Test boolean operations
        union_id = self.test_boolean_operation(box_id, sphere_id, "union")
        if not union_id:
            return False
        
        cut_id = self.test_boolean_operation(box_id, sphere_id, "cut")
        if not cut_id:
            return False
        
        print("\n🔍 Testing tessellation...")
        
        # Test tessellation
        if not self.test_tessellate(union_id):
            return False
        
        print("\n📋 Testing session management...")
        
        # Test session info
        if not self.test_session_info():
            return False
        
        print("\n✅ All tests passed!")
        print(f"📊 Total shapes created: {len(self.created_shapes)}")
        print("=" * 50)
        
        return True


def main():
    """Main test function"""
    print("🧪 CAD API Test Client")
    print("Make sure the CAD server is running on localhost:8080")
    print("")
    
    tester = CADAPITester()
    
    # Wait for user confirmation
    input("Press Enter to start tests...")
    
    success = tester.run_full_test()
    
    if success:
        print("🎉 All tests completed successfully!")
        return 0
    else:
        print("❌ Some tests failed!")
        return 1


if __name__ == "__main__":
    import sys
    sys.exit(main()) 