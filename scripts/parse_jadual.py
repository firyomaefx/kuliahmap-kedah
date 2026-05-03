#!/usr/bin/env python3
"""Parse real kuliah schedule data from Firdaus TTRG WhatsApp format.
Extracts: district, masjid name, ustaz name, topic/kitab, time notes."""

import re
import json
from datetime import datetime

RAW_DATA = """
Ahad 15 Zulkaedah 1447H / 3 Mei  2026M

jadual kuliyah maghrib sekitar kedah

BUKIT KAYU HITAM :
1: masjid  al muhajirin bandar bukit kayu hitam
* ustaz  yusnaidi 
~ tafsir ar rahman 
2: masjid felda bukit tangga
* ustaz wan muhd hafiz bin hj wan salleh
~ fekah

CHANGLUN:
1:masjid khairiah  kampung tradisi ,jln sintok
*ustaz prof  dr muhammad khadafi 
~nasihat agama dan wasiat iman
2:masjid al ihsan kampung changkat setul
*ustaz izzat hambali 
~ nasihat agama dan wasiat iman
3: surau al muhtadin , taman resak / taman seri meranti
*ustaz mohd amar bin mohamad 
~ tafsir nurul ehsan 
4: masjid ihya ulumuddin  pekan changlun 
* ustaz mohd syahir  bin jamaluddin
~ sullamus sibyan
5: masjid al ridzwaniah, batu 4 ,jalan changlun 
*ustaz ahmad muaz  bin azizan 
~ idaman penuntut 

SANGLANG:
1:masjid al abrar, sanglang
*ustaz hassan basri bin abdullah
~ anak kunci syurga

JITRA:
1:masjid al muttaqin ,bandar darul aman 
*tuan guru ahmad abdullah 
~ abadul mufrad
2:masjid tuan guru haji salleh, kampung lubuk kawah 
*ustaz mahathir ahmad  
~ kitab adab  
3:masjid sharifah fatimah ( masjid kemunting)
* ustaz ahmad muhtad bin yusuf 
~ kisah sahabat 
4: masjid al ikhlas , taman tunku sarina
* ustaz dr muhammad nizho bin abu rahman
~ ibrah mukjizat  Rasulullah 
,5: masjid al fateh tanjung pauh
* ustaz  lutfi amer saidin 
~40 hadis akhlak mulia 
6: surau haji osman , kampung sungai nibung
*ustaz zaini zakaria
~ adab pembaca al quran
7: surau al husna taman delima
* ustaz mohd zaiem hilmi bin hussein 
8: masjid al amin kampung cheruk mokkan , mukim hosba
*ustaz abd rahman bin saad 
~ tasawuf 
9: masjid abu ubaidah , binjal
* baba khairul anuar bin shafie
10: surau taman bersatu, batu 13 ,paya kemunting 
*ustaz ahmad husam bin dato paduka sheikh baderudin 
11: masjid pekan tunjang 
*ustaz asri 
~ perisai bagi sekelian mukallaf 

PADANG TERAP:
1:masjid tanjung kiri
* ustaz  hafiez bin said 
~ tarbiyatul  aulad

AYER HITAM:
1: masjid ar rahman kerpan
* ustaz saleh bin alias
~ tauhid

KUALA NERANG:
1:surau an nur taman akasia
* ustaz moir shahriman bin ahmad shafidi
~ faraid

POKOK SENA:
1: masjid ar raudhah, kampung sungai durian 
*ustaz abu bakar bin razak 
~ sirah Nabawiyah 

KEPALA BATAS:
1: masjid jame al shabab
* ustaz mohd rizal bin abd halim
~ tauhid

ALOR STAR:
1:masjid negeri  masjid zahir
* ustaz faizal bin chik al yamani
~ sejarah hidup 4  imam mazhab
2:masjid tandop
*ustaz hamdan othman
~tuhfatul raghibin
3:masjid al wahdatul islamiah ,tmn bersatu kuala kedah
*ustaz azizi abdullah
~ penawar bagi hati
4:masjid ar rahmah , taman wira mergong
*ustaz zamzuri
~ tilawah Al Quran
5:masjid rafeah taman uda
* ustaz abdullah din 
~ as sirah  al atirah 
6: masjid al bukhari alor malai
* ustaz roslan  abd kadir
7: masjid al ummah ,teluk chengai
* ustaz  osman md ali
~ matlaal badrin
8:surau darus syifa jln sultanah taman mutiara
* ustaz aizat naqiuddin 
~ hadith  40  Nabi Muhammad  shollallahu alaih wasallam bercerita
9: masjid al hussein ,seberang pumpong 
*ustaz muhd lutfi ameer
~ ayyuhal walad
10: masjid as solihin taman muhibbah, jalan sultanah bahiyah
* ustaz  abd rahman bin omar
11: masjid tunku abdul rahman putra ,kuala kedah 
* syeikh usamah bin  talib 
~ fadhilat  amalan berdasar hadis
12: masjid aman simpang kuala 
* ustaz dr mohamad hazli bin ismail 
~ sirah Nabawiyah 
13: masjid mohamad iskandar wan tempawan , jln datuk kumbar
* ustaz hj ismail bin ahmad 
~ tauhid 
14:masjid al ittifaq kariah peremba, kuala kedah 
*ustaz alias ahmad 
~ sullam  al tauhid
15: masjid al mahmudi , kampung padang lalang
* ustaz mohd nazir hassan
~ tsimarul jannah 
16:masjid nurul iman , kampung kubang bongor, alor janggus
*ustaz  abdul rahman 
~syamail muhammadiah
17: masjid jamek hutan kampung 
* dr mohd murshidi bin mohd nor
~ bulughul maram 
18:masjid az zaharah taman mergong jaya fasa 1 
* ustaz  attan thowi 
~ al muin al mubin jilid 1 & 2
19: masjid nurul huda , lepai
* ustaz adnan abdul wahab
~ aqidatun naji
20: masjid al irfan ,derga
* ustaz  ahmad muzaffar
~ tasawuf
21: masjid al badar jalan langgar
* ustaz amidi bin sheikh zainal asri
~kehebatan Rasulullah akhlak mulia &susuk tubuh menawan 
22: masjid at taqwa , taman pknk 
*ustaz  hanif shafie
~ tahsin Al quran 
23: masjid ar rahman, alor merah
*ustaz johari murad
~ ayyuhal walad
24:surau madrasah an-nur kg juara tua Jln Datuk Kumbar, 
* tuan guru shukri majid
~ bahrul wafi " lps maghrib"
~sabilal muhtadi " lps isyak"
~tafsir nurul ihsan jld 2 
25: masjid al hasanah, kariah ampar jajar 
*dato sheikh ahmad faisol bin haji omar 
~fekah
26: masjid al irsyad, teluk bagan 
* ustaz muhammad zaidi bin hassan basri 
~ mukhtasar ibnu abi jamrah 
27: masjid putra, kariah tok pasai, kuala kedah 
*ustaz mohd isa bin abd rahman 
28: masjid tunku intan safinaz , bandar mu'azzam shah, anak bukit 
*ustaz haji shaari bin hussein 
~ tauhid
29: masjid taman seri permai, jalan langgar 
*ustaz helmi as syafie 
~ risalah al misbah fi ma'rifahtillah al qadir
30: masjid rayatul islam , kubang siam alor janggus
*ustaz muhammad sayuthi 
~ talaqqi Al-Quran 

PENDANG:
1: masjid  jamek  tuan guru haji abd aziz pekan pendang
*  syeikh mawarzi dziyauddin 
~ sabilal muhtadin 
2: masjid sultanah hamimah , kariah tanjung radin
* ustaz mohd nizam bin md noh 
~ tazkirah imam qurtubi
3: masjid al huda , alor pudak, tobiar 
*ustaz wahab 
~ sabilul muhtadin 

YAN: 
1: masjid al wustha guar chempedak
* ustaz ahmad hifzi bin abd rahim
~ tajzibu atrafil hadis
2:masjid at thohiriah ,kampung sungai lentang ,dulang
*ustaz ridzuan abdullah
~ syamail muhammadiah
3:masjid Jamek badlishah yan
* ustaz hanif bin zahari 
~ al jawahir as sufiyyah 
4: masjid ubudiah, padang lumat 
*ustaz ahmad shater bin omar 
~ akhlak 

GURUN:
1: masjid al othmaniah ,bt3 jln jeniang
* ustaz halim hussain
~ minhajul abidin
2: masjid taman ria mesra 2 , batu 5 jalan  jeniang
* ustaz nurul aswar nasron
~ mustika hadis jld 1
3: masjid pekan gurun 
*ustaz dr saad gomaa zaghloul
~tafsir Al quran 
4: masjid seri jerai 
*ustaz azaruddin 
5: masjid as syakirin, kariah guar stesen 
*ustaz amirul amri 
~ setangkai padi 
6: surau perwaja 
*ustaz fazli bin md zain
7: masjid al khariyyah, bedong 
*ustaz dr hatta 
8:surau ibdurrahman, taman sinar matahari , bedong 
*ustaz ismudi bin md sanusi 
~ Al yawaqit wal jawahir

SUNGAI PETANI:
1:masjid padang temusu
*ustaz hafiz mustafa lubis
~ 35 adab islam 
2:masjid taman keladi
* ustaz yazid bin zainon
~ tafsir nurul ihsan
3:masjid  sultan abdul halim ,taman ria jaya
* ustaz ahmad kabir 
~ bahrul mazi 
4:masjid al muttaqin ,tmn ria
* ustaz  imron al hafiz 
~ tafsir ibnu kathir 
5:masjid permatang gedong
*ustaz dr jazmi md isa
6:masjid al muhibbuddin sungai pasir
* ustaz haji azhar bin haji omar 
7:masjid  as salam kariah teluk wang
*ustaz faisol hashim 
~ bahrul mazi jld 1
8:masjid kampung raja 
* ustaz ahmad fadzli bin hashim 
~ al azkar 
9:masjid bandar puteri jaya
*ustaz solahuddin 
~penawar bagi hati 
10: masjid bakar arang
* ustaz mohd iqmal najib
11:masjid al imam nawawi ambangan heights
* ustaz shahmir ismail
~ fiqh sirah 
12:surau al muhsinin taman seri bayu , sungai lalang
*ustaz mohd hanif bin haron
13:masjid al maghfirah, kariah tmn kelisa ria 
*ustaz  nur muhammad  hidayat bin amir 
~ 40 hadis hukum fekah 
14:surau taman sejati
*ustaz amri bin mohd nason 
~ 40 dosa pengundang bala
15:surau al ikhwan , lorong kuda kepang,taman ria jaya fasa2
*ustaz jamaluddin ahmad
~ al yawaqit al jawaher 
16:masjid sultan muzaffar shah 
*sheikh ammar
~ arbain 
17:surau at taqwa ,zon  anggerik bandar aman jaya
*ustaz saiful anuar bin rosli 
~ misbahul munir  
18:masjid al khalidiah ,kampung permatang pasir ,tikam batu
* ustaz azizul ariffin
19:masjid kota raja ,kota kuala muda
*ustaz syuwairi bin ishak
~ riyadhus solihin
20:surau al ikhwan ,bandar sri astana fasa B & C
* ustaz  azwan kamaruddin
~ hidayatus sibyan 
21:masjid al majidi , "masjid kuning "sungai layar hujung
*ustaz faiz romzi
22:masjid al amin, sungai layar 
*ustaz muhammad naim bin salleh
~ tadabbur Al quran 
23:masjid   kariah bandar perdana
*  ustaz azfar abdullah 
~ kisah para ambia
24:surau haji mohammad nor taman kempas fasa 1
*ustaz  dai ibrahim
25:masjid taman peruda
*ustaz shahrizan hazime 
~ hadis 40
26:masjid al ikhlas,pulau sepom, tikam batu 
*ustaz khairul asfani
~quran di radio 
27:masjid al barakah ,tikam batu
* ustaz annuar
~ matlaal badrin
28: masjid permatang berangan
* ustaz solihen arshad
29: surau bukit aceh   merbok
* ustaz omar senawi
~ aqidatun najin 
30:masjid ibrahim , penghulu him 
*ustaz abdul wafi bin samsurrijal 
~solat orang uzur 
31: masjid sultan abdul halim muadzam shah , batu dua 
*ustaz hanafi bin musa al hafiz 
~ pedoman solat berjemaah
32:masjid sintok bugis , kota kuala muda
* ustaz zaidi bin md zain
~ nasihat iman & bimbingan agama 
33: masjid kampung sungai pial merbok
*ustaz muhammad ihsan bin ismail 
~kifayatul muhtadi 
34: masjid az zuhri , semeling 
* ustaz naim aziz 
35: masjid  saidina bilal  ar rabah pengkalan lebai man 
* ustaz khairul zaher
~sirah - khulafa  imam as sayuti
36:masjid al muhajirin taman bandar baru ,sungai lalang 
* ustaz  saffwan azmi
~ perjalanan hidup  Rasulullah SAW
37: masjid al wajdi , bukit selambau 
* ustaz  rahim jaafar
~ hidayatul sodiqin
38: surau ar rahman , bandar utama
*  ustaz dr hadi 
~ tafsir Al quran 
39: surau nurul hidayah taman sutera jaya batu 2 jalan kuala ketil 
* ustaz muallif bin abd majid 
~ syamail syarifah
40: masjid nurul hasanah , kariah bukit kechik , simpor
* ustaz alias che nus
~ penawar bagi hati
41: masjid al mubarak , di  pantai prai
* ustaz azmi bin yusuf 
42:surau  al iman, taman lembah bujang, merbok
*ustaz musa'd bin yusuf
~tahsin Al Quran 
43: masjid al muqarabbin kariah alor jawi 
*ustaz khairi hanafiah 
~ kelas tajwid lepas isyak 
44: surau al iman, taman nilam 
*ustaz azizan 
45: surau al mukminin, taman delima fasa 2 ,taman delima 
*ustaz mohd nizar bin ismail 
~ hidayatus salikin
46: masjid andalusia, bandar laguna merbok 
*ustaz muhamad syakir bin ismail 
~ taalim al muta'alim tariq al ta'allum
47: surau al ansar, darulaman perdana 
*ustaz amiruddin bin abd hamid
~kafayatul muhtaj
48: masjid al atiq,merbok 
*ustaz shamsuddin 
~ tajwid 
49: masjid al busyra, merbok 
*ustaz fauzi shahidan 

KULIM:
1:masjid taman selasih
*ustaz hamzah zakaria 
~ sairus salikin jilid 1&2
2:masjid kelang lama 
*ustaz adnan kamaruddin 
~ indahnya bersama al quran
3:masjid sungai ular
*ustaz zulkifli zainon 
~ tafsir nurul ehsan 
4:masjid at taufiq , ayer merah
* sheikh  mohd fadzil bin abd rahman
~ sirah Nabi & tafsir Al quran
5:masjid an najah padang serai
* yb ustaz dato ahmad yahya 
~ perbahasan kaedah - kaedah fiqh
6:masjid muhammad al fateh ,tmn mutiara sungai kob
*ustaz faizal 
7:masjid Saidina Umar al-Khattab ,desa aman padang meha 
* ustaz khairul nizam hazari 
~ manusia dan islam
8:masjid taman kenari
* ustaz mohd jasri raimy bin johari 
~tafsir al azhar " surah al kahfi'
9:masjid   jamiur makmur , pekan kulim
* ustaz mohsin bin haji hassan
~ tahsin Al quran 
10:masjid  Sayyidina Uthman ibn affan, kariah paya besar  , lunas
* ustaz suhaimi abdullah
~ durus thamin
11:masjid al muqarrabin  taman angsana
*ustaz mohd abduh 
~ risalah tauhid
12: masjid  ghiru jamek al  muhajirin ,taman tunku  putra
*ustaz uzir ismail
~ majmu tsalatsi rasail 
13: surau an nur taman ria padang serai
* ustaz abdul razak bin zakaria
~ penawar bg hati
14:surau al  muttaqin ,tmn lagenda fasa 1&2 padang serai
*ustaz abd muiz  bazilah bin abd aziz
~ sirah nabawiyyah
15: surau al ittihadiah ,taman bersatu 
* yb ustaz  shahir long
~ 40 hadis bimbingan 
16:surau  kampung padang buluh ,sidam kiri
*ustaz hazlan md desa
~ khulasah minhajul abidin 
17: masjid an najah, taman jati 
*ustaz hafiz hashim 
~ sirah nurul yaqin
18:masjid saidina Ali batalion 2,  kem pga jalan junjung
* ustaz  sharifuddin  abd aziz
~bidayatul hidayah
19: masjid darul ulum , merbau pulas
* sheikh hussain bin ismail
~ pengurusan jenazah
20:  surau iman ,taman nilam baiduri
* ustaz  shaharuddin ibrahim
~ mastika hadis
21:surau an najihin , taman tiram  / tiram indah lunas
*ustaz zulkifli md isa
~  asma ul husna
22:  masjid al  fateh ,serdang
*ustaz nordin bin abd rahman
~ tadabur Al Quran
23: masjid tunku abdul rahman putra , qaryah sungai limau
* tuan guru hj adnan bin abd majid
~ hidayatus sibyan
24: masjid muthmainnah jalan tuanku bendahara
*ustaz ahmad shahimi
25: masjid al barakah, selama
* ustaz jasmin bin Jamaludin 
~ asas al iktiqad 
26:masjid al muhtadin, sungai seluang
* ustaz omar bin salleh
~ tafsir ibnu kathir 
27: masjid jamek nurussaadah kariah taman sejahtera ,lunas
*ustaz abdul rahman jabit 
~wisyahul afrah wa isbahul falah
28: surau al ehsan, taman serai setia, padang serai 
*ustaz shauqi bin ibrahim 
~ tafsir 
29: masjid al mujahidin, kampung batu putih
*ustaz firdaous
30: masjid al muhammadi, kariah taman mahsuri, padang serai 
*ustaz jais mohamad 
~ mustika hadis 
31: masjid sultan abdul halim,sidam kiri 
*sheikh dr abdullah al yamani 
32: masjid an nur, junjung 
*ustaz zakaria abdullah 
~ tafsir nurul ihsan jilid 1
33: surau as syakirin,taman mahsuri, padang serai 
*ustaz hasbullah kamis 
~khulasoh nurul yaqin 

BALING:
1:masjid jamek kuala ketil
*ustaz nor ashan bin mohd nor
~ fiqh sirah 
2:masjid ehsaniah , kupang
* ustaz  baha
~tauhid
3:masjid al fateh , kuala pegang
* ustaz zurin
~bughyatu tullab
4: masjid ridzwaniah, pekan baling 
*pu ustaz zulkarnaen bin md rejab 
~ sifat 20

SIK:
1: masjid al muhtadin,sik dalam
* ustaz haji abdullah  bin taib
~jauharah al mauhub
"""

