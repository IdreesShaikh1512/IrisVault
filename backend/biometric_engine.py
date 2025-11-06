import cv2
import numpy as np
from PIL import Image
import io
import base64
from scipy.spatial.distance import hamming, cosine
from skimage import filters, exposure, transform
from skimage.feature import local_binary_pattern, hog
from Crypto.Cipher import AES
from Crypto.Random import get_random_bytes
from Crypto.Util.Padding import pad, unpad
import hashlib
import os
import logging

logger = logging.getLogger(__name__)

class IrisBiometricEngine:
    """Full iris recognition pipeline with classical CV techniques"""
    
    def __init__(self, encryption_key=None):
        # Use env key or generate for session
        self.encryption_key = encryption_key or os.environ.get('BIOMETRIC_KEY', 'default_key_32bytes_change_me!!')
        self.key_hash = hashlib.sha256(self.encryption_key.encode()).digest()[:32]
        
    def preprocess_frame(self, image_data):
        """Preprocess webcam frame for iris detection
        
        Args:
            image_data: base64 encoded image or numpy array
            
        Returns:
            preprocessed image as numpy array
        """
        try:
            # Decode if base64
            if isinstance(image_data, str):
                img_bytes = base64.b64decode(image_data.split(',')[-1])
                img_array = np.frombuffer(img_bytes, dtype=np.uint8)
                img = cv2.imdecode(img_array, cv2.IMREAD_COLOR)
            else:
                img = image_data
            
            # Convert to grayscale
            if len(img.shape) == 3:
                gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            else:
                gray = img
                
            # Illumination normalization using CLAHE
            clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
            normalized = clahe.apply(gray)
            
            # Denoise
            denoised = cv2.fastNlMeansDenoising(normalized)
            
            return denoised
        except Exception as e:
            logger.error(f"Preprocessing error: {e}")
            return None
    
    def detect_iris_region(self, preprocessed_img):
        """Detect and segment iris region using Hough circles
        
        Returns:
            cropped iris region or None
        """
        try:
            # Apply Gaussian blur
            blurred = cv2.GaussianBlur(preprocessed_img, (5, 5), 0)
            
            # Detect circles (iris boundaries)
            circles = cv2.HoughCircles(
                blurred,
                cv2.HOUGH_GRADIENT,
                dp=1,
                minDist=100,
                param1=50,
                param2=30,
                minRadius=20,
                maxRadius=120
            )
            
            if circles is not None:
                circles = np.uint16(np.around(circles))
                # Take the first detected circle
                x, y, r = circles[0, 0]
                
                # Expand radius slightly for iris region
                r = int(r * 1.3)
                
                # Extract iris region with padding
                h, w = preprocessed_img.shape
                x1 = max(0, x - r)
                y1 = max(0, y - r)
                x2 = min(w, x + r)
                y2 = min(h, y + r)
                
                iris_region = preprocessed_img[y1:y2, x1:x2]
                
                # Resize to standard size
                if iris_region.size > 0:
                    iris_region = cv2.resize(iris_region, (128, 128))
                    return iris_region
            
            # Fallback: use center crop if no circles detected
            h, w = preprocessed_img.shape
            center_crop = preprocessed_img[h//4:3*h//4, w//4:3*w//4]
            if center_crop.size > 0:
                return cv2.resize(center_crop, (128, 128))
                
            return None
            
        except Exception as e:
            logger.error(f"Iris detection error: {e}")
            return None
    
    def extract_features(self, iris_region):
        """Extract features using multiple classical techniques
        
        Combines:
        - Local Binary Patterns (LBP) for texture
        - Histogram of Oriented Gradients (HOG) for structure  
        - Gabor filter responses for frequency analysis
        
        Returns:
            feature vector as numpy array
        """
        try:
            if iris_region is None or iris_region.size == 0:
                return None
            
            features = []
            
            # 1. Local Binary Pattern (LBP) features
            lbp = local_binary_pattern(iris_region, P=8, R=1, method='uniform')
            lbp_hist, _ = np.histogram(lbp.ravel(), bins=32, range=(0, 32))
            lbp_hist = lbp_hist.astype('float32')
            lbp_hist /= (lbp_hist.sum() + 1e-7)  # Normalize
            features.append(lbp_hist)
            
            # 2. HOG features
            hog_features = hog(
                iris_region,
                orientations=8,
                pixels_per_cell=(16, 16),
                cells_per_block=(1, 1),
                visualize=False
            )
            features.append(hog_features[:64])  # Take first 64 features
            
            # 3. Gabor filter responses (multiple orientations)
            gabor_features = []
            for theta in range(4):
                angle = theta / 4. * np.pi
                kernel = cv2.getGaborKernel(
                    (21, 21), 5.0, angle, 10.0, 0.5, 0, ktype=cv2.CV_32F
                )
                filtered = cv2.filter2D(iris_region, cv2.CV_8UC3, kernel)
                gabor_features.append(filtered.mean())
                gabor_features.append(filtered.std())
            features.append(np.array(gabor_features))
            
            # 4. Intensity statistics
            stats = np.array([
                iris_region.mean(),
                iris_region.std(),
                np.median(iris_region),
                iris_region.min(),
                iris_region.max()
            ])
            features.append(stats)
            
            # Concatenate all features
            feature_vector = np.concatenate(features)
            
            # L2 normalization
            feature_vector = feature_vector / (np.linalg.norm(feature_vector) + 1e-7)
            
            return feature_vector.astype('float32')
            
        except Exception as e:
            logger.error(f"Feature extraction error: {e}")
            return None
    
    def create_template(self, frames):
        """Create biometric template from multiple frames
        
        Args:
            frames: list of base64 encoded images
            
        Returns:
            dict with template data and quality score
        """
        try:
            feature_vectors = []
            quality_scores = []
            
            for frame in frames:
                # Preprocess
                preprocessed = self.preprocess_frame(frame)
                if preprocessed is None:
                    continue
                
                # Detect iris
                iris_region = self.detect_iris_region(preprocessed)
                if iris_region is None:
                    continue
                
                # Extract features
                features = self.extract_features(iris_region)
                if features is not None:
                    feature_vectors.append(features)
                    # Quality score based on sharpness and contrast
                    quality = self._calculate_quality(iris_region)
                    quality_scores.append(quality)
            
            if len(feature_vectors) == 0:
                return None
            
            # Average features from multiple frames
            template = np.mean(feature_vectors, axis=0)
            avg_quality = np.mean(quality_scores)
            
            return {
                'template': template,
                'quality_score': float(avg_quality),
                'num_frames': len(feature_vectors)
            }
            
        except Exception as e:
            logger.error(f"Template creation error: {e}")
            return None
    
    def _calculate_quality(self, iris_region):
        """Calculate quality score for iris image"""
        try:
            # Sharpness (Laplacian variance)
            laplacian = cv2.Laplacian(iris_region, cv2.CV_64F)
            sharpness = laplacian.var()
            
            # Contrast (standard deviation)
            contrast = iris_region.std()
            
            # Combined quality score (normalized)
            quality = (sharpness / 100 + contrast / 50) / 2
            quality = min(1.0, quality)  # Cap at 1.0
            
            return quality
        except:
            return 0.5
    
    def encrypt_template(self, template_data):
        """Encrypt biometric template using AES-256
        
        Returns:
            base64 encoded encrypted data
        """
        try:
            # Serialize template
            template_bytes = template_data['template'].tobytes()
            
            # Generate IV
            iv = get_random_bytes(16)
            
            # Encrypt
            cipher = AES.new(self.key_hash, AES.MODE_CBC, iv)
            encrypted = cipher.encrypt(pad(template_bytes, AES.block_size))
            
            # Combine IV + encrypted data
            encrypted_data = iv + encrypted
            
            # Base64 encode
            return base64.b64encode(encrypted_data).decode('utf-8')
            
        except Exception as e:
            logger.error(f"Encryption error: {e}")
            return None
    
    def decrypt_template(self, encrypted_b64):
        """Decrypt biometric template
        
        Returns:
            numpy array of template features
        """
        try:
            # Decode base64
            encrypted_data = base64.b64decode(encrypted_b64)
            
            # Extract IV and ciphertext
            iv = encrypted_data[:16]
            ciphertext = encrypted_data[16:]
            
            # Decrypt
            cipher = AES.new(self.key_hash, AES.MODE_CBC, iv)
            decrypted = unpad(cipher.decrypt(ciphertext), AES.block_size)
            
            # Reconstruct numpy array
            template = np.frombuffer(decrypted, dtype='float32')
            
            return template
            
        except Exception as e:
            logger.error(f"Decryption error: {e}")
            return None
    
    def match_templates(self, template1, template2, threshold=0.15):
        """Match two biometric templates
        
        Args:
            template1, template2: numpy arrays or encrypted base64 strings
            threshold: matching threshold (lower = stricter)
            
        Returns:
            dict with match result and confidence score
        """
        try:
            # Decrypt if needed
            if isinstance(template1, str):
                template1 = self.decrypt_template(template1)
            if isinstance(template2, str):
                template2 = self.decrypt_template(template2)
            
            if template1 is None or template2 is None:
                return {'match': False, 'confidence': 0.0, 'error': 'Decryption failed'}
            
            # Calculate cosine similarity
            similarity = 1 - cosine(template1, template2)
            
            # Calculate Euclidean distance (normalized)
            distance = np.linalg.norm(template1 - template2)
            normalized_distance = distance / (np.sqrt(len(template1)))
            
            # Combined score (higher similarity and lower distance = better match)
            confidence = (similarity + (1 - normalized_distance)) / 2
            
            # Match decision
            match = normalized_distance < threshold
            
            return {
                'match': bool(match),
                'confidence': float(confidence),
                'distance': float(normalized_distance),
                'similarity': float(similarity)
            }
            
        except Exception as e:
            logger.error(f"Matching error: {e}")
            return {'match': False, 'confidence': 0.0, 'error': str(e)}
    
    def check_liveness(self, frames):
        """Basic liveness detection using quality variance
        
        Real eyes show natural micro-movements and quality variation
        Print attacks show uniform quality
        """
        try:
            if len(frames) < 3:
                return {'is_live': False, 'reason': 'Insufficient frames'}
            
            quality_scores = []
            brightness_values = []
            
            for frame in frames:
                preprocessed = self.preprocess_frame(frame)
                if preprocessed is None:
                    continue
                
                iris_region = self.detect_iris_region(preprocessed)
                if iris_region is not None:
                    quality = self._calculate_quality(iris_region)
                    quality_scores.append(quality)
                    brightness_values.append(iris_region.mean())
            
            if len(quality_scores) < 3:
                return {'is_live': False, 'reason': 'Failed to process frames'}
            
            # Check variance (live eyes should have some variation)
            quality_variance = np.var(quality_scores)
            brightness_variance = np.var(brightness_values)
            
            # Live detection rules
            is_live = quality_variance > 0.001 and brightness_variance > 1.0
            
            return {
                'is_live': is_live,
                'quality_variance': float(quality_variance),
                'brightness_variance': float(brightness_variance),
                'confidence': min(1.0, (quality_variance * 100 + brightness_variance / 10) / 2)
            }
            
        except Exception as e:
            logger.error(f"Liveness check error: {e}")
            return {'is_live': False, 'reason': str(e)}


class SyntheticIrisGenerator:
    """Generate synthetic iris images for testing"""
    
    @staticmethod
    def generate(width=400, height=400, seed=None):
        """Generate a synthetic iris image
        
        Returns:
            base64 encoded image
        """
        if seed is not None:
            np.random.seed(seed)
        
        # Create base
        img = np.ones((height, width, 3), dtype=np.uint8) * 255
        center = (width // 2, height // 2)
        
        # Sclera (white)
        cv2.circle(img, center, 150, (245, 245, 245), -1)
        
        # Iris (colored with pattern)
        iris_color = (
            np.random.randint(50, 150),   # Blue/green component
            np.random.randint(80, 160),   # Green component  
            np.random.randint(100, 180)   # Brown component
        )
        cv2.circle(img, center, 80, iris_color, -1)
        
        # Add radial pattern (furrows)
        for angle in range(0, 360, 15):
            rad = np.radians(angle)
            for r in range(30, 80, 5):
                x = int(center[0] + r * np.cos(rad) + np.random.randint(-2, 2))
                y = int(center[1] + r * np.sin(rad) + np.random.randint(-2, 2))
                thickness = np.random.randint(1, 2)
                shade = np.random.randint(-30, 30)
                color = tuple(max(0, min(255, c + shade)) for c in iris_color)
                cv2.circle(img, (x, y), thickness, color, -1)
        
        # Pupil (black)
        cv2.circle(img, center, 30, (0, 0, 0), -1)
        
        # Add slight pupil reflection
        cv2.circle(img, (center[0] - 8, center[1] - 8), 5, (255, 255, 255), -1)
        
        # Add some noise for realism
        noise = np.random.randint(0, 20, (height, width, 3), dtype=np.uint8)
        img = cv2.add(img, noise)
        
        # Add slight blur
        img = cv2.GaussianBlur(img, (3, 3), 0)
        
        # Convert to base64
        _, buffer = cv2.imencode('.jpg', img)
        img_base64 = base64.b64encode(buffer).decode('utf-8')
        
        return f"data:image/jpeg;base64,{img_base64}"
