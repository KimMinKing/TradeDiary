# [파일 용도] 컴퓨터 비전 기반 차트 패턴 분석 서비스

import logging
from typing import Dict, List, Optional, Tuple
from datetime import datetime
import numpy as np
import cv2
import asyncio

logger = logging.getLogger(__name__)

class ChartAnalysisService:
    """차트 분석 서비스 - 컴퓨터 비전 기반 패턴 인식"""

    def __init__(self):
        self.model = None
        self.processor = None
        self.yolo_model = None
        self.vit_model = None
        self._initialized = False
        self._initialize_lock = asyncio.Lock()
        self._torch = None
        self.device = None
        self.patterns = self._define_chart_patterns()

    async def initialize(self):
        """서비스 초기화"""
        try:
            logger.info("Loading chart analysis models...")

            # YOLOv8 모델 로드 (경량화 버전)
            try:
                from ultralytics import YOLO
                self.yolo_model = YOLO('yolov8n.pt')
                logger.info("YOLOv8 model loaded successfully")
            except Exception as e:
                logger.warning(f"YOLOv8 not available: {e}")
                self.yolo_model = None

            # Vision Transformer 모델 로드
            try:
                import torch
                from transformers import AutoImageProcessor, AutoModel

                self._torch = torch
                self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
                self.processor = AutoImageProcessor.from_pretrained("google/vit-base-patch16-224")
                self.vit_model = AutoModel.from_pretrained("google/vit-base-patch16-224")
                self.vit_model.to(self.device)
                self.vit_model.eval()
                logger.info("Vision Transformer model loaded successfully")
            except Exception as e:
                logger.warning(f"Vision Transformer not available: {e}")
                self.vit_model = None

            logger.info("Chart analysis service initialized")
        except Exception as e:
            logger.error(f"Failed to initialize chart analysis: {e}")

    def _define_chart_patterns(self) -> Dict:
        """차트 패턴 정의"""
        return {
            "HEAD_AND_SHOULDERS": {
                "name": "헤드앤숄더",
                "description": "추세 전환 패턴",
                "confidence_threshold": 0.7,
                "signals": ["breakout", "breakdown"]
            },
            "DOUBLE_TOP": {
                "name": "더블 탑",
                "description": "하락 신호 패턴",
                "confidence_threshold": 0.8,
                "signals": ["breakdown"]
            },
            "TRIANGLE": {
                "name": "삼각수렴",
                "description": "변동성 축소 패턴",
                "confidence_threshold": 0.6,
                "signals": ["breakout", "breakdown"]
            },
            "FLAG_PATTERN": {
                "name": "플래그 패턴",
                "description": "추세 연속 패턴",
                "confidence_threshold": 0.7,
                "signals": ["continuation"]
            },
            "WEDGE": {
                "name": "워지 패턴",
                "description": "추세 강도 패턴",
                "confidence_threshold": 0.65,
                "signals": ["breakout", "breakdown"]
            }
        }

    def preprocess_chart_image(self, image_path: str) -> np.ndarray:
        """
        차트 이미지 전처리
        """
        try:
            # 이미지 로드
            image = cv2.imread(image_path)
            if image is None:
                raise ValueError("Cannot load image")

            # 그레이스케일 변환
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

            # 노이즈 제거
            denoised = cv2.fastNlMeansDenoising(gray, h=10)

            # 대비 증가
            clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
            enhanced = clahe.apply(denoised)

            # 크기 조정 (256x256)
            resized = cv2.resize(enhanced, (256, 256), interpolation=cv2.INTER_AREA)

            return resized

        except Exception as e:
            logger.error(f"Image preprocessing failed: {e}")
            return None

    def detect_grid_lines(self, image: np.ndarray) -> np.ndarray:
        """
        차트 배경 격자선 제거
        """
        try:
            # 에지 검출
            edges = cv2.Canny(image, 50, 150, apertureSize=3)

            # 수직선과 수평선 분리
            kernel_vertical = np.ones((1, 20), np.uint8)
            kernel_horizontal = np.ones((20, 1), np.uint8)

            vertical_lines = cv2.morphologyEx(edges, cv2.MORPH_CLOSE, kernel_vertical)
            horizontal_lines = cv2.morphologyEx(edges, cv2.MORPH_CLOSE, kernel_horizontal)

            # 격자선 마스킹
            grid_mask = cv2.bitwise_or(vertical_lines, horizontal_lines)
            masked_image = cv2.bitwise_and(image, image, mask=cv2.bitwise_not(grid_mask))

            return masked_image

        except Exception as e:
            logger.error(f"Grid line detection failed: {e}")
            return image

    def extract_candlestick_features(self, image: np.ndarray) -> List[Dict]:
        """
        캔들스틱 특징 추출
        """
        features = []

        # 이미지를 영역으로 분할
        height, width = image.shape
        candle_width = width // 50  # 50개 캔들 가정

        for i in range(50):
            x = i * candle_width
            candle_roi = image[:, x:x+candle_width]

            # 캔들 형태 분석
            open_price = np.mean(candle_roi[:height//3])
            high_price = np.max(candle_roi)
            low_price = np.min(candle_roi)
            close_price = np.mean(candle_roi[2*height//3:])

            # 캔드 종류 식별
            if close_price > open_price:
                color = "green"
                body_ratio = (close_price - open_price) / (high_price - low_price)
                shadow_ratio = 1 - body_ratio
            else:
                color = "red"
                body_ratio = (open_price - close_price) / (high_price - low_price)
                shadow_ratio = 1 - body_ratio

            features.append({
                "position": i,
                "open": open_price,
                "high": high_price,
                "low": low_price,
                "close": close_price,
                "color": color,
                "body_ratio": body_ratio,
                "shadow_ratio": shadow_ratio
            })

        return features

    async def analyze_patterns(self, image_path: str) -> Dict:
        """
        차트 패턴 분석 수행
        """
        try:
            if not self._initialized:
                async with self._initialize_lock:
                    if not self._initialized:
                        await self.initialize()
                        self._initialized = True

            # 이미지 전처리
            processed_image = self.preprocess_chart_image(image_path)
            if processed_image is None:
                return {"error": "Image processing failed"}

            # 격자선 제거
            no_grid_image = self.detect_grid_lines(processed_image)

            # 캔들스틱 특징 추출
            candle_features = self.extract_candlestick_features(no_grid_image)

            # 패턴 감지
            detected_patterns = await self._detect_chart_patterns(no_grid_image, candle_features)

            # 시각적 특징 추출
            visual_features = await self._extract_visual_features(no_grid_image)

            return {
                "timestamp": datetime.now().isoformat(),
                "detected_patterns": detected_patterns,
                "visual_features": visual_features,
                "candle_features": candle_features,
                "analysis_confidence": self._calculate_confidence(detected_patterns, visual_features)
            }

        except Exception as e:
            logger.error(f"Pattern analysis failed: {e}")
            return {"error": str(e)}

    async def _detect_chart_patterns(self, image: np.ndarray, candle_features: List[Dict]) -> List[Dict]:
        """
        차트 패턴 감지
        """
        detected = []

        if self.yolo_model:
            # YOLO를 이용한 기하학적 패턴 탐지
            try:
                results = self.yolo_model(image, verbose=False)
                for result in results:
                    boxes = result.boxes
                    if boxes is not None:
                        for box in boxes:
                            cls = int(box.cls[0])
                            conf = float(box.conf[0])
                            if conf > 0.5:
                                detected.append({
                                    "pattern": f"Pattern_{cls}",
                                    "confidence": conf,
                                    "bbox": box.xyxy[0].tolist()
                                })
            except Exception as e:
                logger.warning(f"YOLO detection failed: {e}")

        # 규칙 기반 패턴 인식
        candle_array = np.array([[f["open"], f["high"], f["low"], f["close"]]
                               for f in candle_features])

        # 헤드앤숄더 패턴 탐지 (간단한 구현)
        has_pattern = self._detect_head_and_shoulders(candle_array)
        if has_pattern["detected"]:
            detected.append(has_pattern)

        return detected

    def _detect_head_and_shoulders(self, prices: np.ndarray) -> Dict:
        """
        헤드앤숄더 패턴 탐지
        """
        try:
            # 실제 구현에서는 더 복잡한 알고리즘 사용
            # 여기서는 간단한 예시 구현
            detected = False
            confidence = 0.0

            # 가격 데이터에서 상대적 고점/저점 찾기
            highs = prices[:, 1]  # High prices
            peaks = []
            for i in range(1, len(highs)-1):
                if highs[i] > highs[i-1] and highs[i] > highs[i+1]:
                    peaks.append(i)

            # 헤드앤숄더 패턴 형태 검사
            if len(peaks) >= 3:
                # 좌우 대칭성 검사
                left_peak = peaks[0]
                middle_peak = peaks[1]
                right_peak = peaks[2]

                # 피크 간격 및 높이 비율
                left_distance = middle_peak - left_peak
                right_distance = right_peak - middle_peak

                if 0.8 < left_distance / right_distance < 1.2:
                    height_ratio = highs[middle_peak] / ((highs[left_peak] + highs[right_peak]) / 2)
                    if 1.1 < height_ratio < 1.4:
                        detected = True
                        confidence = 0.75

            return {
                "pattern": "HEAD_AND_SHOULDERS",
                "detected": detected,
                "confidence": confidence,
                "peaks": peaks
            }

        except Exception as e:
            logger.error(f"Head and shoulders detection failed: {e}")
            return {"pattern": "HEAD_AND_SHOULDERS", "detected": False, "confidence": 0.0}

    async def _extract_visual_features(self, image: np.ndarray) -> Dict:
        """
        시각적 특징 추출 (Vision Transformer 사용)
        """
        if self.vit_model is None:
            return {"error": "Vision Transformer not available"}

        try:
            # 이미지 전처리
            inputs = self.processor(images=image, return_tensors="pt")
            inputs = {k: v.to(self.device) for k, v in inputs.items()}

            # 특징 추출
            with self._torch.no_grad():
                outputs = self.vit_model(**inputs)

            # 마지막 히든 상태 사용
            features = outputs.last_hidden_state.mean(dim=1).cpu().numpy()

            return {
                "visual_features": features.tolist(),
                "feature_dim": features.shape[1]
            }

        except Exception as e:
            logger.error(f"Visual feature extraction failed: {e}")
            return {"error": str(e)}

    def _calculate_confidence(self, patterns: List[Dict], features: Dict) -> float:
        """
        전체 분신 신뢰도 계산
        """
        if not patterns:
            return 0.0

        pattern_confidences = [p.get("confidence", 0) for p in patterns]
        feature_confidence = 1.0 if "error" not in features else 0.5

        avg_pattern_confidence = np.mean(pattern_confidences)
        overall_confidence = (avg_pattern_confidence + feature_confidence) / 2

        return round(overall_confidence, 2)

    def generate_trading_signal(self, analysis_result: Dict) -> Dict:
        """
        분석 결과 기반 매매 신호 생성
        """
        signals = {
            "signal": "HOLD",
            "strength": 0.0,
            "reasoning": []
        }

        try:
            detected_patterns = analysis_result.get("detected_patterns", [])

            for pattern in detected_patterns:
                pattern_name = pattern.get("pattern")
                confidence = pattern.get("confidence", 0)

                if confidence > 0.7:
                    signals["strength"] += confidence
                    signals["reasoning"].append(f"{pattern_name} 패턴 감지 (신뢰도: {confidence:.2f})")

            # 신호 강도에 따른 매매 방향 결정
            if signals["strength"] > 1.5:
                signals["signal"] = "BUY"
            elif signals["strength"] > 0.8:
                signals["signal"] = "WATCH"
            else:
                signals["signal"] = "HOLD"

            signals["strength"] = round(signals["strength"], 2)

        except Exception as e:
            logger.error(f"Signal generation failed: {e}")

        return signals
