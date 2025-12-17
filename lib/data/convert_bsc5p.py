#!/usr/bin/env python3
"""
Convert BSC5P JSON catalog to the format required by the star map app.
Format: {"ra": hours, "dec": degrees, "mag": magnitude}
"""

import json
import sys

def convert_bsc5p_to_stars(input_file, output_file):
    """Convert BSC5P JSON to star map format."""
    with open(input_file, 'r') as f:
        bsc5p_data = json.load(f)
    
    stars = []
    
    for star in bsc5p_data:
        try:
            # Extract RA components (hours, minutes, seconds)
            ra_hours = int(star.get('hoursRaJ2000', 0))
            ra_minutes = int(star.get('minutesRaJ2000', 0))
            ra_seconds = float(star.get('secondsRaJ2000', 0))
            
            # Convert RA to decimal hours
            ra_decimal = ra_hours + (ra_minutes / 60.0) + (ra_seconds / 3600.0)
            
            # Extract Dec components (sign, degrees, minutes, seconds)
            dec_sign = star.get('signDecJ2000', '+')
            dec_degrees = int(star.get('degreesDecJ2000', 0))
            dec_minutes = int(star.get('minutesDecJ2000', 0))
            dec_seconds = float(star.get('secondsDecJ2000', 0))
            
            # Convert Dec to decimal degrees
            dec_decimal = dec_degrees + (dec_minutes / 60.0) + (dec_seconds / 3600.0)
            if dec_sign == '-':
                dec_decimal = -dec_decimal
            
            # Extract magnitude
            mag_str = star.get('visualMagnitude', '')
            if not mag_str or mag_str.strip() == '':
                continue
            
            try:
                mag = float(mag_str)
            except (ValueError, TypeError):
                continue
            
            # Filter to stars visible to naked eye (magnitude <= 6.5)
            if mag > 6.5:
                continue
            
            stars.append({
                "ra": round(ra_decimal, 6),
                "dec": round(dec_decimal, 6),
                "mag": round(mag, 2)
            })
            
        except (ValueError, TypeError, KeyError) as e:
            # Skip stars with invalid data
            continue
    
    # Sort by magnitude (brightest first)
    stars.sort(key=lambda x: x['mag'])
    
    # Write to output file
    with open(output_file, 'w') as f:
        json.dump(stars, f, indent=2)
    
    print(f"Converted {len(stars)} stars from {input_file} to {output_file}", file=sys.stderr)
    return len(stars)

if __name__ == "__main__":
    input_file = "/tmp/BSC5P-JSON/bsc5p_min.json"
    output_file = "stars.json"
    
    count = convert_bsc5p_to_stars(input_file, output_file)
    print(f"Successfully created {output_file} with {count} stars")


