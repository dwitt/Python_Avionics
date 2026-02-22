"""Flight plan parser and navigation computer for Garmin FPL format."""

import math
import xml.etree.ElementTree as ET
from pathlib import Path

# Earth radius in nautical miles (WGS84 mean radius)
EARTH_RADIUS_NM = 3440.065

# Garmin FPL XML namespace
FPL_NS = '{http://www8.garmin.com/xmlschemas/FlightPlan/v1}'

# Auto-sequence threshold — advance waypoint when FROM and closer than this
SEQUENCE_DISTANCE_NM = 2.0

# GPS lat/lon from CAN bus are integers scaled by 10^6
GPS_SCALE = 1_000_000


# =============================================================================
# Navigation math — all great-circle on WGS84 sphere
# =============================================================================

def _to_rad(deg):
    return deg * math.pi / 180.0

def _to_deg(rad):
    return rad * 180.0 / math.pi

def haversine_distance(lat1, lon1, lat2, lon2):
    """Great-circle distance in NM between two points (decimal degrees)."""
    lat1, lon1, lat2, lon2 = map(_to_rad, (lat1, lon1, lat2, lon2))
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = math.sin(dlat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2) ** 2
    return 2 * EARTH_RADIUS_NM * math.asin(math.sqrt(a))

def initial_bearing(lat1, lon1, lat2, lon2):
    """Initial great-circle bearing from point 1 to point 2 (degrees 0-360)."""
    lat1, lon1, lat2, lon2 = map(_to_rad, (lat1, lon1, lat2, lon2))
    dlon = lon2 - lon1
    x = math.sin(dlon) * math.cos(lat2)
    y = math.cos(lat1) * math.sin(lat2) - math.sin(lat1) * math.cos(lat2) * math.cos(dlon)
    brg = _to_deg(math.atan2(x, y))
    return brg % 360

def cross_track_distance(lat, lon, lat1, lon1, lat2, lon2):
    """Cross-track distance in NM from current position to the great-circle
    path defined by (lat1,lon1) -> (lat2,lon2).

    Positive = right of course, negative = left of course.
    """
    d13 = haversine_distance(lat1, lon1, lat, lon) / EARTH_RADIUS_NM  # angular distance
    brg13 = _to_rad(initial_bearing(lat1, lon1, lat, lon))
    brg12 = _to_rad(initial_bearing(lat1, lon1, lat2, lon2))
    xt = math.asin(math.sin(d13) * math.sin(brg13 - brg12))
    return xt * EARTH_RADIUS_NM


# =============================================================================
# Flight Plan class
# =============================================================================

