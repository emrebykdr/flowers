# OurBloom

Emre ile Gözde'ye ait küçük dijital bahçe. Çiçek Stüdyosu'nda buket tasarlanır, 3D olarak incelenir, isim, tarih ve notla kaydedilir. İki hesap aynı ortak alanı görür: birinin kaydettiği buket diğerinin koleksiyonunda da durur, ama düzenleme hakkı yalnızca sahibindedir.

## İçindekiler

| Bölüm | Ne yapar |
|---|---|
| Giriş | Yalnızca iki önceden tanımlı hesap. Kayıt ol / şifremi unuttum yok. |
| Ana sayfa | Karşılama, birlikte geçen gün sayacı, son buket, son anılar, kısa not alanı, stüdyoya kısayol. |
| Çiçek Stüdyosu | 12 çiçek türü, tür başına renk paleti ve gelişmiş renk seçici, dal sayısı, sap uzunluğu, boyut, eğim, yön, otomatik ya da elle konum. 7 buket şekli, yeşillik, 6 ambalaj, 3 sarım şekli, 4 bağ tipi, fiyonk. Geri al / yinele, yeni tasarım için cihazda taslak. |
| 3D görüntüleyici | 360° döndürme, sıkıştırarak/tekerlekle yakınlaştırma, çiçeğe dokunup seçme, "Yakından bak", gölgeler, kendi etrafında dönme. |
| Buketlerim | Kendi buketlerin ve eşinin buketleri ayrı sekmelerde. |
| Buket detayı | 3D inceleme, not, içerik özeti, düzenle (sahibi), kopyala ve düzenle (ikisi de), anı ekle, sil (sahibi). |
| Anılarımız | Bütün buketler ve fotoğraflı/yazılı anılar tek arşivde: aya göre gruplu, arama, sıralama, tür ve kişi filtresi. |
| Notlar | Birbirine kısa not bırakma, okundu bilgisi, okunmamış sayısı. Sohbet uygulaması değil. |
| Ayarlar | Görünen ad, ortak alan adı ve başlangıç tarihi, şifre değiştirme, çıkış. |

## Teknoloji

- **Arayüz:** React 19, TypeScript, Vite, Tailwind CSS 4, React Router, TanStack Query, Zustand
- **3D:** Three.js + React Three Fiber + drei. Bütün çiçekler, yapraklar, ambalaj ve kurdele kodla (prosedürel) üretilir; dışarıdan model, doku ya da HDR dosyası indirilmez.
- **Sunucu:** ASP.NET Core 10 (Minimal API), EF Core 10, PostgreSQL
- **Kimlik:** Çerez tabanlı oturum (HttpOnly, SameSite=Strict, üretimde Secure)
- **Görseller:** `IFileStorage` arkasında yerel disk (buket önizlemeleri, anı fotoğrafları). S3/Blob'a geçmek için yalnızca yeni bir uygulama yazmak yeterli.

```
mylove/
├─ backend/OurBloom.Api/     ASP.NET Core API (+ üretimde arayüzü de sunar)
│  ├─ Auth/                  oturum, şifre kuralları, yönetici komutları
│  ├─ Contracts/             DTO'lar, tasarım doğrulama
│  ├─ Data/                  EF Core modeli, migration'lar, seed
│  ├─ Endpoints/             auth, buket, anı, not, ana sayfa uçları
│  ├─ Infrastructure/        güvenlik başlıkları, CSRF kontrolü
│  └─ Storage/               dosya depolama
├─ frontend/                 React uygulaması
│  └─ src/three/             3D motoru: çiçek modelleri, yerleşim, ambalaj, sahne
├─ docker-compose.yml        PostgreSQL (+ isteğe bağlı uygulama imajı)
└─ Dockerfile                tek imaj: API + derlenmiş arayüz
```

## Geliştirme ortamında çalıştırma

Gerekenler: Node.js 22+, .NET 10 SDK, Docker.

```bash
# 1. Veritabanı
docker compose up -d db

# 2. API  (http://localhost:5162 — migration ve seed ilk açılışta kendiliğinden çalışır)
cd backend/OurBloom.Api
dotnet run

# 3. Arayüz  (http://localhost:5173 — /api istekleri API'ye aktarılır)
cd frontend
npm install
npm run dev
```

Giriş bilgileri:

| Kullanıcı adı | İlk şifre |
|---|---|
| `emre` | `eg2604` |
| `gozde` | `eg2604` |

İlk girişten sonra **Ayarlar → Şifre** bölümünden ikinizin de şifre değiştirmesi iyi olur. İlk şifre kaynak kodda açık metin olarak durmaz; `Data/SeedData.cs` içinde yalnızca PBKDF2 özeti var.

### iPhone'da denemek

Bilgisayarla iPhone aynı Wi-Fi'deyken:

```bash
cd frontend
npm run dev:host        # ekranda "Network: http://192.168.x.x:5173" adresini gösterir
```

Bu adresi Safari'de açman yeterli. Geliştirme modunda çerez `Secure` işaretli olmadığı için HTTP üzerinden giriş yapılabilir. Safari'de Paylaş → **Ana Ekrana Ekle** ile uygulama gibi tam ekran açılır.

## Sunucuya kurulum

