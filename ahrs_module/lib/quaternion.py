import math

radians_to_degrees_multiplier = 180 / math.pi

def euler_from_quaternion(w, x, y, z):
    """
    Convert a quaternion into euler angles (roll{bank}, pitch, yaw).
    roll {bank} is rotation around x in radians (counterclockwise).
    pitch is rotation around y in radians (counterclockwise).
    yaw is rotation around z in radians (counterclockwise).
    
    In the aircraft perspective,
    x is forward (North),
    z is up, 
    y is to the left (West).
    
    """
    
    t2 = +2.0 * (w * y - z * x) # euclidean has a + 
    
    if (t2 > .999):
        roll_x = 0
        pitch_y = math.pi/2
        yaw_z = 2 * math.atan2(x, w)
        return roll_x, pitch_y, yaw_z # in radians
    
    if (t2 < -.999):
        roll_x = 0
        pitch_y = -math.pi/2
        yaw_z = -2 * math.atan2(x, w)
        return roll_x, pitch_y, yaw_z # in radians    
    
    # bank
    t0 = +2.0 * (x * w + y * z) # euclidean has a -
    t1 = +1.0 - 2.0 * (x * x + y * y) 
    roll_x = math.atan2(t0, t1)
 
    # attitude
    pitch_y = math.asin(t2)
    
    # heading
    t3 = +2.0 * (w * z + x * y) # euclidean has a -   
    t4 = +1.0 - 2.0 * (y * y + z * z) # euclidean has a -
    yaw_z = math.atan2(t3, t4)
    
    return roll_x, pitch_y, yaw_z # in radians

def radians_to_degrees(x, y, z): 
    """
    Convert angles from radians to degrees
    """
    x = x * radians_to_degrees_multiplier
    y = y * radians_to_degrees_multiplier
    z = z * radians_to_degrees_multiplier
    return(x, y, z)
