
#include <RH_RF95.h>
#include "BME280.h"
#include "SevenSegmentFun.h"

BME280 bme(Wire,0x77);

#define RFM95_CS 10
#define RFM95_RST 9
#define RFM95_INT 2

#define RF95_FREQ 915.0

RH_RF95 rf95(RFM95_CS, RFM95_INT);

const float VRefer = 3.3; 
const int pinO2   = A1;
const int pinDust   = 7;
const int pinBatt   = A7;
const int pinO2pwr   = 6;
const int pinRecLED   = 5;
char id [6] = {"air_1"};
const float deltaO   =0;
// 0 for air 1
// 1.46 for air 2

String format = "id:%s R:%s B:%s D:%s O:%s T:%s P:%s H:%s";

unsigned long duration;
unsigned long starttime_trans;
int transmitTime_ms = 30000;
//60000 is one min

unsigned long lowpulseoccupancy = 0;
float dustRatio = 0;
float dustConcentration = 0;
  
char Bstr[10];
char Ostr[10];
char Dstr[10];
char Tstr[10];
char Pstr[10];
char Hstr[10];

char buffer[70];


const byte PIN_CLK = 3;   // define CLK pin (any digital pin)
const byte PIN_DIO = 4;   // define DIO pin (any digital pin)
const int PIN_ENB = 5;   // define DIO pin (any digital pin)

// seven segment related variables


char buldings[8] = {"AbCGHSK"};
char dispBuf [5] = {"A259"};

char nBuf[2];
int buldingsIndex = 0;
int floorN= 2;
int roomNa= 3;
int roomNb= 4;
int dispButonPin = A6;  
int dispButonVal = 0; 

//Set what to enalbe
bool lcdScreen = true;
bool measuringTPH = true;
bool measuringD = true;
bool measuringO = true;
bool measuringB = true;


//Set an automatic recording start if lcdScreen is false
bool isRecording = false;

SevenSegmentFun    display(PIN_CLK, PIN_DIO);


float readVout( int pinAdc) {

    long sum = 0;
    
    for(int i=0; i<32; i++){ sum += analogRead(pinAdc);}

    sum >>= 5;

    float MeasuredVout = sum * (VRefer / 1023.0);
    return MeasuredVout;
}


float readConcentration(int pinAdc) {
    // Vout samples are with reference to 3.3V
    float MeasuredVout = readVout(pinAdc);
    
    //float Concentration = FmultiMap(MeasuredVout, VoutArray,O2ConArray, 6);
    //when its output voltage is 2.0V,
    float Concentration = MeasuredVout * 0.21 / 2.0;
    float Concentration_Percentage=Concentration*100;
    return Concentration_Percentage;
}


void dispText(char* str) {
  display.print(str);
  delay(50);
}

void setup() {

  pinMode(RFM95_RST, OUTPUT);
  pinMode(pinO2pwr, OUTPUT);
  pinMode(pinDust,INPUT);
  digitalWrite(RFM95_RST, HIGH);
  digitalWrite(pinO2pwr, HIGH); 
  
  starttime_trans = millis(); //get the current time;

  pinMode(PIN_ENB, OUTPUT);
  pinMode(PIN_ENB, OUTPUT);

  digitalWrite(PIN_ENB, HIGH); 
  
  Serial.begin(9600);         // initializes the Serial connection @ 9600 baud
  display.begin();            // initializes the display
  display.setBacklight(20);   // set the brightness to 20 %
  delay(1000);                // wait 1000 ms
  
  digitalWrite(RFM95_RST, LOW);
  delay(10);
  digitalWrite(RFM95_RST, HIGH);
  delay(10);

  
  while (!rf95.init()) {
    Serial.println("LoRa failed");
    while (1);
  }
  
  Serial.println("LoRa OK!");

  if (!rf95.setFrequency(RF95_FREQ)) {
    Serial.println("setFrequency failed");
    while (1);
  }
  
  Serial.print("Set Freq to: "); Serial.println(RF95_FREQ);
  
  // Defaults after init are 434.0MHz, 13dBm, Bw = 125 kHz, Cr = 4/5, Sf = 128chips/symbol, CRC on

  // The default transmitter power is 13dBm, using PA_BOOST.
  // If you are using RFM95/96/97/98 modules which uses the PA_BOOST transmitter pin, then 
  // you can set transmitter powers from 5 to 23 dBm:

  rf95.setTxPower(23, false);

  if(measuringTPH){
    if (bme.begin() < 0) {
      Serial.println("error bme");
    
    while(1);
  }
    int status= bme.setForcedMode();
    analogWrite(pinRecLED, 0);
  }
}//end setup

