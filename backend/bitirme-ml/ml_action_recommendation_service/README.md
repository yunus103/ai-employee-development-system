# AI Action Recommendation API

Bu servis, bitirme projesinde seçilen final LightGBM v1 modelini FastAPI üzerinden API olarak sunar.

## 1. Gerekli model dosyaları

Aşağıdaki dosyaları `models/` klasörüne koymalısınız:

```text
models/
├── final_lightgbm_v1_model.pkl
├── final_lightgbm_v1_encoder.pkl
├── feature_columns.pkl
└── label_names.pkl
```

`final_lightgbm_v1_model.pkl` ve `final_lightgbm_v1_encoder.pkl` final test notebook'unda oluşur.

`feature_columns.pkl` ve `label_names.pkl` için final model notebook'unda şu kodu çalıştırın:

```python
import joblib

results_path = "/content/drive/MyDrive/Bitirme/final_test_results/"

joblib.dump(list(X_final_train.columns), results_path + "feature_columns.pkl")
joblib.dump(label_names, results_path + "label_names.pkl")
```

## 2. Lokal çalıştırma

```bash
pip install -r requirements.txt
uvicorn app:app --reload --host 0.0.0.0 --port 8001
```

Swagger:

```text
http://localhost:8001/docs
```

Health check:

```text
http://localhost:8001/health
```

## 3. Docker ile çalıştırma

```bash
docker compose up --build
```

## 4. Endpointler

### GET /health

Servisin ve model dosyalarının yüklenip yüklenmediğini kontrol eder.

### POST /predict-actions

Modelin `predict` çıktısına göre 1 olarak tahmin edilen aksiyonları döndürür.

### POST /predict-actions/top-k?k=13

Olasılığı en yüksek ilk `k` aksiyonu döndürür. Sizin sistem teorik olarak çalışan başına yaklaşık 13 aksiyon hedeflediği için demo tarafında bu endpoint kullanışlı olabilir.

## 5. ASP.NET Core entegrasyon notu

ASP.NET Core backend, bu servise HTTP POST isteği atarak önerilen aksiyon kodlarını alır. Sonra bu kodları kendi PostgreSQL veritabanındaki `action_catalog` tablosuyla eşleştirip kullanıcıya task listesi olarak gösterir.
