#!/usr/bin/env python3
"""
Subscribe to /color/mobilenet_detections.
Supports either:
- depthai_ros_msgs/SpatialDetectionArray  (with 3D position)
- vision_msgs/Detection2DArray            (2D only)

Logs only detections with class id == 15 (person).
Publishes overlay image with person boxes on /color/person_overlay.
"""

import math
from typing import List, Optional, Tuple

import rclpy
from rclpy.node import Node
from rclpy.qos import qos_profile_sensor_data

from sensor_msgs.msg import Image
from cv_bridge import CvBridge
import cv2

# Select message type at import time (simple and explicit).
USE_SPATIAL = False
try:
    # depthai_ros_msgs (with 3D)
    from depthai_ros_msgs.msg import SpatialDetectionArray as DetectionArrayMsg  # type: ignore
    USE_SPATIAL = True
except Exception:
    # vanilla vision_msgs (2D)
    from vision_msgs.msg import Detection2DArray as DetectionArrayMsg  # type: ignore
    USE_SPATIAL = False


class PersonDetectionNode(Node):
    def __init__(self) -> None:
        super().__init__('person_detection')

        # --- Checkpoint 7: Subscribe to '/color/mobilenet_detections' topic ---
        self.sub_det = self.create_subscription(
            DetectionArrayMsg,
            '/color/mobilenet_detections',
            self._on_detections,
            10
        )

        if USE_SPATIAL:
            self.get_logger().info('Using SpatialDetectionArray (with depth).')
        else:
            self.get_logger().info('Using Detection2DArray (2D only).')

        # --- Extra: subscribe to '/color/image' for RGB frames ---
        self.bridge = CvBridge()
        self.sub_img = self.create_subscription(
            Image, '/color/image', self._on_image, qos_profile_sensor_data
        )

        # --- Extra: publish overlay image with boxes ---
        self.pub_overlay = self.create_publisher(Image, '/color/person_overlay', 10)

        # Cache last set of person detections to draw on the next image
        # Each item: (x1, y1, x2, y2, label_text, opt_depth_m)
        self._last_person_boxes: List[Tuple[int, int, int, int, str, Optional[float]]] = []

    # ----------------- helpers -----------------
    @staticmethod
    def _is_person_id(id_value) -> bool:
        """
        Accepts either numeric id == 15 or a string '15'/'person'.
        """
        if id_value is None:
            return False
        if isinstance(id_value, (int, float)):
            # Float id sometimes appears from deserialization; treat 15.0 as 15
            return int(id_value) == 15
        if isinstance(id_value, str):
            s = id_value.strip().lower()
            if s == 'person':
                return True
            # allow numeric in string form
            try:
                return int(s) == 15
            except ValueError:
                return False
        return False

    @staticmethod
    def _bbox_from_center_size(cx: float, cy: float, w: float, h: float) -> Tuple[int, int, int, int]:
        x1 = int(round(cx - w / 2.0))
        y1 = int(round(cy - h / 2.0))
        x2 = int(round(cx + w / 2.0))
        y2 = int(round(cy + h / 2.0))
        return x1, y1, x2, y2

    @staticmethod
    def _clamp_box(x1, y1, x2, y2, width, height):
        x1 = max(0, min(int(x1), width - 1))
        y1 = max(0, min(int(y1), height - 1))
        x2 = max(0, min(int(x2), width - 1))
        y2 = max(0, min(int(y2), height - 1))
        return x1, y1, x2, y2

    # ----------------- callbacks -----------------
    def _on_detections(self, msg) -> None:
        """Checkpoint 8: Print pedestrian detections (class id == 15)."""

        person_boxes: List[Tuple[int, int, int, int, str, Optional[float]]] = []
        printed_any = False

        if USE_SPATIAL:
            # depthai_ros_msgs/SpatialDetectionArray
            # Common layouts seen in the wild:
            #  - det.results[]: ObjectHypothesisWithPose (id, score) + det.bbox.center/size + det.position(x,y,z)
            #  - OR det.label (str) and det.bbox + det.position
            for det in getattr(msg, 'detections', []):
                # Try results[] first
                accepted = False
                label_text = 'person'
                score = None

                if hasattr(det, 'results') and det.results:
                    # choose the top hypothesis
                    best = det.results[0]
                    hyp_id = getattr(best.hypothesis if hasattr(best, 'hypothesis') else best, 'id', None)
                    score = getattr(best.hypothesis if hasattr(best, 'hypothesis') else best, 'score', None)
                    accepted = self._is_person_id(hyp_id)
                    if isinstance(hyp_id, str) and hyp_id.lower() == 'person':
                        label_text = 'person'
                elif hasattr(det, 'label'):
                    accepted = self._is_person_id(det.label)
                    label_text = 'person'

                if not accepted:
                    continue

                # BBox center/size
                bbox = getattr(det, 'bbox', None)
                if bbox is None or not hasattr(bbox, 'center') or not hasattr(bbox, 'size'):
                    continue
                cx = float(getattr(bbox.center, 'x', 0.0))
                cy = float(getattr(bbox.center, 'y', 0.0))
                w = float(getattr(bbox.size, 'x', 0.0))
                h = float(getattr(bbox.size, 'y', 0.0))
                x1, y1, x2, y2 = self._bbox_from_center_size(cx, cy, w, h)

                # 3D position if available
                depth_m: Optional[float] = None
                pos = getattr(det, 'position', None)
                if pos is not None and hasattr(pos, 'z'):
                    depth_m = float(pos.z)

                # Logging
                if not printed_any:
                    self.get_logger().info("People (class 15) detected:")
                    printed_any = True
                self.get_logger().info(
                    f"  bbox=({x1},{y1})-({x2},{y2})  "
                    f"{'score=%.2f  ' % score if score is not None else ''}"
                    f"{'Z=%.2fm' % depth_m if depth_m is not None else ''}"
                )

                person_boxes.append((x1, y1, x2, y2, label_text, depth_m))

        else:
            # vision_msgs/Detection2DArray
            for det in getattr(msg, 'detections', []):
                # results[]: ObjectHypothesisWithPose (id, score)
                if not hasattr(det, 'results') or not det.results:
                    continue
                best = det.results[0]
                hyp = best.hypothesis if hasattr(best, 'hypothesis') else best
                hyp_id = getattr(hyp, 'id', None)
                if not self._is_person_id(hyp_id):
                    continue

                score = getattr(hyp, 'score', None)

                # Bounding box
                bbox = getattr(det, 'bbox', getattr(det, 'bounding_box', None))
                if bbox is None or not hasattr(bbox, 'center') or not hasattr(bbox, 'size'):
                    continue
                cx = float(getattr(bbox.center, 'x', 0.0))
                cy = float(getattr(bbox.center, 'y', 0.0))
                w = float(getattr(bbox.size, 'x', 0.0))
                h = float(getattr(bbox.size, 'y', 0.0))
                x1, y1, x2, y2 = self._bbox_from_center_size(cx, cy, w, h)

                if not printed_any:
                    self.get_logger().info("People (class 15) detected:")
                    printed_any = True
                self.get_logger().info(
                    f"  bbox=({x1},{y1})-({x2},{y2})  "
                    f"{'score=%.2f' % score if score is not None else ''}"
                )

                person_boxes.append((x1, y1, x2, y2, 'person', None))

        # Store for image overlay callback
        self._last_person_boxes = person_boxes

    def _on_image(self, msg: Image) -> None:
        """Extra: draw person boxes on the image and publish."""
        if not self._last_person_boxes:
            # Nothing to draw; you could early-return or still republish.
            return

        # Convert to OpenCV image (no GUI, just processing)
        try:
            frame = self.bridge.imgmsg_to_cv2(msg, desired_encoding='bgr8')
        except Exception as e:
            self.get_logger().warn(f'cv_bridge imgmsg_to_cv2 failed: {e}')
            return

        h, w = frame.shape[:2]

        # Draw boxes
        for (x1, y1, x2, y2, label_text, depth_m) in self._last_person_boxes:
            x1, y1, x2, y2 = self._clamp_box(x1, y1, x2, y2, w, h)
            cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 0), 2)
            text = label_text
            if depth_m is not None and math.isfinite(depth_m):
                text += f' {depth_m:.2f}m'
            cv2.putText(frame, text, (x1, max(0, y1 - 6)),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2, cv2.LINE_AA)

        # Publish overlay image
        try:
            out = self.bridge.cv2_to_imgmsg(frame, encoding='bgr8')
            out.header = msg.header  # preserve timing/frame
            self.pub_overlay.publish(out)
        except Exception as e:
            self.get_logger().warn(f'cv_bridge cv2_to_imgmsg failed: {e}')
            return


def main() -> None:
    rclpy.init()
    node = PersonDetectionNode()
    try:
        rclpy.spin(node)
    except KeyboardInterrupt:
        pass
    node.destroy_node()
    rclpy.shutdown()


if __name__ == '__main__':
    main()
