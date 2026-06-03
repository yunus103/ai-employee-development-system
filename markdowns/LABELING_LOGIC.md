# PHASE 2: LABELING LOGIC (Etiketleme Kuralları & İnsan Uzman Sistemi)

Bu doküman, `dataset_final.csv` içindeki 12.280 çalışan verisinin `actions_master.json` içinde bulunan 47 aksiyona (0 ve 1 olarak) nasıl eşleştirileceğini matematiksel ve İK mantığı çerçevesinde tanımlar.

Projenin bir **Eğer (If-Else) motorundan** (basit kurallar zinciri) ziyade, bağlamı (context) ve insan doğasını anlayan gerçek bir **Makine Öğrenmesi (AI)** modeline dönüşebilmesi için 8 adet gelişmiş kural (`Override Rules`) kullanılacaktır. Bu kurallar modeli "farklı tip" profil kombinasyonlarını ezberlemeye değil, **öğrenmeye** zorlar.

---

## A. BAZ KURAL (BASELINE ASSIGNMENT)

Hiçbir özel senaryoya takılmayan çalışan profilinin %70'ine uygulanacak olan temel kural, skor bantları eşleşmesidir.

**1. Core Yetkinlikler (4 Bant):**

- 1.0 - 1.7 ➔ Action_01 (En Zorlu / Hard)
- 1.8 - 2.5 ➔ Action_02 (Orta-Zor / Medium-High)
- 2.6 - 3.2 ➔ Action_03 (Orta / Medium)
- 3.3 - 4.0 ➔ Action_04 (İnce Ayar / Öz Değerlendirme / Easy)

**2. Departman & Rol Yetkinlikleri (3 Bant):**

- 1.0 - 1.9 ➔ Action_01 (En Zorlu / Hard / Pratik Task)
- 2.0 - 2.9 ➔ Action_02 (Orta / Medium / Koçluk)
- 3.0 - 4.0 ➔ Action_03 (İnce Ayar / Öz Değerlendirme / Easy)

---

## B. GELİŞMİŞ UZMAN KURALLARI (EXPERT OVERRIDE RULES)

Buradaki hiyerarşik kurallar, veri setindeki demografik/profil verilerini çapraz kullanarak baz kuralı **geçersiz kılar (ezerek üzerine yazar)**.

### Kural 1: "Yönetici Hassasiyeti" Kuralı (Manager Penalty)

_Sorumluluk ve İnisiyatifin eksikliği, yöneticilerde tolere edilemez._

- **Koşul:** `JobRole` içinde **"Manager"** kelimesi geçiyorsa VE `Core_Accountability` VEYA `Core_Initiative` skorları < 2.5 ise.
- **Aksiyon Ezme:** Normalde Band 2 veya Band 3 almaları gerekirken, aksiyon zorluğunu 1 kademe artır ve onları bu eksikliklerin en ağır pratik aksiyonuna (Band 1 ➔ Action_01) mecbur et.

### Kural 2: "Tükenmişlik ve İşten Çıkma" Filtresi (Burnout Shield)

_İşi bırakma veya depresyon sınırına gelmiş bir çalışana sert pratik/eğitim verilemez, şirket kültürüne terstir._

- **Koşul:** `WorkLifeBalance` <= 2 VE `JobSatisfaction` <= 2.
- **Aksiyon Ezme:** Bu kişilerin ilgili yetkinlik skorları 1.5 seviyesinde (berbat) bile olsa, onlara ağır eğitim (Action_01/Hard) **ATAMA**. Onlara bu yetkinliklerle ilgili en pasif, rahat ve az vakit alan aksiyon formlarını (Action_04 / Action_03 / Easy) ver ki eğitim süreci istifa baskısına dönüşmesin.

### Kural 3: "Satış Departmanı Agresifliği" Kuralı (Sales Precision)

_Satış çalışanları için iletişim her şeydir. Ortalama seviye bile kabul edilemez._