class FlightPlan:
    """Parses Garmin FPL files and manages active route/waypoint state."""

    def __init__(self):
        self.route_name = None
        self.waypoints = []       # ordered route waypoints: [{id, type, lat, lon, alt}, ...]
        self.active_leg = 0       # index of active waypoint (target)
        self._filepath = None

    def load(self, filepath):
        """Load a Garmin FPL file. Handles UTF-8 and UTF-16 encoding."""
        filepath = Path(filepath)
        if not filepath.exists():
            print(f"Flight plan not found: {filepath}")
            return False

        # Read raw bytes to detect encoding
        raw = filepath.read_bytes()

        # UTF-16 BOM detection
        if raw[:2] in (b'\xff\xfe', b'\xfe\xff'):
            text = raw.decode('utf-16')
        else:
            text = raw.decode('utf-8')

        try:
            root = ET.fromstring(text)
        except ET.ParseError as e:
            print(f"Error parsing flight plan XML: {e}")
            return False

        # Build waypoint lookup from waypoint-table
        wpt_lookup = {}
        for wpt in root.findall(f'{FPL_NS}waypoint-table/{FPL_NS}waypoint'):
            wpt_id = wpt.findtext(f'{FPL_NS}identifier', '')
            wpt_type = wpt.findtext(f'{FPL_NS}type', '')
            lat_text = wpt.findtext(f'{FPL_NS}lat', '')
            lon_text = wpt.findtext(f'{FPL_NS}lon', '')
            alt_text = wpt.findtext(f'{FPL_NS}altitude-ft', '')

            if lat_text and lon_text:
                key = (wpt_id, wpt_type)
                wpt_lookup[key] = {
                    'id': wpt_id,
                    'type': wpt_type,
                    'lat': float(lat_text),
                    'lon': float(lon_text),
                    'alt': int(alt_text) if alt_text else None,
                }

        # Build ordered route from route-point elements
        route_el = root.find(f'{FPL_NS}route')
        if route_el is None:
            print("No route found in flight plan")
            return False

        self.route_name = route_el.findtext(f'{FPL_NS}route-name', 'Unknown')

        self.waypoints = []
        for rp in route_el.findall(f'{FPL_NS}route-point'):
            rp_id = rp.findtext(f'{FPL_NS}waypoint-identifier', '')
            rp_type = rp.findtext(f'{FPL_NS}waypoint-type', '')
            key = (rp_id, rp_type)
            if key in wpt_lookup:
                self.waypoints.append(wpt_lookup[key])
            else:
                print(f"Warning: route waypoint {rp_id} ({rp_type}) not in waypoint table")

        self.active_leg = min(1, len(self.waypoints) - 1)  # start targeting first waypoint after departure
        self._filepath = filepath

        print(f"Loaded flight plan: {self.route_name} ({len(self.waypoints)} waypoints)")
        for i, wpt in enumerate(self.waypoints):
            marker = " <-- active" if i == self.active_leg else ""
            print(f"  {i}: {wpt['id']} ({wpt['type']}) "
                  f"{wpt['lat']:.6f}, {wpt['lon']:.6f}{marker}")
        return True

    def load_newest(self, directory):
        """Load the most recently modified .fpl file from a directory."""
        directory = Path(directory)
        if not directory.exists():
            print(f"Flight plans directory not found: {directory}")
            return False

        fpl_files = sorted(directory.glob('*.fpl'), key=lambda f: f.stat().st_mtime, reverse=True)
        if not fpl_files:
            print(f"No .fpl files found in {directory}")
            return False

        print(f"Found {len(fpl_files)} flight plan(s), loading newest: {fpl_files[0].name}")
        return self.load(fpl_files[0])

    @property
    def active_waypoint(self):
        """Return the current target waypoint dict, or None."""
        if 0 <= self.active_leg < len(self.waypoints):
            return self.waypoints[self.active_leg]
        return None

    @property
    def previous_waypoint(self):
        """Return the waypoint before the active one (leg start), or None."""
        idx = self.active_leg - 1
        if 0 <= idx < len(self.waypoints):
            return self.waypoints[idx]
        return None

    @property
    def active_waypoint_id(self):
        wpt = self.active_waypoint
        return wpt['id'] if wpt else None

    def next_waypoint(self):
        """Advance to the next waypoint. Returns True if advanced."""
        if self.active_leg < len(self.waypoints) - 1:
            self.active_leg += 1
            print(f"Nav: sequenced to {self.active_waypoint_id} (leg {self.active_leg})")
            return True
        return False

    def prev_waypoint(self):
        """Go back to the previous waypoint. Returns True if changed."""
        if self.active_leg > 1:  # don't go before first leg
            self.active_leg -= 1
            print(f"Nav: sequenced back to {self.active_waypoint_id} (leg {self.active_leg})")
            return True
        return False

    def to_dict(self):
        """Return route data as a JSON-serializable dict."""
        return {
            'route_name': self.route_name,
            'active_leg': self.active_leg,
            'waypoints': [
                {'id': w['id'], 'type': w['type']}
                for w in self.waypoints
            ],
        }


# =============================================================================
# Navigation computation
# =============================================================================

