EESchema Schematic File Version 4
EELAYER 30 0
EELAYER END
$Descr A4 11693 8268
encoding utf-8
Sheet 1 1
Title ""
Date ""
Rev ""
Comp ""
Comment1 ""
Comment2 ""
Comment3 ""
Comment4 ""
$EndDescr
$Comp
L Dave~KiCad~Library:Feather_M4_CAN U?
U 1 1 612B9D26
P 4100 2200
F 0 "U?" H 4075 2425 50  0000 C CNN
F 1 "Feather_M4_CAN" H 4075 2334 50  0000 C CNN
F 2 "Dave KiCad FootPrints:Feather_M4_CAN" H 4000 2550 50  0001 C CNN
F 3 "" H 3800 2400 50  0001 C CNN
	1    4100 2200
	1    0    0    -1  
$EndComp
$Comp
L Dave~KiCad~Library:BNO08x U?
U 1 1 612BBF66
P 5700 2500
F 0 "U?" H 5700 2665 50  0000 C CNN
F 1 "BNO08x" H 5700 2574 50  0000 C CNN
F 2 "" H 5700 2550 50  0001 C CNN
F 3 "" H 5700 2550 50  0001 C CNN
	1    5700 2500
	1    0    0    -1  
$EndComp
Wire Wire Line
	5000 3600 5000 2900
Wire Wire Line
	5100 3700 5100 3000
$Comp
L power:GND #PWR?
U 1 1 612BD584
P 4850 2650
F 0 "#PWR?" H 4850 2400 50  0001 C CNN
F 1 "GND" H 4855 2477 50  0000 C CNN
F 2 "" H 4850 2650 50  0001 C CNN
F 3 "" H 4850 2650 50  0001 C CNN
	1    4850 2650
	1    0    0    -1  
$EndComp
Wire Wire Line
	5250 2800 5000 2800
Wire Wire Line
	5000 2800 5000 2650
Wire Wire Line
	5000 2650 4850 2650
Wire Wire Line
	5100 3000 5250 3000
Wire Wire Line
	4450 3700 5100 3700
Wire Wire Line
	5000 2900 5250 2900
Wire Wire Line
	4450 3600 5000 3600
$Comp
L Connector:DB9_Male_MountingHoles J?
U 1 1 612BEC35
P 4100 5150
F 0 "J?" H 4280 5152 50  0000 L CNN
F 1 "DB9_Male_MountingHoles" H 4280 5061 50  0000 L CNN
F 2 "" H 4100 5150 50  0001 C CNN
F 3 " ~" H 4100 5150 50  0001 C CNN
	1    4100 5150
	1    0    0    -1  
$EndComp
$EndSCHEMATC