Üretimde oturum çerezi yalnızca HTTPS üzerinden gönderilir; uygulamanın önünde TLS sonlandıran bir ters vekil (Caddy, Nginx) olmalı.

```bash
cp .env.example .env            # POSTGRES_PASSWORD'ü değiştir
docker compose --profile app up -d --build
```

Uygulama `127.0.0.1:8080` üzerinde açılır (dolu ise `.env` içinde `APP_PORT` değiştir). Caddy ile alan adı ve otomatik sertifika:

```
bahce.ornek.com {
    reverse_proxy 127.0.0.1:8080
}
```

Kalıcı veriler iki Docker volume'unda durur: `pgdata` (veritabanı) ve `appdata` (görseller ve oturum anahtarları). Yedeklerken ikisini de al.

Önemli ayarlar (ortam değişkeni olarak):

| Ayar | Varsayılan | Açıklama |
|---|---|---|
| `ConnectionStrings__Default` | — | PostgreSQL bağlantısı |
| `Storage__Root` | `App_Data` | Görsellerin ve anahtarların klasörü |
| `Seed__SampleContent` | `true` | İlk kurulumda birkaç örnek buket/anı/not ekler. Arayüzden silinebilir. |
| `ReverseProxy__Enabled` | `false` | Ters vekil arkasında `true` (gerçek istemci IP'si ve HTTPS bilgisi için) |
| `Auth__RequireSecureCookie` | üretimde `true` | HTTPS olmadan test etmek gerekirse geçici olarak `false` |

## Şifre unutulursa

Web arayüzünde "şifremi unuttum" yok. Sunucuya erişimi olan kişi şifreyi şu komutla sıfırlar (yeni şifre gizli olarak iki kez sorulur, açık oturumlar kapanır):

```bash
# geliştirme
cd backend/OurBloom.Api && dotnet run -- reset-password gozde

# docker
docker compose exec app dotnet OurBloom.Api.dll reset-password gozde
```

## Güvenlik

- Şifreler ASP.NET Core Identity'nin `PasswordHasher`'ı ile saklanır (PBKDF2-HMAC-SHA512, 100.000 tur, kullanıcıya özel tuz).
- Seed yalnızca **eksik** hesabı oluşturur; var olan hesabın şifresine dokunmaz. Değiştirilen şifre yeniden başlatmada geri dönmez.
- Şifre değişince kullanıcının güvenlik damgası yenilenir: diğer cihazlardaki oturumlar düşer, şifreyi değiştiren cihaz yeni çerezle devam eder. Her istekte damga veritabanıyla karşılaştırılır.
- Yeni şifre kuralları sunucuda denetlenir: en az 8 karakter, mevcut şifreyle aynı olamaz, kullanıcı adını içeremez, çok yaygın şifreler reddedilir.
- Giriş denemeleri IP başına 5 dakikada 8 ile, şifre değiştirme 10 dakikada 6 ile sınırlı.
- Durum değiştiren her API isteği `X-OurBloom` başlığı ister; SameSite=Strict çerezle birlikte CSRF'e karşı iki katman.
- Bütün sorgular oturumdaki ortak alan kimliğiyle süzülür; başka alanın verisi hiçbir uçtan dönmez. Düzenleme ve silme yalnızca sahibine açıktır (sunucuda 403).
- Yüklenen görsellerin türü dosyanın ilk baytlarından doğrulanır (JPEG/PNG/WebP), boyutu sınırlıdır; fotoğraflar telefonda küçültülüp yeniden kodlandığı için EXIF (konum vb.) sunucuya gitmez.
- Görseller yalnızca oturum açmış ortak alan üyelerine sunulur.
- Şifreler hiçbir yerde loglanmaz, tarayıcı depolamasına yazılmaz. Geliştirmede istek günlüğü yalnızca yöntem, yol ve durum kodunu yazar.
- Üretimde CSP, HSTS, `X-Frame-Options: DENY`, `nosniff` başlıkları açık.

## Veri modeli

`SharedSpace` (ortak alan, başlangıç tarihi) ← `User` (2 kişi) · `Bouquet` (isim, not, tarih, şekil, yeşillik, önizleme, sahibi) → `BouquetFlower` (tür, renk, adet, sap, boyut, eğim, yön, konum) ve `BouquetPackaging` (ambalaj, renk, sarım, kurdele, fiyonk) · `Memory` (başlık, metin, tarih, fotoğraf, isteğe bağlı buket) · `Message` (gönderen, alıcı, metin, okunma zamanı).

Buketin bütün ayarları ilişkisel tablolarda tutulur; kaydedilen her buket stüdyoda aynen yeniden açılır.

## Faydalı komutlar

```bash
# yeni migration
cd backend/OurBloom.Api && dotnet ef migrations add <Ad> -o Data/Migrations

# başlangıç şifresi için yeni özet üretmek (SeedData.cs'e yapıştırılır)
dotnet run -- hash-password

# arayüz tip kontrolü ve üretim derlemesi
cd frontend && npm run build

# uygulama simgelerini yeniden üretmek
cd frontend && node scripts/make-icons.mjs
```

Geliştirme modunda `http://localhost:5173/lab?thumbs=1` adresi 12 çiçeğin 3D modelini yan yana gösterir.