def compute_navigation(lat_raw, lon_raw, flight_plan):
    """Compute navigation data from GPS position and active flight plan.

    Args:
        lat_raw: latitude from CAN bus (integer, ×10^6)
        lon_raw: longitude from CAN bus (integer, ×10^6)
        flight_plan: FlightPlan instance with loaded route

    Returns:
        dict with dtk, bearing, xtrack, dist, to_from, wpt_id, route_name
        or None if computation not possible
    """
    wpt = flight_plan.active_waypoint
    prev = flight_plan.previous_waypoint
    if wpt is None:
        return None

    # Convert CAN integer lat/lon to decimal degrees
    lat = lat_raw / GPS_SCALE
    lon = lon_raw / GPS_SCALE

    # Bearing and distance from current position to active waypoint
    brg = initial_bearing(lat, lon, wpt['lat'], wpt['lon'])
    dist = haversine_distance(lat, lon, wpt['lat'], wpt['lon'])

    # Desired track (course of the leg)
    if prev is not None:
        dtk = initial_bearing(prev['lat'], prev['lon'], wpt['lat'], wpt['lon'])
        xtrack = cross_track_distance(lat, lon, prev['lat'], prev['lon'],
                                       wpt['lat'], wpt['lon'])
    else:
        # No previous waypoint (direct-to) — DTK is bearing to waypoint
        dtk = brg
        xtrack = 0.0

    # TO/FROM: if bearing to waypoint is within 90° of DTK, we're heading TO
    angle_diff = (brg - dtk + 180) % 360 - 180  # normalise to -180..+180
    to_from = 'TO' if abs(angle_diff) < 90 else 'FROM'

    # Auto-sequencing
    if to_from == 'FROM' and dist < SEQUENCE_DISTANCE_NM:
        if flight_plan.next_waypoint():
            # Recompute with new active waypoint
            return compute_navigation(lat_raw, lon_raw, flight_plan)

    return {
        'dtk': round(dtk, 1),
        'bearing': round(brg, 1),
        'xtrack': round(xtrack, 2),
        'dist': round(dist, 1),
        'to_from': to_from,
        'wpt_id': flight_plan.active_waypoint_id,
        'route_name': flight_plan.route_name,
    }


# =============================================================================
# Standalone test
# =============================================================================

if __name__ == '__main__':
    import sys

    if len(sys.argv) < 2:
        print("Usage: python flightplan.py <file.fpl> [lat_deg lon_deg]")
        print("  e.g. python flightplan.py ForeFlight.fpl 43.13 -80.34")
        sys.exit(1)

    fp = FlightPlan()
    if not fp.load(sys.argv[1]):
        sys.exit(1)

    # If lat/lon provided, compute navigation
    if len(sys.argv) >= 4:
        test_lat = float(sys.argv[2])
        test_lon = float(sys.argv[3])
        # Simulate CAN format (×10^6)
        lat_can = int(test_lat * GPS_SCALE)
        lon_can = int(test_lon * GPS_SCALE)

        print(f"\nPosition: {test_lat:.6f}, {test_lon:.6f}")
        nav = compute_navigation(lat_can, lon_can, fp)
        if nav:
            print(f"  Active WPT:  {nav['wpt_id']}")
            print(f"  DTK:         {nav['dtk']}°")
            print(f"  Bearing:     {nav['bearing']}°")
            print(f"  Distance:    {nav['dist']} NM")
            print(f"  X-Track:     {nav['xtrack']} NM")
            print(f"  TO/FROM:     {nav['to_from']}")
    else:
        # Just show distances between waypoints
        print("\nLeg distances:")
        for i in range(1, len(fp.waypoints)):
            w1 = fp.waypoints[i - 1]
            w2 = fp.waypoints[i]
            d = haversine_distance(w1['lat'], w1['lon'], w2['lat'], w2['lon'])
            brg = initial_bearing(w1['lat'], w1['lon'], w2['lat'], w2['lon'])
            print(f"  {w1['id']} → {w2['id']}: {d:.1f} NM, {brg:.0f}°")