# District mapping from text labels to standardized names
DISTRICT_MAP = {
    "bukit kayu hitam": "Kubang Pasu",
    "changu": "Kubang Pasu",
    "sanglang": "Kubang Pasu",
    "jitra": "Kubang Pasu",
    "padang terap": "Padang Terap",
    "ayer hitam": "Kulim",
    "kuala nerang": "Padang Terap",
    "pokok sena": "Pokok Sena",
    "kepala batas": "Kubang Pasu",
    "alor star": "Kota Setar",
    "pendang": "Pendang",
    "yan": "Yan",
    "gurun": "Kuala Muda",
    "sungai petani": "Kuala Muda",
    "kulim": "Kulim",
    "baling": "Baling",
    "sik": "Sik",
}

def parse_data():
    entries = []
    lines = RAW_DATA.strip().split('\n')
    current_district = None
    
    for line in lines:
        line = line.strip()
        if not line:
            continue
        
        # District header (ends with colon)
        if line.endswith(':') and not line.startswith('*') and not line.startswith('~'):
            dist_label = line.rstrip(':').strip().lower()
            current_district = DISTRICT_MAP.get(dist_label, dist_label.title())
            continue
        
        # Masjid entry line
        if re.match(r'^\d+[:\.]\s*(masjid|surau)', line, re.IGNORECASE):
            # Extract masjid name after the number
            match = re.match(r'^\d+[:\.]\s*(.*)', line, re.IGNORECASE)
            if match:
                masjid_name = match.group(1).strip()
                # Clean up common prefixes
                masjid_name = re.sub(r'^masjid\s+', 'Masjid ', masjid_name, flags=re.IGNORECASE)
                masjid_name = re.sub(r'^surau\s+', 'Surau ', masjid_name, flags=re.IGNORECASE)
                entries.append({
                    'district': current_district,
                    'masjid_name': masjid_name,
                    'ustaz_name': '',
                    'topic': '',
                    'time_notes': '',
                })
            continue
        
        # Ustaz name
        if line.startswith('*'):
            ustaz = line.lstrip('*').strip()
            if entries:
                entries[-1]['ustaz_name'] = ustaz
            continue
        
        # Topic/kitab
        if line.startswith('~'):
            topic = line.lstrip('~').strip()
            if entries:
                entries[-1]['topic'] = topic
            continue
        
        # Time notes inline (contains "lps maghrib", "lps isyak", etc.)
        if '"' in line and 'lps' in line.lower():
            if entries:
                entries[-1]['time_notes'] = line.strip()
            continue
    
    return entries

if __name__ == '__main__':
    entries = parse_data()
    print(f"Parsed {len(entries)} entries")
    
    # Group by district
    by_district = {}
    for e in entries:
        d = e['district']
        by_district.setdefault(d, []).append(e)
    
    for district, items in sorted(by_district.items()):
        print(f"\n{district}: {len(items)} entries")
        for i in items[:3]:
            print(f"  - {i['masjid_name']} | {i['ustaz_name'][:40]}... | {i['topic'][:40]}")
    
    # Save to JSON for next step
    with open('scripts/parsed_jadual.json', 'w', encoding='utf-8') as f:
        json.dump(entries, f, ensure_ascii=False, indent=2)
    print(f"\nSaved to scripts/parsed_jadual.json")
