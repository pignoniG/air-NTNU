#!/usr/bin/env python
import time
import serial

import datetime

from firebase import firebase
import firebase_admin
from firebase_admin import credentials
from firebase_admin import db

cred = credentials.Certificate("/home/pi/ntnu-air-firebase-adminsdk-gq7ro-45a4738df7.json")
firebase_admin.initialize_app(cred,{'databaseURL': 'https://ntnu-air.firebaseio.com'
})

ref = db.reference('server/')





def add_new_data(data_points):
    now = datetime.datetime.now().ctime()
    day = datetime.datetime.now().strftime("%Y-%m-%d")
    u_now = int(time.time())
 
    room_data= ref.child('room_data')
    day_data = room_data.child(day)
    room= day_data.child(data_points[1].decode().split(":")[1])
    room.push({
            "u_time" : u_now,
            "time" : now,
            "sensor_id" :data_points[0].decode().split(":")[1],
            "room_id" : data_points[1].decode().split(":")[1],
            "battery_v" : float(data_points[2].decode().split(":")[1]),
            "dust" : float(data_points[3].decode().split(":")[1]),
            "oxigen_prc" : float(data_points[4].decode().split(":")[1]),
            "temp_c" : float(data_points[5].decode().split(":")[1]),
            "pressure_hpa" : float(data_points[6].decode().split(":")[1]),
            "humidity_prc" : float(data_points[7].decode().split(":")[1])
        })





ser = serial.Serial(
    port='/dev/ttyS0',
    baudrate = 9600,
    parity=serial.PARITY_NONE,
    stopbits=serial.STOPBITS_ONE,
    bytesize=serial.EIGHTBITS,
    timeout=0.3
)
counter=0
          
while 1:
    message=ser.readline()
    if message:
        try:
            message=message.split()
            add_new_data(message)
            print (message)
        except:
            print ("This is an error message!")
        

        
    
        