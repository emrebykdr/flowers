## Sürpriz Buket — Interactive Gift Experience

Bu özellik platformun en özel ve etkileyici deneyimlerinden biri olmalı.

Kullanıcı, Flower Studio üzerinden tasarladığı bir buketi karşı tarafa sürpriz olarak gönderebilmeli. Ancak gönderilen kişi buketin içeriğini, çiçek türlerini veya renklerini açılış gerçekleşene kadar kesinlikle görememeli.

### 1. Sürpriz Buket Oluşturma

Flower Studio içerisinde "Sürpriz Olarak Gönder" seçeneği bulunmalı.

Gönderen kullanıcı:

- Kendi tasarladığı buketi seçebilmeli.
- Bukete özel bir isim verebilmeli.
- Karşı tarafa özel bir mesaj yazabilmeli.
- Gönderim işlemini tamamlayabilmeli.

Gönderim tamamlandığında buket alıcının hesabına düşmeli.

Buket açılana kadar:

- Çiçeklerin önizlemesi gösterilmemeli.
- 3D buket modeli yüklenmemeli veya görüntülenmemeli.
- Çiçek türleri ve renkleri gizli tutulmalı.
- Buketin gerçek görseli veya ekran görüntüsü gösterilmemeli.

Alıcı yalnızca kapalı bir hediye paketi görmeli.

### 2. Kapalı Hediye Paketi Ekranı

Alıcı hesabına giriş yaptığında kendisine gönderilen sürpriz buketi görebilmeli.

Hediye ekranı:

- Ortada büyük ve estetik bir hediye kutusu veya buket ambalajı bulunmalı.
- Ambalajın üzerinde zarif bir kurdele yer almalı.
- "Sana küçük bir sürprizim var" gibi romantik bir mesaj gösterilmeli.
- Gönderen kişinin adı gösterilmeli.
- "Açmak için dokun" şeklinde küçük bir yönlendirme bulunmalı.

Bu ekran mümkün olduğunca sade ve merak uyandırıcı olmalı.

### 3. İnteraktif Kurdele Çözme Animasyonu

Bu özellik projenin en önemli görsel deneyimlerinden biri.

Kullanıcı ekrana dokunduğunda kurdele çözülmeye başlamalı.

Animasyon aşamaları:

**Aşama 1 — İlk Dokunuş**

- Hediye paketi hafifçe hareket etmeli.
- Kurdele üzerinde küçük bir hareket başlamalı.
- Kullanıcıya animasyonun başladığı hissettirilmeli.

**Aşama 2 — İkinci Dokunuş**

- Kurdele düğümü yavaşça çözülmeli.
- Kurdele uçları hareket ederek birbirinden ayrılmalı.
- Animasyon doğal ve akıcı görünmeli.

**Aşama 3 — Son Dokunuş**

- Kurdele tamamen çözülmeli.
- Ambalajın üst kısmı yavaşça açılmalı.
- İçeriden buketin küçük bir bölümü görünmeye başlamalı.

**Aşama 4 — Büyük Açılış**

- Ambalaj açılmalı.
- Çiçekler yavaşça görünür hale gelmeli.
- Buket 3D olarak ortaya çıkmalı.
- Kamera hafifçe yaklaşmalı.
- Zarif bir ışık efekti veya küçük parçacık animasyonu kullanılabilir.
- Gönderen kişinin yazdığı özel mesaj ekranda belirmeli.

Her aşama kullanıcı dokunuşuyla ilerlemeli. Animasyonlar otomatik olarak sonuna kadar oynatılmamalı.

Kullanıcı isterse animasyonu tekrar izleyebilmeli.

### 4. Açılış Sonrası 3D Buket

Hediye açıldıktan sonra:

- Buket 3D görüntüleyicide gösterilmeli.
- Kullanıcı buketi 360 derece döndürebilmeli.
- Yakınlaştırıp uzaklaştırabilmeli.
- Çiçekleri ve ambalaj detaylarını inceleyebilmeli.
- Gönderen kişinin özel notunu okuyabilmeli.
- Buketi ortak anı koleksiyonuna ekleyebilmeli.

Açılmış buket daha sonra tekrar görüntülenebilmelidir.

### 5. Gizlilik ve Veri Yönetimi

Sürpriz buketlerin açılma durumu backend üzerinden yönetilmeli.

Önerilen durumlar:

- Pending: Gönderildi, henüz açılmadı.
- Opening: Açılış animasyonu devam ediyor.
- Opened: Buket tamamen açıldı.

Güvenlik gereksinimleri:

x- Alıcı açmadan önce buketin içeriğine ait veriler API üzerinden erişilebilir olmamalı.
- Yalnızca arayüzde gizlemek yeterli değildir.
- Backend, alıcının açılış durumunu doğrulamalı.
- Açılış tamamlanmadan buket verileri istemciye gönderilmemeli.
- Açılma durumu veritabanında kalıcı olarak tutulmalı.
- Aynı sürpriz birden fazla kez gönderilmiş gibi görünmemeli.
- Alıcı yalnızca kendisine gönderilen sürprizleri açabilmeli.

### 6. Animasyon ve Teknik Uygulama

Animasyonlar için CSS Transitions, Framer Motion ve gerektiğinde Three.js değerlendirilebilir.

Özellikle:

- Kurdele hareketleri fiziksel olarak doğal görünmeli.
- Kurdele düğümü basit bir opacity animasyonuyla kaybolmamalı; çözülme hareketi görsel olarak anlaşılmalı.
- Ambalaj açılma hareketi aşamalı olmalı.
- 3D buketin ortaya çıkışı sinematik ama abartısız olmalı.
- Mobil Safari ve iPhone cihazlarda akıcı çalışmalı.
- Kullanıcının animasyonları azaltma tercihi desteklenmeli.

Animasyonlar 60 FPS hedefiyle optimize edilmeli, ancak düşük performanslı cihazlarda da kullanılabilir olmalı.

### 7. Açılış Sonrası Anı

Buket açıldığında sistem otomatik olarak bir anı kaydı oluşturmalı.

Kaydedilecek bilgiler:

- Buketin sahibi/gönderen kişi.
- Alıcı.
- Buketin adı.
- Gönderilme tarihi.
- Açılma tarihi.
- Gönderenin özel mesajı.
- Buketin tasarım verileri.

Bu deneyimin temel amacı yalnızca dijital çiçek göndermek değil, karşı tarafa gerçekten hediye açıyormuş hissi yaşatmak olmalı.

**Temel deneyim:** Bir hediye paketi görür, ekrana dokunur, kurdeleyi aşama aşama çözer ve son dokunuşta kendisi için tasarlanmış gerçek 3D çiçek buketiyle karşılaşır.