int16_t packetnum = 0;  // packet counter, we increment per xmission

void loop() {

  if (lcdScreen){
  
    dispButonVal = analogRead(dispButonPin);
  //Serial.println(  dispButonVal );
  // read the interface 
    if (isRecording == false){
     if (dispButonVal<380 and dispButonVal>300){
       if( buldingsIndex < 6 ){  buldingsIndex=buldingsIndex+1; }
       else{ buldingsIndex=0; }
       delay(300);
     }
     else if (dispButonVal>600 and dispButonVal<900 ){
       if(roomNb<9){ roomNb=roomNb+1;}
       else{ roomNb=0;}
       delay(300);
     }  
     else if (dispButonVal>380 and dispButonVal<450){
       if(floorN<6){ floorN=floorN+1;}
       else{ floorN=0;}
       delay(300);
     }
     else if (dispButonVal>460 and dispButonVal<590){
       if(roomNa<9){ roomNa=roomNa+1;}
       else{roomNa=0;}
       delay(300);
     }
      dispBuf[0]= buldings[buldingsIndex];
      itoa(floorN, nBuf, 10);
      dispBuf[1]=  nBuf[0];
      itoa(roomNa, nBuf, 10);
      dispBuf[2]=  nBuf[0];
      itoa(roomNb, nBuf, 10);
      dispBuf[3]=  nBuf[0];

     
      dispText(dispBuf);
    }
     
  if (dispButonVal>1000){
      if(isRecording){ isRecording = false;
        display.setBacklight(20); 
         analogWrite(pinRecLED, 0);
        //Serial.println(  isRecording);
      }
      else{ isRecording = true;
        //Serial.println(  isRecording);
        display.setBacklight(0); 
          analogWrite(pinRecLED, 2);
        }
      delay(300);
     }
  }

  if (isRecording){
    if(measuringD and (millis()-starttime_trans) > (transmitTime_ms-30000)){
       duration = pulseIn(pinDust, LOW);
       lowpulseoccupancy = lowpulseoccupancy+duration;
    }
    //Serial.print("lowpulseoccupancy");
    //Serial.println(lowpulseoccupancy);
    //Serial.print("duration");
    //Serial.println(duration);
  
  if ((millis()-starttime_trans) > (transmitTime_ms-5000)){
      //tourn on oxigen sensor ten seconds before reading
      digitalWrite(pinO2pwr, HIGH); }
  
  
    if ((millis()-starttime_trans) > transmitTime_ms){

       if(measuringD){
          dustRatio = lowpulseoccupancy/(30000*10.0);  // Integer percentage 0=>100
          dustConcentration = 1.1*pow(dustRatio,3)-3.8*pow(dustRatio,2)+520*dustRatio+0.62; // using spec sheet curve
          lowpulseoccupancy = 0;

         }
         
        float Vbatt =0;
  
        Vbatt = readVout(pinBatt);
  
        if (measuringD){ dtostrf(dustConcentration, 1,2, Dstr); }
        else{ dtostrf(0.0, 1,2, Dstr); }
  
        if (measuringO){ 
          dtostrf(readConcentration(pinO2)+deltaO, 1,2, Ostr);
          digitalWrite(pinO2pwr, LOW); 
        }
        else{ dtostrf(0, 1,2, Ostr); }
  
        if (measuringB){ dtostrf(Vbatt*1.47, 1,2, Bstr);}
        else{ dtostrf(0.0, 1,2, Bstr); }

        if(measuringTPH){
          bme.readSensor();
          dtostrf(bme.getTemperature_C(), 1,2, Tstr);
          dtostrf(bme.getPressure_Pa()/100, 1,2, Pstr);
          dtostrf(bme.getHumidity_RH(), 1,2, Hstr);

        }
        else{
          dtostrf(0, 1,2, Tstr);
          dtostrf(0, 1,2, Pstr);
          dtostrf(0, 1,2, Hstr);
        }
        
        sprintf(buffer, (format).c_str (), id, dispBuf, Bstr, Dstr, Ostr, Tstr, Pstr, Hstr);
       
        //Serial.print("Sending "); Serial.println(buffer);
        delay(10);
        rf95.send((uint8_t *)buffer, sizeof(buffer) );
        delay(10);
        rf95.waitPacketSent();
        delay(10);
        starttime_trans = millis();
        
    }
  }
}