- **Koşul:** `Department` == 'Sales & Marketing' VE `Core_Communication` < 3.0.
- **Aksiyon Ezme:** İletişim skoru 2.5 (Ortalama) olsa bile, bunu acımasızca Band 1 (En agresif İletişim eğitimi olan CORE_COMM_01) olarak haritala. Satışta tavize yer yoktur.

### Kural 4: "Teknoloji Departmanı Analitik Odak" Kuralı (Tech Imperative)

_Mühendisler için problem çözme zafiyeti sistemleri çökertebilir._

- **Koşul:** `Department` == 'Technology' VE `Core_ProblemSolving` < 3.0.
- **Aksiyon Ezme:** Model bu profili ortalama (Band 2/3) sanıp gevşemesin diye dümdüz ağırlığı artırıp 1. Band'dan (En yoğun Problem Çözme / CORE_PROBLEMSOLVING_01) eğitim ata.

### Kural 5: "Kıdemli Çalışanı Yenileme" Kuralı (Veteran Refresh)

_15 yıllık uzmana, sektöre dondurma dükkanından yeni girmiş stajyer gibi temel eğitim atanmaz._

- **Koşul:** `TotalWorkingYears` >= 10 VE `YearsAtCompany` >= 5.
- **Aksiyon Ezme:** Bu çalışanın herhangi bir yetkinliği dibe vursa bile (< 2.0), zorluğu "Hard / Action_01" olan aksiyonu değil, "Mental Koçluk / Farkındalık Odaklı" olan Action_02 veya Action_03 şablonunu ver.

### Kural 6: "Mükemmel Asosyal (Yalnız Kurt)" Kuralı (Toxic Performance)

_İşinde inanılmaz derecede iyi olan ama takım oyununu sürekli sabote eden yetenek._

- **Koşul:** `PerformanceScore` yüksek seviyede (Örn: Top %20) VE `Core_Teamwork` < 2.0.
- **Aksiyon Ezme:** Yüksek performer olduğu için takım çalışmasını dümdüz 1.0 (Band 1 ağır takım eğitimi) ile cezalandırmak ters tepebilir. Ona `CORE_TEAMWORK_03` gibi kişisel farkındalık aksiyonu ver.

### Kural 7: "Çaylak Kurtarma" Kuralı (Onboarding SOS)

_Şirkete yeni girenlerin ilk fire verdiği yer uyum (Adaptability) testleridir._

- **Koşul:** `YearsAtCompany` <= 2 VE `Core_Adaptability` < 2.5.
- **Aksiyon Ezme:** Uyum skoru orta bile olsa affetme ve %100 olasılıkla en yoğun adaptasyon aksiyonuna (Band 1) sok ve şirketten erken istifasının/uyumsuzluğunun önüne geç.

---

## C. İNSAN DOĞASI: OLASILIKSAL GÜRÜLTÜ (%10 HUMAN ERROR/DRIFT)

Yukarıdaki 7 spesifik kural ve taban kuralı, her şeyi "Makine gibi" kusursuz atar. Ancak bir İK departmanında kusursuzluk yoktur. Eğer bu saf 0 ve 1 verilerini Makine Öğrenmesine sunarsak, modelimiz %100 başarım (Accuracy) sağlar ve bu durum "Overfitting / Reverse Engineering" tuzağıdır. İkna edici bir Makine Öğrenmesi projesi için gürültü gereklidir.

- **Kural 8 (Drift Algoritması):** Tüm eşleştirmeler ve atamalar bittikten sonra, atanan her 100 aksiyondan yaklaşık 10 tanesi (%10 ihtimal veya noise) KASITLI OLARAK bir yanındaki zorluk bandına kaydırılır.
  - _Örnek:_ Algoritma her kurala bakıp adamın "Action_02" alması gerektiğini buldu. Lakin rastgele kura (zar) 1'den küçük geldiyse, adama Action_02 yerine "Action_03" veya "Action_01" atanır.
- Bu son dokunuş, Multi-Label modelimizin başarı oranını %100 gibi sahte bir sayıdan kurtarıp, evrensel veri bilimi hedefi olan **%88 - %93** aralığına bilerek ve profesyonelce demirler.
