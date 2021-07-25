import math

radians_to_degrees = 180 / math.pi

def euler_from_quaternion(w, x, y, z):
    """
    Convert a quaternion into euler angles (roll, pitch, yaw).
    roll is rotation around x in radians (counterclockwise).
    pitch is rotation around y in radians (counterclockwise).
    yaw is rotation around z in radians (counterclockwise).
    
    In the aircraft perspective,
    x is forward,
    y is to the left when facing forward, 
    z is up.
    
    NASA defines the axis as follows,
    roll is about the forward axis (x),
    pitch is about the axis to the right (-y),
    yaw is about the downward axis (-z),
    
    Therefore, 
    roll is correct,
    pitch is the opposite direction, and
    yaw is the opposite direction.
    
    see also http://www.euclideanspace.com/maths/geometry/rotations/conversions/quaternionToEuler/
    """
    
    t2 = +2.0 * (w * y - z * x)
    
    if (t2 > .998):
        roll_x = 0
        pitch_y = math.pi/2
        yaw_z = 2 * math.atan2(x, w)
        return roll_x, pitch_y, yaw_z # in radians
    
    if (t2 < -.998):
        roll_x = 0
        pitch_y = math.pi/2
        yaw_z = - 2 * math.atan2(x, w)
        return roll_x, pitch_y, yaw_z # in radians    
    
    t0 = +2.0 * (w * x + y * z)
    t1 = +1.0 - 2.0 * (x * x + y * y)
    roll_x = math.atan2(t0, t1)
    
    #t2 = +2.0 * (w * y - z * x)
    t2 = +1.0 if t2 > +1.0 else t2
    t2 = -1.0 if t2 < -1.0 else t2
    pitch_y = math.asin(t2)
    
    t3 = +2.0 * (w * z + x * y)
    t4 = +1.0 - 2.0 * (y * y + z * z)
    yaw_z = math.atan2(t3, t4)
    
    return roll_x, pitch_y, yaw_z # in radians

def radians_to_degrees(x, y, z): 
    """
    Convert angles from radians to degrees
    """
    x = x * radians_to_degrees
    y = y * radians_to_degrees
    z = z * radians_to_degrees
    return(x, y, z)
